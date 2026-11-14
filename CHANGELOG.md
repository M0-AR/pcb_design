# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-14

### Added

- Typed, validated board specifications with a reference 11-component
  MPU6050 + ESP32 sensor-node board, bill of materials, and JSON round-tripping.
- Optional KiCad `.kicad_pcb` export through the `pcbnew` Python bridge, with a
  clear error path when KiCad is not installed.
- Three-phase voltage simulation for nominal, open-phase, and short-circuit
  scenarios, including RMS, peak, mean, and harmonic statistics.
- Windowed RMS fault detection with severity and heuristic confidence.
- Excel, Markdown, CSV, and JSON reporting plus a one-command demo bundle.
- `pcb-design` command line interface with `spec`, `board`, `analyze`, `demo`,
  and `doctor` subcommands.
- Interactive 3D studio, guided game, concept library, quiz, business model,
  and research notes published with GitHub Pages.
- Continuous integration for tests, linting, package builds, a headless
  browser smoke test, and Pages deployment.
- Tag-driven release workflow that builds, checks, and attaches the source and
  wheel distributions to the GitHub release.
