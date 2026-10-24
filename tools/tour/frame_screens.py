"""Draws a phone around each raw screenshot of shots.mjs, for the README strip.

Usage: python3 -I frame_screens.py <shots out dir> <media dir>
Writes <media dir>/screen-<name>.png for every <name>.png found.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

# Final width, the same as the other apps' screens.
WIDTH = 540

# Bezel thickness and corner radii, outer then screen.
BEZEL = 14
OUTER_RADIUS = 62
SCREEN_RADIUS = 48

# The reader's umber ink, as the phone body.
BODY = (43, 37, 29)

# Corners are drawn this many times larger, then scaled down, for smooth edges.
SUPERSAMPLE = 4


def rounded_mask(width: int, height: int, radius: int) -> Image.Image:
    """An antialiased rounded rectangle, white on black."""
    big = Image.new("L", (width * SUPERSAMPLE, height * SUPERSAMPLE), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (0, 0, big.width - 1, big.height - 1), radius=radius * SUPERSAMPLE, fill=255
    )
    return big.resize((width, height), Image.LANCZOS)


def frame(shot: Image.Image) -> Image.Image:
    """The screenshot scaled into a phone body, transparent outside its corners."""
    screen_width = WIDTH - 2 * BEZEL
    screen_height = round(shot.height * screen_width / shot.width)
    height = screen_height + 2 * BEZEL
    screen = shot.convert("RGB").resize((screen_width, screen_height), Image.LANCZOS)
    phone = Image.new("RGBA", (WIDTH, height), (*BODY, 0))
    phone.paste(Image.new("RGBA", (WIDTH, height), (*BODY, 255)), (0, 0), rounded_mask(WIDTH, height, OUTER_RADIUS))
    phone.paste(screen, (BEZEL, BEZEL), rounded_mask(screen_width, screen_height, SCREEN_RADIUS))
    return phone


def main(shots_dir: Path, media_dir: Path) -> None:
    """Frames every raw screenshot into the media folder."""
    for shot in sorted(shots_dir.glob("*.png")):
        output = media_dir / f"screen-{shot.stem}.png"
        frame(Image.open(shot)).save(output, optimize=True)
        print(output)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
