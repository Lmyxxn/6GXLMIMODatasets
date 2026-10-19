"""Export a small, auditable V8 preview for the static ground-dataset page."""

import csv
import json
from pathlib import Path
from shutil import copy2


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
OUT = ROOT / "ground-assets"
OUT.mkdir(exist_ok=True)

summary_csv = PROJECT / "analysis" / "v8_temporal_horizon_summary.csv"
visibility_json = PROJECT / "analysis" / "v8_edge_los_visibility_summary.json"
recording_dir = PROJECT / "output" / "v8_web_recording_20261013"

fields = (
    "scenario", "horizon_ms", "trajectory_count", "change_db_median",
    "correlation_median", "shape_error_db_median",
)
rows = []
with summary_csv.open(newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["scenario"] not in {"stable_los", "stable_nlos", "edge_transition"}:
            continue
        rows.append({
            key: row[key] if key == "scenario" else
            int(row[key]) if key in {"horizon_ms", "trajectory_count"} else
            round(float(row[key]), 6)
            for key in fields
        })

visibility = json.loads(visibility_json.read_text(encoding="utf-8"))
edge = [
    {
        "horizon_ms": int(horizon),
        "center_los_fraction": value["center_los_fraction"],
        "physical_los_fraction_median": value["physical_los_fraction_median"],
    }
    for horizon, value in visibility["by_horizon"].items()
]
edge.sort(key=lambda row: row["horizon_ms"])

recording = json.loads((recording_dir / "recording.json").read_text(encoding="utf-8"))
frames = {}
for item in recording["frames"]:
    index = int(item["index"])
    if index not in frames:
        source = recording_dir / "frames" / item["file"]
        if source.is_file():
            target = f"edge_{index:02d}.jpg"
            copy2(source, OUT / target)
            frames[index] = {"horizon_ms": index * 10, "image": target}

source = PROJECT / "output" / "v8_web_recording_HD_6x4_20261013" / "layout_clip_6x4.jpg"
copy2(source, OUT / "layout_clip.jpg")

preview = {
    "dataset": "Ground-level XL-MIMO Dataset",
    "description": "Ground-level Sionna RT; compact static preview, not the full dataset",
    "array_antennas": 4096,
    "layouts": 7,
    "channel_samples": 22,
    "historical_samples": 10,
    "future_samples": 12,
    "sensing_interval_ms": 10,
    "analysis": rows,
    "edge_visibility": edge,
    "replay": {
        "trajectory": "L00_edge_v20_000",
        "scenario": "edge_transition",
        "speed_mps": 20,
        "frames": [frames[i] for i in sorted(frames)],
        "source": "Saved ground-level XL-MIMO dataset capture; these are real preview frames, not new RT solves",
    },
    "provenance": {
        "analysis": "analysis/v8_temporal_horizon_summary.csv",
        "visibility": "analysis/v8_edge_los_visibility_summary.json",
        "replay": "output/v8_web_recording_20261013/recording.json",
        "cohort_note": "Diagnostic curves summarize 797 trajectories per scenario; they are not results for all 4,780 trajectories.",
    },
}
(OUT / "preview.json").write_text(json.dumps(preview, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Exported {len(rows)} diagnostic rows and {len(frames)} replay frames to {OUT}")
