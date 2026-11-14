"""Human-readable and spreadsheet reports for boards and fault studies."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from pcb_design.analytics import FaultAnalysis, analyze_faults
from pcb_design.board import BoardSpec, default_board


def write_excel(analyses: list[FaultAnalysis], path: str | Path) -> Path:
    """Write every simulated waveform plus summaries and references to Excel."""
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(destination, engine="openpyxl") as writer:
        summary_rows: list[dict[str, Any]] = []
        for analysis in analyses:
            scenario_name = f"sim_{analysis.scenario['fault']}"
            analysis.frame.to_excel(writer, sheet_name=scenario_name, index=False)
            detection = analysis.detection
            row: dict[str, Any] = {
                "scenario": analysis.scenario["fault"],
                "fault_phase": analysis.scenario["fault_phase"],
                "detected": detection["fault"],
                "detected_phase": detection["phase"],
                "rms_ratio": detection["rms_ratio"],
                "severity": detection["severity"],
                "confidence": detection["confidence"],
            }
            for phase, stats in analysis.statistics["phases"].items():
                row[f"rms_{phase}_v"] = stats["rms_v"]
                row[f"thd_{phase}_pct"] = stats["thd_pct"]
            summary_rows.append(row)
        pd.DataFrame(summary_rows).to_excel(writer, sheet_name="summary", index=False)
        pd.DataFrame(analyses[0].reference).to_excel(writer, sheet_name="reference", index=False)
    return destination


def write_markdown(
    analyses: list[FaultAnalysis],
    path: str | Path,
    board: BoardSpec | None = None,
) -> Path:
    """Write a self-contained Markdown report for the demo scenarios."""
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = ["# PCB Design Studio - engineering report", ""]
    lines.append(
        "This report is generated from a transparent teaching model. It is suitable for "
        "screening, documentation, and classroom discussion; it is not a substitute for a "
        "protection study or a fabrication-ready DRC/DFM review."
    )
    lines.append("")

    if board is not None:
        summary = board.summary()
        lines.extend(
            [
                "## Board summary",
                "",
                f"- **Name:** {summary['name']}",
                f"- **Size:** {summary['width_mm']} x {summary['height_mm']} mm",
                f"- **Thickness:** {summary['thickness_mm']} mm",
                f"- **Copper layers:** {summary['layers']}",
                f"- **Components:** {summary['components']}",
                f"- **Connections:** {summary['connections']}",
                f"- **Nets:** {summary['nets']}",
                f"- **Illustrative BOM:** ${summary['bom_total_usd']:.2f}",
                "",
                "## Bill of materials",
                "",
                "| Value | Footprint | Qty | Unit (USD) | Line total (USD) |",
                "| --- | --- | ---: | ---: | ---: |",
            ]
        )
        for row in board.bom():
            lines.append(
                f"| {row['value']} | {row['footprint']} | {row['quantity']} | "
                f"{row['unit_cost_usd']:.2f} | {row['line_total_usd']:.2f} |"
            )
        lines.append("")

    lines.extend(
        [
            "## Fault scenarios",
            "",
            "| Scenario | Fault phase | Detected | Phase | RMS ratio | Severity | Heuristic confidence |",
            "| --- | --- | --- | --- | ---: | ---: | ---: |",
        ]
    )
    for analysis in analyses:
        detection = analysis.detection
        lines.append(
            f"| {analysis.scenario['fault']} | {analysis.scenario['fault_phase']} | "
            f"{detection['fault']} | {detection['phase'] or '-'} | "
            f"{detection['rms_ratio']:.3f} | {detection['severity']:.3f} | "
            f"{detection['confidence']:.2f} |"
        )
    lines.append("")

    for analysis in analyses:
        lines.extend(
            [
                f"### Scenario: {analysis.scenario['fault']} on phase "
                f"{analysis.scenario['fault_phase']}",
                "",
                "| Phase | RMS (V) | Peak (V) | Mean (V) | THD (%) |",
                "| --- | ---: | ---: | ---: | ---: |",
            ]
        )
        for phase, stats in analysis.statistics["phases"].items():
            lines.append(
                f"| {phase} | {stats['rms_v']:.3f} | {stats['peak_v']:.3f} | "
                f"{stats['mean_v']:.3f} | {stats['thd_pct']:.3f} |"
            )
        lines.append("")

    lines.extend(
        [
            "## Field reference",
            "",
            "| Fault | Signature | Likely causes | First checks | Risk |",
            "| --- | --- | --- | --- | --- |",
        ]
    )
    for row in analyses[0].reference:
        lines.append(
            f"| {row['fault']} | {row['signature']} | {row['likely_causes']} | "
            f"{row['first_checks']} | {row['risk']} |"
        )
    lines.extend(
        [
            "",
            "## How to read the numbers",
            "",
            "- **RMS ratio** compares the weakest measurement window in each phase against "
            "the nominal phase RMS.",
            "- Full-window statistics include the pre-fault segment; the detector deliberately "
            "uses the weakest short window so a late fault is not diluted.",
            "- **Open** faults keep a partial voltage; **short** faults collapse much further.",
            "- **THD** is the harmonic energy from the 2nd to the 10th harmonic relative to "
            "the fundamental, measured on the simulated window.",
            "- Confidence is a heuristic derived from the RMS ratio; validate against real "
            "relay, meter, or power-quality recorder data before acting.",
            "",
        ]
    )
    destination.write_text("\n".join(lines), encoding="utf-8")
    return destination


def write_summary_json(payload: dict[str, Any], path: str | Path) -> Path:
    """Write a JSON payload with stable formatting."""
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return destination


def build_demo(out_dir: str | Path = "demo-output") -> dict[str, Any]:
    """Generate the complete KiCad-free demo bundle and return its manifest."""
    destination = Path(out_dir)
    destination.mkdir(parents=True, exist_ok=True)
    board = default_board()
    analyses = [
        analyze_faults(fault="none"),
        analyze_faults(fault="open", fault_phase="A"),
        analyze_faults(fault="short", fault_phase="B"),
    ]

    spec_path = destination / "board_spec.json"
    board.to_json(spec_path)

    bom_path = destination / "bom.csv"
    pd.DataFrame(board.bom()).to_csv(bom_path, index=False)

    excel_path = write_excel(analyses, destination / "fault_analysis.xlsx")
    report_path = write_markdown(analyses, destination / "report.md", board=board)

    manifest = {
        "board": board.summary(),
        "scenarios": [analysis.summary() for analysis in analyses],
        "files": [
            spec_path.name,
            bom_path.name,
            excel_path.name,
            report_path.name,
            "summary.json",
        ],
        "note": (
            "Generated without KiCad. The .kicad_pcb export is optional and requires the "
            "pcbnew Python module that ships with KiCad."
        ),
    }
    write_summary_json(manifest, destination / "summary.json")
    manifest["output_dir"] = str(destination)
    return manifest
