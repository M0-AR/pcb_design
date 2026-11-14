"""Build the complete demo bundle with one Python call."""

from pcb_design.report import build_demo

if __name__ == "__main__":
    manifest = build_demo("examples/output")
    print(f"Wrote {len(manifest['files'])} files to {manifest['output_dir']}")
    for row in manifest["scenarios"]:
        detection = row["detection"]
        print(
            f"{row['scenario']['fault']:5s} -> {detection['fault']:5s} "
            f"phase={detection['phase'] or '-':1s} severity={detection['severity']:.3f}"
        )
