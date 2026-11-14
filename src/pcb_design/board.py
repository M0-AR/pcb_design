"""Typed PCB board specifications and optional KiCad export.

The module separates *what* a board contains (a validated, JSON-serialisable
:class:`BoardSpec`) from *how* it is written to an EDA file. The specification
layer has no third-party dependencies and is fully testable. The KiCad exporter
is loaded lazily so the rest of the toolkit works on machines without KiCad.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


class BoardError(ValueError):
    """Raised when a board specification is internally inconsistent."""


class BoardExportError(RuntimeError):
    """Raised when a board cannot be exported to KiCad."""


@dataclass(frozen=True)
class Component:
    """A placed part with named pads.

    Positions are the component centre in millimetres, measured from the
    bottom-left corner of the board. Footprints are simplified reference
    footprints; check the real package and pad numbering against the datasheet
    before fabrication.
    """

    reference: str
    value: str
    footprint: str
    x_mm: float
    y_mm: float
    pads: tuple[str, ...]
    role: str = ""
    unit_cost_usd: float = 0.0


@dataclass(frozen=True)
class Connection:
    """A single copper connection between two named pads."""

    start: str
    end: str
    net: str
    width_mm: float = 0.25


@dataclass
class BoardSpec:
    """A complete, validated description of a two-dimensional PCB.

    Examples
    --------
    >>> board = default_board()
    >>> board.width_mm
    80.0
    >>> round(board.bom_total(), 2) > 0
    True
    """

    name: str
    width_mm: float
    height_mm: float
    thickness_mm: float
    components: list[Component]
    connections: list[Connection]
    layers: int = 2
    notes: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.validate()

    def validate(self) -> None:
        """Validate dimensions, references, pads, and connection endpoints."""
        if self.width_mm <= 0 or self.height_mm <= 0:
            raise BoardError("Board width and height must be positive.")
        if self.thickness_mm <= 0:
            raise BoardError("Board thickness must be positive.")
        if self.layers < 1:
            raise BoardError("A board needs at least one copper layer.")
        if not self.components:
            raise BoardError("A board needs at least one component.")

        references: set[str] = set()
        endpoints: set[tuple[str, str]] = set()
        for component in self.components:
            if component.reference in references:
                raise BoardError(f"Duplicate component reference: {component.reference}")
            references.add(component.reference)
            if not component.pads:
                raise BoardError(f"{component.reference} has no pads.")
            if len(set(component.pads)) != len(component.pads):
                raise BoardError(f"{component.reference} has duplicate pad names.")
            if not (0 <= component.x_mm <= self.width_mm):
                raise BoardError(
                    f"{component.reference} is outside the board in X "
                    f"({component.x_mm} mm, board is {self.width_mm} mm)."
                )
            if not (0 <= component.y_mm <= self.height_mm):
                raise BoardError(
                    f"{component.reference} is outside the board in Y "
                    f"({component.y_mm} mm, board is {self.height_mm} mm)."
                )
            for pad in component.pads:
                endpoints.add((component.reference, pad))

        for connection in self.connections:
            if connection.width_mm <= 0:
                raise BoardError(f"Connection {connection.net} has a non-positive width.")
            for endpoint in (connection.start, connection.end):
                reference, separator, pad = endpoint.partition(".")
                if not separator or not pad:
                    raise BoardError(
                        f"Connection endpoint {endpoint!r} must look like 'U1.VCC'."
                    )
                if (reference, pad) not in endpoints:
                    raise BoardError(f"Connection endpoint {endpoint!r} does not exist.")

    def component(self, reference: str) -> Component:
        """Return a component by reference."""
        for component in self.components:
            if component.reference == reference:
                return component
        raise BoardError(f"Unknown component reference: {reference}")

    def bom(self) -> list[dict[str, Any]]:
        """Aggregate the bill of materials by value and footprint."""
        rows: dict[tuple[str, str], dict[str, Any]] = {}
        for component in self.components:
            key = (component.value, component.footprint)
            row = rows.setdefault(
                key,
                {
                    "value": component.value,
                    "footprint": component.footprint,
                    "quantity": 0,
                    "unit_cost_usd": component.unit_cost_usd,
                    "line_total_usd": 0.0,
                },
            )
            row["quantity"] += 1
            row["line_total_usd"] = round(row["quantity"] * row["unit_cost_usd"], 2)
        return sorted(rows.values(), key=lambda row: (-row["line_total_usd"], row["value"]))

    def bom_total(self) -> float:
        """Return the illustrative BOM total in US dollars."""
        return round(sum(row["line_total_usd"] for row in self.bom()), 2)

    def summary(self) -> dict[str, Any]:
        """Return a compact, JSON-friendly summary of the board."""
        return {
            "name": self.name,
            "width_mm": self.width_mm,
            "height_mm": self.height_mm,
            "thickness_mm": self.thickness_mm,
            "layers": self.layers,
            "components": len(self.components),
            "connections": len(self.connections),
            "nets": len({connection.net for connection in self.connections}),
            "bom_total_usd": self.bom_total(),
        }

    def to_dict(self) -> dict[str, Any]:
        """Return the full specification as a plain dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BoardSpec:
        """Build a specification from a dictionary produced by :meth:`to_dict`."""
        components = [
            Component(**{**item, "pads": tuple(item["pads"])})
            for item in data.get("components", [])
        ]
        connections = [Connection(**item) for item in data.get("connections", [])]
        return cls(
            name=data["name"],
            width_mm=float(data["width_mm"]),
            height_mm=float(data["height_mm"]),
            thickness_mm=float(data["thickness_mm"]),
            components=components,
            connections=connections,
            layers=int(data.get("layers", 2)),
            notes=data.get("notes", ""),
            metadata=dict(data.get("metadata", {})),
        )

    def to_json(self, path: str | Path | None = None) -> str:
        """Serialise the board; optionally write it to ``path``."""
        text = json.dumps(self.to_dict(), indent=2, sort_keys=False)
        if path is not None:
            destination = Path(path)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(text + "\n", encoding="utf-8")
        return text


