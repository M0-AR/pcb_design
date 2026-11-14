"""Print the pcbnew API surface used by the optional KiCad exporter.

Run this with the Python interpreter that ships with KiCad, for example:

    /usr/bin/python3 examples/kicad_api_probe.py
"""

from __future__ import annotations


def main() -> int:
    try:
        import pcbnew  # type: ignore[import-not-found]
    except Exception:
        print("pcbnew is not available. Install KiCad and use its bundled Python.")
        return 1

    print("SHAPE_ constants:")
    print([name for name in dir(pcbnew) if name.startswith("SHAPE_")])
    print("PAD_SHAPE_ constants:")
    print([name for name in dir(pcbnew) if name.startswith("PAD_SHAPE_")])
    print("BOARD methods:")
    print([name for name in dir(pcbnew.BOARD) if not name.startswith("_")])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
