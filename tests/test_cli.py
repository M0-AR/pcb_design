"""Tests for the command-line interface."""

from __future__ import annotations

import json
from pathlib import Path

from pcb_design.cli import main


def _pcbnew_available() -> bool:
    try:
        import pcbnew  # noqa: F401
    except Exception:
        return False
    return True


def test_spec_prints_json(capsys) -> None:
    assert main(["spec"]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["name"] == "MPU6050 + ESP32 sensor node"
    assert len(payload["components"]) == 11


def test_spec_writes_file(tmp_path: Path, capsys) -> None:
    path = tmp_path / "board.json"
    assert main(["spec", "--output", str(path)]) == 0
    assert path.exists()
    assert "Wrote" in capsys.readouterr().out


def test_analyze_prints_summary(capsys) -> None:
    assert main(["analyze", "--fault", "open", "--phase", "B"]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["scenario"]["fault"] == "open"
    assert payload["detection"]["fault"] == "open"
    assert payload["detection"]["phase"] == "B"


def test_analyze_writes_artifacts(tmp_path: Path, capsys) -> None:
    excel = tmp_path / "analysis.xlsx"
    report = tmp_path / "report.md"
    summary = tmp_path / "summary.json"
    code = main(
        [
            "analyze",
            "--fault",
            "short",
            "--output",
            str(excel),
            "--report",
            str(report),
            "--json",
            str(summary),
        ]
    )
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert len(payload["written"]) == 3
    assert excel.exists() and report.exists() and summary.exists()


def test_demo_writes_bundle(tmp_path: Path, capsys) -> None:
    assert main(["demo", "--out-dir", str(tmp_path / "demo")]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["board"]["components"] == 11
    assert (tmp_path / "demo" / "report.md").exists()


def test_doctor_json(capsys) -> None:
    assert main(["doctor", "--json"]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["status"] == "ok"
    assert payload["numpy"] == "ok"
    assert "kicad_bridge" in payload


def test_board_command_reports_missing_kicad(tmp_path: Path, capsys) -> None:
    if _pcbnew_available():
        assert main(["board", "--output", str(tmp_path / "board.kicad_pcb")]) == 0
        assert (tmp_path / "board.kicad_pcb").exists()
    else:
        assert main(["board", "--output", str(tmp_path / "board.kicad_pcb")]) == 2
        assert "pcbnew" in capsys.readouterr().err