def default_board() -> BoardSpec:
    """Return the reference MPU6050 + ESP32 sensor-node board.

    The board is intentionally small and readable: a 3.3 V regulator, an
    inertial sensor on I2C, a Bluetooth module on UART, an ESP32 module, and
    the usual decoupling and pull-up parts.
    """
    components = [
        Component(
            "U1",
            "MPU6050",
            "QFN-24 (simplified)",
            32.0,
            12.0,
            ("VCC", "GND", "SDA", "SCL"),
            role="6-axis motion sensor",
            unit_cost_usd=1.40,
        ),
        Component(
            "U2",
            "HC-05",
            "Module header 1x06 (simplified)",
            32.0,
            38.0,
            ("VCC", "GND", "RX", "TX"),
            role="Bluetooth serial module",
            unit_cost_usd=4.20,
        ),
        Component(
            "U3",
            "ESP32-WROOM-32",
            "Module (simplified)",
            58.0,
            25.0,
            ("3V3", "GND", "GPIO21", "GPIO22", "GPIO16", "GPIO17"),
            role="Wi-Fi/Bluetooth microcontroller",
            unit_cost_usd=3.80,
        ),
        Component(
            "U4",
            "AMS1117-3.3",
            "SOT-223 (simplified)",
            12.0,
            12.0,
            ("VIN", "GND", "VOUT"),
            role="3.3 V linear regulator",
            unit_cost_usd=0.28,
        ),
        Component(
            "C1",
            "10uF",
            "0805 (simplified)",
            6.0,
            20.0,
            ("1", "2"),
            role="regulator input bulk capacitor",
            unit_cost_usd=0.08,
        ),
        Component(
            "C2",
            "22uF",
            "0805 (simplified)",
            18.0,
            20.0,
            ("1", "2"),
            role="regulator output bulk capacitor",
            unit_cost_usd=0.12,
        ),
        Component(
            "R1",
            "4.7k",
            "0402 (simplified)",
            26.0,
            20.0,
            ("1", "2"),
            role="I2C SDA pull-up",
            unit_cost_usd=0.01,
        ),
        Component(
            "R2",
            "4.7k",
            "0402 (simplified)",
            26.0,
            26.0,
            ("1", "2"),
            role="I2C SCL pull-up",
            unit_cost_usd=0.01,
        ),
        Component(
            "C3",
            "0.1uF",
            "0402 (simplified)",
            38.0,
            18.0,
            ("1", "2"),
            role="MPU6050 local decoupling",
            unit_cost_usd=0.02,
        ),
        Component(
            "C4",
            "0.1uF",
            "0402 (simplified)",
            38.0,
            34.0,
            ("1", "2"),
            role="HC-05 local decoupling",
            unit_cost_usd=0.02,
        ),
        Component(
            "C5",
            "0.1uF",
            "0402 (simplified)",
            50.0,
            32.0,
            ("1", "2"),
            role="ESP32 local decoupling",
            unit_cost_usd=0.02,
        ),
    ]

    connections = [
        Connection("U4.VOUT", "U3.3V3", "3V3"),
        Connection("U4.VOUT", "U1.VCC", "3V3"),
        Connection("U4.VOUT", "U2.VCC", "3V3"),
        Connection("U4.GND", "U3.GND", "GND"),
        Connection("U4.GND", "U1.GND", "GND"),
        Connection("U4.GND", "U2.GND", "GND"),
        Connection("U1.SDA", "U3.GPIO21", "I2C_SDA"),
        Connection("U1.SCL", "U3.GPIO22", "I2C_SCL"),
        Connection("U1.SDA", "R1.1", "I2C_SDA"),
        Connection("U1.SCL", "R2.1", "I2C_SCL"),
        Connection("R1.2", "U4.VOUT", "3V3"),
        Connection("R2.2", "U4.VOUT", "3V3"),
        Connection("U2.RX", "U3.GPIO16", "UART2_RX"),
        Connection("U2.TX", "U3.GPIO17", "UART2_TX"),
        Connection("C3.1", "U1.VCC", "3V3"),
        Connection("C3.2", "U1.GND", "GND"),
        Connection("C4.1", "U2.VCC", "3V3"),
        Connection("C4.2", "U2.GND", "GND"),
        Connection("C5.1", "U3.3V3", "3V3"),
        Connection("C5.2", "U3.GND", "GND"),
        Connection("C1.1", "U4.VIN", "VIN"),
        Connection("C1.2", "U4.GND", "GND"),
        Connection("C2.1", "U4.VOUT", "3V3"),
        Connection("C2.2", "U4.GND", "GND"),
    ]

    return BoardSpec(
        name="MPU6050 + ESP32 sensor node",
        width_mm=80.0,
        height_mm=50.0,
        thickness_mm=1.6,
        components=components,
        connections=connections,
        layers=2,
        notes=(
            "Reference geometry for automation and teaching. Footprints are simplified; "
            "verify packages, pad numbering, clearances, and current capacity before fabrication."
        ),
    )


