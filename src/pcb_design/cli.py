"""Command-line interface for PCB Design Studio."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any

from pcb_design import __version__
from pcb_design.analytics import FAULT_TYPES, PHASES, analyze_faults
from pcb_design.board import BoardError, BoardExportError, default_board, export_kicad
from pcb_design.report import build_demo, write_excel, write_markdown, write_summary_json


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pcb-design",
        description=(
            "Generate a reference PCB, study three-phase voltage faults, and produce "
            "reports without needing KiCad installed."
        ),
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    subparsers = parser.add_subparsers(dest="command", required=True)

    spec_parser = subparsers.add_parser("spec", help="Print or write the reference board JSON.")
    spec_parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Write the specification to this path instead of printing it.",
    )

    board_parser = subparsers.add_parser(
        "board", help="Export the reference board to KiCad (.kicad_pcb)."
    )
    board_parser.add_argument(
        "--output",
        type=Path,
        default=Path("board.kicad_pcb"),
        help="Destination file (default: board.kicad_pcb).",
    )

    analyze_parser = subparsers.add_parser(
        "analyze", help="Simulate a three-phase fault and report statistics."
    )
    analyze_parser.add_argument("--fault", choices=FAULT_TYPES, default="short")
    analyze_parser.add_argument("--phase", choices=PHASES, default="A")
    analyze_parser.add_argument("--duration", type=float, default=0.1)
    analyze_parser.add_argument("--sample-rate", type=int, default=10_000)
    analyze_parser.add_argument("--line-frequency", type=float, default=50.0)
    analyze_parser.add_argument("--peak-voltage", type=float, default=311.0)
    analyze_parser.add_argument("--fault-start", type=float, default=0.04)
    analyze_parser.add_argument("--seed", type=int, default=7)
    analyze_parser.add_argument("--output", type=Path, default=None, help="Excel workbook path.")
    analyze_parser.add_argument("--report", type=Path, default=None, help="Markdown report path.")
    analyze_parser.add_argument("--json", type=Path, default=None, help="JSON summary path.")

    demo_parser = subparsers.add_parser(
        "demo", help="Build the complete demo bundle (spec, BOM, Excel, report, JSON)."
    )
    demo_parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("demo-output"),
        help="Output directory (default: demo-output).",
    )

    doctor_parser = subparsers.add_parser(
        "doctor", help="Check the Python environment and optional KiCad bridge."
    )
    doctor_parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")

    return parser


def _run_spec(args: argparse.Namespace) -> int:
    board = default_board()
    if args.output is None:
        print(board.to_json())
    else:
        board.to_json(args.output)
        print(f"Wrote {args.output}")
    return 0


def _run_board(args: argparse.Namespace) -> int:
    path = export_kicad(default_board(), args.output)
    print(f"Wrote {path}")
    print("Open it in KiCad and run a full DRC/DFM review before fabrication.")
    return 0


def _run_analyze(args: argparse.Namespace) -> int:
    analysis = analyze_faults(
        fault=args.fault,
        fault_phase=args.phase,
        duration_s=args.duration,
        sample_rate_hz=args.sample_rate,
        line_frequency_hz=args.line_frequency,
        peak_voltage_v=args.peak_voltage,
        fault_start_s=args.fault_start,
        seed=args.seed,
    )
    written: list[str] = []
    if args.output is not None:
        written.append(str(write_excel([analysis], args.output)))
    if args.report is not None:
        written.append(str(write_markdown([analysis], args.report)))
    if args.json is not None:
        written.append(str(write_summary_json(analysis.summary(), args.json)))

    if written:
        print(json.dumps({"written": written, "summary": analysis.summary()}, indent=2))
    else:
        print(json.dumps(analysis.summary(), indent=2))
    return 0


def _run_demo(args: argparse.Namespace) -> int:
    manifest = build_demo(args.out_dir)
    print(json.dumps(manifest, indent=2))
    return 0


def _check_module(name: str) -> str:
    return "ok" if importlib.util.find_spec(name) is not None else "missing"


def _run_doctor(as_json: bool) -> int:
    checks: dict[str, Any] = {
        "python": sys.version.split()[0],
        "numpy": _check_module("numpy"),
        "pandas": _check_module("pandas"),
        "openpyxl": _check_module("openpyxl"),
        "pcbnew": _check_module("pcbnew"),
        "version": __version__,
    }
    core_missing = [
        name for name in ("numpy", "pandas", "openpyxl") if checks[name] != "ok"
    ]
    checks["status"] = "ok" if not core_missing else "missing-core-dependencies"
    checks["kicad_bridge"] = (
        "available" if checks["pcbnew"] == "ok" else "optional module not installed"
    )
    if as_json:
        print(json.dumps(checks, indent=2))
    else:
        for name in ("python", "numpy", "pandas", "openpyxl", "pcbnew", "version"):
            print(f"{name:10s} {checks[name]}")
        if checks["pcbnew"] != "ok":
            print(
                "note       The KiCad exporter needs the pcbnew module shipped with KiCad. "
                "Everything else, including the demo, works without it."
            )
    return 0 if not core_missing else 1


def main(argv: list[str] | None = None) -> int:
    """Run the CLI and return a process exit code."""
    parser = _parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "spec":
            return _run_spec(args)
        if args.command == "board":
            return _run_board(args)
        if args.command == "analyze":
            return _run_analyze(args)
        if args.command == "demo":
            return _run_demo(args)
        if args.command == "doctor":
            return _run_doctor(args.json)
    except (BoardError, BoardExportError, ValueError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    parser.error("unknown command")
    return 2
