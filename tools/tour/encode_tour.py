"""Encodes the frames of record.mjs into the animated WebP of the README.

Usage: python3 -I encode_tour.py <record out dir> <tour.webp>
"""

import json
import sys
from pathlib import Path

from PIL import Image

# About 15 frames per second: smooth enough for a UI, light enough for a README.
FRAME_MS = 66

# Lossy but sharp on flat UI colours, around 2 MB for 40 seconds.
QUALITY = 72


def main(record_dir: Path, output: Path) -> None:
    """Keeps one frame per FRAME_MS of real time, each shown for as long as the time it covers."""
    timings = json.loads((record_dir / "timings.json").read_text())
    files = sorted((record_dir / "frames").glob("*.png"))
    frames, durations, elapsed = [], [], 0
    for file, duration in zip(files, timings):
        if not frames or elapsed >= FRAME_MS:
            frames.append(Image.open(file).convert("RGB"))
            durations.append(0)
            elapsed = 0
        durations[-1] += duration
        elapsed += duration
    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        quality=QUALITY,
        method=4,
    )
    print(f"{output}: {len(frames)} frames, {sum(durations) / 1000:.1f} s")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
