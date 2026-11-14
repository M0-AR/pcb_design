"""Tests for Markdown, Excel, and demo-bundle reporting."""

from __future__ import annotations

from pathlib import Path

from openpyxl import load_workbook

from pcb_design.analytics import analyze_faults
from pcb_design.report import build_demo, write_excel, write_markdown


def test_demo_bundle_contains_every_expected_file(tmp_path: Path) -> None:
    manifest = build_demo(tmp_path)
    expected = {"board_spec.json", "bom.csv", "fault_analysis.xlsx", "report.md", "summary.json"}
    assert expected <= {path.name for path in tmp_path.iterdir()}
    assert set(manifest["files"]) == expected
    assert manifest["board"]["components"] == 11
    assert len(manifest["scenarios"]) == 3


def test_markdown_report_is_self_contained(tmp_path: Path) -> None:
    build_demo(tmp_path)
    text = (tmp_path / "report.md").read_text(encoding="utf-8")
    assert "# PCB Design Studio - engineering report" in text
    assert "MPU6050 + ESP32 sensor node" in text
    assert "Open phase conductor" in text
    assert "| U1 |" not in text
    assert "MPU6050 | QFN-24" in text
    assert "not a substitute" in text


def test_excel_workbook_has_data_and_reference_sheets(tmp_path: Path) -> None:
    build_demo(tmp_path)
    workbook = load_workbook(tmp_path / "fault_analysis.xlsx", read_only=True)
    assert {"sim_none", "sim_open", "sim_short", "summary", "reference"} <= set(
        workbook.sheetnames
    )
    summary = workbook["summary"]
    assert summary.max_row == 4
    workbook.close()


def test_single_fault_export(tmp_path: Path) -> None:
    analysis = analyze_faults(fault="open", fault_phase="B")
    excel_path = write_excel([analysis], tmp_path / "one.xlsx")
    report_path = write_markdown([analysis], tmp_path / "one.md")
    assert excel_path.exists()
    text = report_path.read_text(encoding="utf-8")
    assert "Scenario: open on phase B" in text
    assert "| open | B | open | B |" in text