def _point(pcbnew: Any, x_mm: float, y_mm: float) -> Any:
    values = (int(round(x_mm * 1_000_000)), int(round(y_mm * 1_000_000)))
    for factory in ("VECTOR2I", "wxPoint"):
        constructor = getattr(pcbnew, factory, None)
        if constructor is None:
            continue
        try:
            return constructor(*values)
        except TypeError:
            continue
    raise BoardExportError("This KiCad version exposes no usable 2D point constructor.")


def _size(pcbnew: Any, width_mm: float, height_mm: float) -> Any:
    values = (int(round(width_mm * 1_000_000)), int(round(height_mm * 1_000_000)))
    for factory in ("VECTOR2I", "wxSize"):
        constructor = getattr(pcbnew, factory, None)
        if constructor is None:
            continue
        try:
            return constructor(*values)
        except TypeError:
            continue
    raise BoardExportError("This KiCad version exposes no usable 2D size constructor.")


def export_kicad(spec: BoardSpec, path: str | Path = "board.kicad_pcb") -> Path:
    """Write ``spec`` as a ``.kicad_pcb`` file.

    KiCad's ``pcbnew`` Python module ships with KiCad rather than PyPI. When it
    is unavailable this function raises :class:`BoardExportError` with a clear
    next step; use ``pcb-design demo`` for a KiCad-free deliverable.

    The exporter creates simplified rectangular pads and straight tracks. It is
    a reference implementation, not a DRC-clean fabrication output.
    """
    try:
        import pcbnew  # type: ignore[import-not-found]
    except Exception as exc:  # pragma: no cover - depends on the host install
        raise BoardExportError(
            "KiCad's pcbnew module was not found. Install KiCad 8 or newer and run "
            "this command with the Python interpreter that ships with KiCad. "
            "For a KiCad-free package, run: pcb-design demo --out-dir demo-output"
        ) from exc

    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)

    try:
        board = pcbnew.BOARD()
        board.GetDesignSettings().SetBoardThickness(int(spec.thickness_mm * 1_000_000))

        pad_positions: dict[tuple[str, str], Any] = {}
        for component in spec.components:
            footprint = pcbnew.FOOTPRINT(board)
            footprint.SetReference(component.reference)
            footprint.SetValue(component.value)
            footprint.SetPosition(_point(pcbnew, component.x_mm, component.y_mm))
            board.Add(footprint)

            spacing = 2.54
            offset = (len(component.pads) - 1) * spacing / 2
            for pad_index, pad_name in enumerate(component.pads):
                pad = pcbnew.PAD(footprint)
                pad.SetName(pad_name)
                pad.SetNumber(str(pad_index + 1))
                pad.SetShape(pcbnew.PAD_SHAPE_RECT)
                pad.SetAttribute(pcbnew.PAD_ATTRIB_SMD)
                pad.SetSize(_size(pcbnew, 1.4, 1.4))
                pad_x = component.x_mm + pad_index * spacing - offset
                pad_y = component.y_mm + 1.6
                pad.SetPosition(_point(pcbnew, pad_x, pad_y))
                if hasattr(pad, "SMDMask"):
                    pad.SetLayerSet(pad.SMDMask())
                footprint.Add(pad)
                pad_positions[(component.reference, pad_name)] = pad.GetPosition()

        for connection in spec.connections:
            start = pad_positions.get(_split_endpoint(connection.start))
            end = pad_positions.get(_split_endpoint(connection.end))
            if start is None or end is None:
                raise BoardExportError(
                    f"Could not resolve pads for {connection.start} -> {connection.end}."
                )
            track = pcbnew.PCB_TRACK(board)
            track.SetStart(start)
            track.SetEnd(end)
            track.SetWidth(int(connection.width_mm * 1_000_000))
            track.SetLayer(pcbnew.F_Cu)
            board.Add(track)

        outline = pcbnew.PCB_SHAPE(board)
        outline.SetShape(pcbnew.SHAPE_T_RECT)
        outline.SetStart(_point(pcbnew, 0.0, 0.0))
        outline.SetEnd(_point(pcbnew, spec.width_mm, spec.height_mm))
        outline.SetLayer(pcbnew.Edge_Cuts)
        outline.SetWidth(int(0.1 * 1_000_000))
        board.Add(outline)

        pcbnew.SaveBoard(str(destination), board)
    except BoardExportError:
        raise
    except Exception as exc:  # pragma: no cover - depends on the KiCad version
        raise BoardExportError(f"KiCad export failed: {exc}") from exc

    return destination


def _split_endpoint(endpoint: str) -> tuple[str, str]:
    reference, _, pad = endpoint.partition(".")
    return reference, pad
