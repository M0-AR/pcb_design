"""Tests for the typed board specification and optional KiCad export."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pcb_design.board import (
    BoardError,
    BoardExportError,
    BoardSpec,
    Component,
    Connection,
    default_board,
    export_kicad,
)


def _pcbnew_available() -> bool:
    try:
        import pcbnew  # noqa: F401
    except Exception:
        return False
    return True


def test_default_board_is_valid_and_complete() -> None:
    board = default_board()
    summary = board.summary()
    assert summary["name"] == "MPU6050 + ESP32 sensor node"
    assert summary["components"] == 11
    assert summary["connections"] == 24
    assert summary["nets"] == 7
    assert summary["bom_total_usd"] == 9.96
    assert (summary["width_mm"], summary["height_mm"]) == (80.0, 50.0)


def test_bom_groups_identical_parts() -> None:
    rows = default_board().bom()
    assert len(rows) == 8
    resistors = next(row for row in rows if row["value"] == "4.7k")
    capacitors = next(row for row in rows if row["value"] == "0.1uF")
    assert resistors["quantity"] == 2
    assert resistors["line_total_usd"] == 0.02
    assert capacitors["quantity"] == 3
    assert capacitors["line_total_usd"] == 0.06


def test_json_roundtrip(tmp_path: Path) -> None:
    board = default_board()
    path = tmp_path / "board.json"
    board.to_json(path)
    loaded = BoardSpec.from_dict(json.loads(path.read_text(encoding="utf-8")))
    assert loaded.summary() == board.summary()
    assert loaded.components[0].pads == board.components[0].pads
    assert path.read_text(encoding="utf-8").endswith("\n")


def test_board_rejects_duplicate_references() -> None:
    board = default_board()
    board.components.append(board.components[0])
    with pytest.raises(BoardError, match="Duplicate component reference"):
        board.validate()


def test_board_rejects_out_of_bounds_components() -> None:
    board = default_board()
    board.components[0] = Component(
        **{**board.components[0].__dict__, "x_mm": 120.0}
    )
    with pytest.raises(BoardError, match="outside the board in X"):
        board.validate()


def test_board_rejects_unknown_connection_endpoint() -> None:
    board = default_board()
    board.connections.append(Connection("U9.VCC", "U1.VCC", "3V3"))
    with pytest.raises(BoardError, match="does not exist"):
        board.validate()


def test_board_rejects_malformed_endpoint() -> None:
    board = default_board()
    board.connections.append(Connection("U1", "U1.VCC", "3V3"))
    with pytest.raises(BoardError, match="must look like"):
        board.validate()


def test_board_rejects_duplicate_pads() -> None:
    board = default_board()
    board.components[0] = Component(
        **{**board.components[0].__dict__, "pads": ("VCC", "VCC")}
    )
    with pytest.raises(BoardError, match="duplicate pad names"):
        board.validate()


def test_board_rejects_invalid_dimensions() -> None:
    board = default_board()
    board.width_mm = 0
    with pytest.raises(BoardError, match="width and height"):
        board.validate()


def test_board_rejects_invalid_layers() -> None:
    board = default_board()
    board.layers = 0
    with pytest.raises(BoardError, match="at least one copper layer"):
        board.validate()


@pytest.mark.skipif(_pcbnew_available(), reason="pcbnew is installed")
def test_export_without_kicad_raises_clear_error(tmp_path: Path) -> None:
    with pytest.raises(BoardExportError, match="pcbnew"):
        export_kicad(default_board(), tmp_path / "board.kicad_pcb")


@pytest.mark.skipif(not _pcbnew_available(), reason="pcbnew is not installed")
def test_export_with_kicad_writes_file(tmp_path: Path) -> None:
    path = export_kicad(default_board(), tmp_path / "board.kicad_pcb")
    assert path.exists()
    assert path.read_text(encoding="utf-8").startswith("(kicad_pcb")
