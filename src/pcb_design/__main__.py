"""Allow ``python -m pcb_design`` to run the CLI."""

from pcb_design.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
