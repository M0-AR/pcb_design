"""PCB Design Studio: board generation, power-fault analytics, and reports."""

from __future__ import annotations

__version__ = "1.0.0"

from pcb_design.analytics import (  # noqa: E402
    FaultAnalysis,
    analyze_faults,
    detect_fault,
    fault_reference_table,
    simulate_three_phase,
    waveform_statistics,
)
from pcb_design.board import (  # noqa: E402
    BoardError,
    BoardExportError,
    BoardSpec,
    Component,
    Connection,
    default_board,
    export_kicad,
)

__all__ = [
    "BoardError",
    "BoardExportError",
    "BoardSpec",
    "Component",
    "Connection",
    "FaultAnalysis",
    "__version__",
    "analyze_faults",
    "default_board",
    "detect_fault",
    "export_kicad",
    "fault_reference_table",
    "simulate_three_phase",
    "waveform_statistics",
]
