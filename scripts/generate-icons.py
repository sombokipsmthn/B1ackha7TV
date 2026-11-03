#!/usr/bin/env python3
"""Generate a sub-setted Material Symbols Outlined font for the TV launcher.

Usage:
  python scripts/generate-icons.py [--out app/assets/fonts]

Output:
  MaterialSymbolsOutlined-subset.woff2 (~20 KB)
  MaterialSymbolsOutlined-subset.ttf   (~20 KB)
"""
import argparse
import urllib.request
import re
import os
import sys

FONTTOOLS_OK = True
try:
    import fontTools
    from fontTools.subset import Subsetter, Options
    from fontTools.ttLib import TTFont
    # Check fontTools version
    if fontTools.__version__ < "4.50":
        sys.exit("fonttools 4.50+ required. Install: pip3 install --upgrade fonttools")
except Exception:
    FONTTOOLS_OK = False

# Glyphs we need for TV launcher UI
ICON_NAMES = [
    # Sidebar / navigation
    "home", "search", "grid_2x2", "sports", "settings", "tv",
    "arrow_back", "arrow_forward", "check", "close", "delete",
    "refresh", "edit", "done", "add", "remove",
    # App type indicators
    "movie", "videogame_asset", "music_note", "book", "library_books",
    "history", "person", "lock", "info", "warning",
    "power_settings_new", "image", "palette", "wifi", "input",
    "list", "label", "radio", "news", "verified",
    "library_add", "playlist_add", "repeat", "repeat_one", "pause",
    "pause_circle", "play_circle", "play_arrow", "queue_music",
    "library_music", "picture_in_picture", "credit_card", "open_in_new",
    "open_in_browser", "markunread_mailbox", "note_add", "send_money",
    "forum", "receipt", "redeem", "mobile_info", "invert_colors",
    "open_with", "pageview", "perm_camera_mic", "perm_contact_calendar",
    "perm_data_setting", "perm_media", "perm_phone_msg", "perm_scan_wifi",
    "polymer", "print", "hourglass_empty", "hourglass_full", "loyalty",
    "code", "build", "recent_actors", "block", "verified",
    "apps", "arrow_downward", "arrow_drop_down", "arrow_drop_up",
    "arrow_left", "arrow_right", "arrow_upward", "expand_more", "expand_less",
    "visibility", "visibility_off", "download", "upload", "share", "link",
    "keyboard_arrow_down", "keyboard_arrow_up",
    "schedule", "calendar_today", "star", "star_border", "badge",
    "sentiment_dissatisfied", "help", "error_outline",
    # Media controls
    "skip_next", "skip_previous", "replay_30", "forward_30",
    "subtitles", "closed_caption",
    # System / utility
    "system_update", "battery_full", "signal_cellular_4_bar",
    "settings_remote", "accessibility", "view_list", "view_module",
    "build", "terminal", "memory", "touch_app", "mouse",
]


def download_font(dest: str):
    """Download the single-weight Material Symbols Outlined TTF from Google Fonts."""
    try:
        css = urllib.request.urlopen(
            "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:"
            "opsz,wght,FILL,GRAD@20..48,400,0..1,-50..200&display=swap",
            timeout=30,
        ).read().decode()
    except Exception as e:
        sys.exit(f"Failed to fetch Google Fonts CSS: {e}")
    match = re.search(r'url\((https://fonts\.gstatic\.com/s/materialsymbolsoutlined/[^)]+\.ttf)\)', css)
    if not match:
        sys.exit("Could not find TTF URL in Google Fonts CSS")
    url = match.group(1)
    print(f"Downloading {url}")
    try:
        data = urllib.request.urlopen(url, timeout=60).read()
    except Exception as e:
        sys.exit(f"Failed to download font file: {e}")
    with open(dest, "wb") as f:
        f.write(data)
    print(f"Downloaded {len(data):,} bytes -> {dest}")


def subset(font_path: str, out_path: str, fmt: str):
    """Sub-set a TTF to only the requested glyphs and save as WOFF2 or TTF."""
    if not FONTTOOLS_OK:
        sys.exit("fonttools is required. Install with: pip3 install fonttools")
    font = TTFont(font_path)
    opts = Options()
    opts.layout_features = ["ss01"]  # Material Symbols uses ss01 for glyph variants
    opts.name_IDs = ["*"]
    opts.name_legacy = True
    opts.notdef_outline = True
    opts.recalc_bounds = True
    subsetter = Subsetter(opts)
    subsetter.populate(glyphs=ICON_NAMES)
    subsetter.subset(font)
    # Remove GSUB table to reduce size
    if "GSUB" in font:
        del font["GSUB"]
    font.save(out_path)
    size = os.path.getsize(out_path)
    print(f"Wrote {fmt.upper()}: {out_path} ({size:,} bytes, {font['maxp'].numGlyphs} glyphs)")
    return size


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="app/assets/fonts", help="Output directory")
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)
    tmp_ttf = os.path.join(args.out, "_msobase.ttf")
    try:
        download_font(tmp_ttf)
        subset(tmp_ttf, os.path.join(args.out, "MaterialSymbolsOutlined-subset.woff2"), "woff2")
        subset(tmp_ttf, os.path.join(args.out, "MaterialSymbolsOutlined-subset.ttf"), "ttf")
    finally:
        if os.path.exists(tmp_ttf):
            os.remove(tmp_ttf)


if __name__ == "__main__":
    main()
