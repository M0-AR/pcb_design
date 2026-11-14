"""Three-phase power-quality simulation and fault analytics.

The model is deliberately transparent: a balanced three-phase sine wave is
generated, a fault is applied after a configurable instant, and the result is
summarised with RMS, peak, harmonic, and heuristic fault-detection metrics.
It is a teaching and screening aid, not a relay-protection study.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

SAMPLE_RATE_HZ = 10_000
LINE_FREQUENCY_HZ = 50.0
PHASE_VOLTAGE_PEAK_V = 311.0
NOMINAL_RMS_V = PHASE_VOLTAGE_PEAK_V / np.sqrt(2.0)
PHASES = ("A", "B", "C")
FAULT_TYPES = ("none", "open", "short")
PHASE_COLUMNS = {phase: f"phase_{phase.lower()}_v" for phase in PHASES}


@dataclass(frozen=True)
class FaultAnalysis:
    """Simulation output plus its statistics, detection, and reference rows."""

    frame: pd.DataFrame
    scenario: dict[str, Any]
    statistics: dict[str, Any]
    detection: dict[str, Any]
    reference: list[dict[str, str]]

    def summary(self) -> dict[str, Any]:
        """Return a compact, JSON-friendly view of the analysis."""
        return {
            "scenario": self.scenario,
            "statistics": self.statistics,
            "detection": self.detection,
            "samples": int(len(self.frame)),
        }


def simulate_three_phase(
    duration_s: float = 0.1,
    sample_rate_hz: int = SAMPLE_RATE_HZ,
    line_frequency_hz: float = LINE_FREQUENCY_HZ,
    peak_voltage_v: float = PHASE_VOLTAGE_PEAK_V,
    fault: str = "none",
    fault_phase: str = "A",
    fault_start_s: float = 0.04,
    seed: int = 7,
) -> pd.DataFrame:
    """Simulate a balanced three-phase voltage waveform with an optional fault.

    Parameters
    ----------
    duration_s:
        Simulated window in seconds.
    sample_rate_hz:
        Samples per second. The default gives 1,000 samples over 0.1 s.
    line_frequency_hz:
        Fundamental frequency.
    peak_voltage_v:
        Phase-to-neutral peak voltage.
    fault:
        One of ``"none"``, ``"open"``, or ``"short"``.
    fault_phase:
        Phase affected by the fault (``"A"``, ``"B"``, or ``"C"``).
    fault_start_s:
        Instant at which the fault begins.
    seed:
        Seed for the reproducible measurement-noise generator.
    """
    if duration_s <= 0:
        raise ValueError("duration_s must be positive.")
    if sample_rate_hz <= 0:
        raise ValueError("sample_rate_hz must be positive.")
    if line_frequency_hz <= 0:
        raise ValueError("line_frequency_hz must be positive.")
    if peak_voltage_v <= 0:
        raise ValueError("peak_voltage_v must be positive.")
    if fault not in FAULT_TYPES:
        raise ValueError(f"fault must be one of {FAULT_TYPES}, got {fault!r}.")
    if fault_phase not in PHASES:
        raise ValueError(f"fault_phase must be one of {PHASES}, got {fault_phase!r}.")
    if not 0 <= fault_start_s <= duration_s:
        raise ValueError("fault_start_s must fall inside the simulated window.")
    if sample_rate_hz < line_frequency_hz * 20:
        raise ValueError("sample_rate_hz must be at least 20x line_frequency_hz.")

    time = np.arange(0.0, duration_s, 1.0 / sample_rate_hz)
    phase_offsets = np.array([0.0, -2.0 * np.pi / 3.0, 2.0 * np.pi / 3.0])
    waveform = peak_voltage_v * np.sin(
        2.0 * np.pi * line_frequency_hz * time[:, None] + phase_offsets[None, :]
    )

    if fault != "none":
        active = time >= fault_start_s
        fault_index = PHASES.index(fault_phase)
        elapsed = np.maximum(time - fault_start_s, 0.0)
        if fault == "open":
            waveform[active, fault_index] *= 0.35
        else:
            decay = 0.08 + 0.27 * np.exp(-120.0 * elapsed[active])
            waveform[active, fault_index] *= decay
            for other in range(len(PHASES)):
                if other != fault_index:
                    waveform[active, other] *= 1.12

    rng = np.random.default_rng(seed)
    waveform += rng.normal(0.0, peak_voltage_v * 0.002, size=waveform.shape)

    frame = pd.DataFrame({"time_s": time})
    for index, phase in enumerate(PHASES):
        frame[PHASE_COLUMNS[phase]] = waveform[:, index]
    return frame


def _thd(values: np.ndarray, sample_rate_hz: float, line_frequency_hz: float) -> float:
    if values.size < 32:
        return 0.0
    windowed = values * np.hanning(values.size)
    spectrum = np.abs(np.fft.rfft(windowed)) ** 2
    frequencies = np.fft.rfftfreq(values.size, d=1.0 / sample_rate_hz)
    fundamental_index = int(np.argmin(np.abs(frequencies - line_frequency_hz)))
    fundamental = spectrum[fundamental_index]
    if fundamental <= 0:
        return 0.0
    harmonic_mask = (frequencies >= line_frequency_hz * 2) & (
        frequencies <= line_frequency_hz * 10
    )
    return float(np.sqrt(spectrum[harmonic_mask].sum() / fundamental))


def waveform_statistics(
    frame: pd.DataFrame,
    sample_rate_hz: float = SAMPLE_RATE_HZ,
    line_frequency_hz: float = LINE_FREQUENCY_HZ,
) -> dict[str, Any]:
    """Compute per-phase RMS, peak, range, and total harmonic distortion."""
    phases: dict[str, dict[str, float]] = {}
    for phase, column in PHASE_COLUMNS.items():
        if column not in frame:
            continue
        values = frame[column].to_numpy(dtype=float)
        phases[phase] = {
            "rms_v": round(float(np.sqrt(np.mean(values**2))), 3),
            "peak_v": round(float(np.max(np.abs(values))), 3),
            "mean_v": round(float(np.mean(values)), 3),
            "min_v": round(float(np.min(values)), 3),
            "max_v": round(float(np.max(values)), 3),
            "thd_pct": round(_thd(values, sample_rate_hz, line_frequency_hz) * 100.0, 3),
        }
    return {
        "sample_rate_hz": sample_rate_hz,
        "line_frequency_hz": line_frequency_hz,
        "samples": int(len(frame)),
        "phases": phases,
    }


def _minimum_window_ratio(
    values: np.ndarray, nominal_rms: float, windows: int = 10
) -> float:
    segments = np.array_split(values, windows)
    ratios = [
        float(np.sqrt(np.mean(segment**2)) / nominal_rms)
        for segment in segments
        if segment.size
    ]
    return min(ratios) if ratios else float("inf")


def detect_fault(
    frame: pd.DataFrame,
    nominal_peak_v: float = PHASE_VOLTAGE_PEAK_V,
    windows: int = 10,
) -> dict[str, Any]:
    """Classify the most likely fault from windowed RMS voltage ratios.

    Each phase is split into equal windows and the weakest window is compared
    against the nominal phase RMS. This catches a fault that starts late in the
    captured record. The confidence value is a transparent heuristic, not a
    calibrated probability.
    """
    if nominal_peak_v <= 0:
        raise ValueError("nominal_peak_v must be positive.")
    if windows < 2:
        raise ValueError("windows must be at least 2.")
    nominal_rms = nominal_peak_v / np.sqrt(2.0)
    ratios: dict[str, float] = {}
    for phase, column in PHASE_COLUMNS.items():
        if column not in frame:
            continue
        values = frame[column].to_numpy(dtype=float)
        ratios[phase] = round(
            _minimum_window_ratio(values, nominal_rms, windows), 4
        )
    if not ratios:
        raise ValueError("frame contains no phase voltage columns.")

    weakest_phase = min(ratios, key=ratios.get)
    weakest_ratio = ratios[weakest_phase]
    if weakest_ratio < 0.20:
        fault = "short"
        confidence = 0.95 if weakest_ratio < 0.12 else 0.75
    elif weakest_ratio < 0.80:
        fault = "open"
        confidence = 0.90
    else:
        fault = "none"
        confidence = 0.95 if weakest_ratio >= 0.95 else 0.60

    return {
        "fault": fault,
        "phase": weakest_phase if fault != "none" else None,
        "rms_ratio": weakest_ratio,
        "rms_ratios": ratios,
        "severity": round(max(0.0, 1.0 - weakest_ratio), 3),
        "confidence": confidence,
        "method": "minimum windowed RMS ratio against nominal phase voltage",
    }


def fault_reference_table() -> list[dict[str, str]]:
    """Return a concise field reference for common three-phase disturbances."""
    return [
        {
            "fault": "Open phase conductor",
            "signature": "One phase RMS collapses; the other phases may stay near nominal.",
            "likely_causes": "Broken conductor, open fuse, loose terminal, failed contactor pole.",
            "first_checks": "Continuity and fuse test; torque terminals; inspect cable damage.",
            "risk": "Motor single-phasing, overheating, torque pulsation.",
        },
        {
            "fault": "Phase-to-phase short",
            "signature": "Two phases collapse together with a fast decaying transient.",
            "likely_causes": "Insulation breakdown, contamination, damaged cable, miswiring.",
            "first_checks": "Isolate supply; insulation resistance test; inspect busbars and joints.",
            "risk": "High fault current, arc flash, equipment damage.",
        },
        {
            "fault": "Phase-to-ground short",
            "signature": "One phase collapses while earth current rises sharply.",
            "likely_causes": "Moisture ingress, insulation failure, damaged winding or cable.",
            "first_checks": "Earth-leakage and insulation tests; inspect enclosures and glands.",
            "risk": "Electric shock, protective-device operation, fire.",
        },
        {
            "fault": "Voltage sag",
            "signature": "All phases dip together for a few cycles to seconds.",
            "likely_causes": "Motor starting, remote fault, transformer energisation, weak supply.",
            "first_checks": "Correlate with load switching; log supply voltage; check upstream faults.",
            "risk": "Relay chatter, controller resets, nuisance trips.",
        },
        {
            "fault": "Harmonic distortion",
            "signature": "Raised THD with near-nominal fundamental RMS.",
            "likely_causes": "Variable-speed drives, rectifiers, LED supplies, saturated magnetics.",
            "first_checks": "Harmonic survey; check filters, neutral current, capacitor banks.",
            "risk": "Transformer heating, neutral overload, capacitor failure.",
        },
        {
            "fault": "Neutral conductor failure",
            "signature": "Phase voltages become unequal while phase currents look normal.",
            "likely_causes": "Loose neutral link, corroded terminal, broken PEN/neutral conductor.",
            "first_checks": "Neutral continuity under load; inspect distribution board links.",
            "risk": "Overvoltage on one phase, undervoltage on another, equipment damage.",
        },
    ]


def analyze_faults(
    fault: str = "short",
    fault_phase: str = "A",
    duration_s: float = 0.1,
    sample_rate_hz: int = SAMPLE_RATE_HZ,
    line_frequency_hz: float = LINE_FREQUENCY_HZ,
    peak_voltage_v: float = PHASE_VOLTAGE_PEAK_V,
    fault_start_s: float = 0.04,
    seed: int = 7,
) -> FaultAnalysis:
    """Run the simulation, statistics, detection, and reference pipeline."""
    frame = simulate_three_phase(
        duration_s=duration_s,
        sample_rate_hz=sample_rate_hz,
        line_frequency_hz=line_frequency_hz,
        peak_voltage_v=peak_voltage_v,
        fault=fault,
        fault_phase=fault_phase,
        fault_start_s=fault_start_s,
        seed=seed,
    )
    scenario = {
        "fault": fault,
        "fault_phase": fault_phase,
        "duration_s": duration_s,
        "sample_rate_hz": sample_rate_hz,
        "line_frequency_hz": line_frequency_hz,
        "peak_voltage_v": peak_voltage_v,
        "fault_start_s": fault_start_s,
        "seed": seed,
    }
    return FaultAnalysis(
        frame=frame,
        scenario=scenario,
        statistics=waveform_statistics(frame, sample_rate_hz, line_frequency_hz),
        detection=detect_fault(frame, peak_voltage_v),
        reference=fault_reference_table(),
    )
