"""Tests for three-phase simulation, statistics, detection, and references."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from pcb_design.analytics import (
    FAULT_TYPES,
    PHASES,
    analyze_faults,
    detect_fault,
    fault_reference_table,
    simulate_three_phase,
    waveform_statistics,
)


def test_simulation_shape_and_columns() -> None:
    frame = simulate_three_phase(duration_s=0.1, sample_rate_hz=10_000)
    assert len(frame) == 1_000
    assert list(frame.columns) == ["time_s", "phase_a_v", "phase_b_v", "phase_c_v"]
    assert (frame["time_s"] < 0.1).all()


def test_simulation_is_reproducible() -> None:
    first = simulate_three_phase(fault="open", fault_phase="C")
    second = simulate_three_phase(fault="open", fault_phase="C")
    pd.testing.assert_frame_equal(first, second)


def test_nominal_statistics_are_near_rated_values() -> None:
    stats = waveform_statistics(simulate_three_phase())
    assert stats["samples"] == 1_000
    assert set(stats["phases"]) == set(PHASES)
    for phase in PHASES:
        assert stats["phases"][phase]["rms_v"] == pytest.approx(220.0, abs=2.0)
        assert stats["phases"][phase]["peak_v"] == pytest.approx(311.0, abs=3.0)
        assert stats["phases"][phase]["thd_pct"] < 5.0


@pytest.mark.parametrize(
    ("fault", "phase", "expected"),
    [("none", "A", "none"), ("open", "A", "open"), ("short", "B", "short")],
)
def test_detector_classifies_scenarios(fault: str, phase: str, expected: str) -> None:
    analysis = analyze_faults(fault=fault, fault_phase=phase)
    assert analysis.detection["fault"] == expected
    if expected == "none":
        assert analysis.detection["phase"] is None
        assert analysis.detection["rms_ratio"] == pytest.approx(1.0, abs=0.03)
    else:
        assert analysis.detection["phase"] == phase
        assert analysis.detection["severity"] > 0.5


def test_short_fault_is_more_severe_than_open_fault() -> None:
    open_analysis = analyze_faults(fault="open", fault_phase="A")
    short_analysis = analyze_faults(fault="short", fault_phase="A")
    assert short_analysis.detection["severity"] > open_analysis.detection["severity"]
    assert short_analysis.detection["rms_ratio"] < 0.15
    assert 0.3 < open_analysis.detection["rms_ratio"] < 0.45


def test_late_fault_is_still_detected() -> None:
    analysis = analyze_faults(fault="short", fault_phase="C", fault_start_s=0.085)
    assert analysis.detection["fault"] == "short"
    assert analysis.detection["phase"] == "C"


@pytest.mark.parametrize(
    ("kwargs", "message"),
    [
        ({"fault": "arc"}, "fault must be one of"),
        ({"fault_phase": "D"}, "fault_phase must be one of"),
        ({"duration_s": 0}, "duration_s"),
        ({"sample_rate_hz": 0}, "sample_rate_hz"),
        ({"line_frequency_hz": 0}, "line_frequency_hz"),
        ({"peak_voltage_v": 0}, "peak_voltage_v"),
        ({"fault": "open", "fault_start_s": 5.0}, "fault_start_s"),
        ({"sample_rate_hz": 100}, "at least 20x"),
    ],
)
def test_simulation_rejects_invalid_parameters(
    kwargs: dict[str, object], message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        simulate_three_phase(**kwargs)


def test_detector_rejects_input_without_phase_columns() -> None:
    with pytest.raises(ValueError, match="no phase voltage columns"):
        detect_fault(pd.DataFrame({"time_s": [0.0, 0.1]}))


def test_detector_rejects_weak_window_count() -> None:
    with pytest.raises(ValueError, match="windows"):
        detect_fault(simulate_three_phase(), windows=1)


def test_reference_table_is_complete() -> None:
    table = fault_reference_table()
    assert len(table) == 6
    expected = {"fault", "signature", "likely_causes", "first_checks", "risk"}
    assert all(set(row) == expected for row in table)
    assert {row["fault"] for row in table} >= {"Open phase conductor", "Voltage sag"}


def test_fault_types_constant_is_stable() -> None:
    assert FAULT_TYPES == ("none", "open", "short")
    assert np.isclose(analyze_faults(fault="none").statistics["line_frequency_hz"], 50.0)
