#!/usr/bin/env python3
"""Create VocabMaster icon PNGs using built-in libraries only (no Pillow needed)."""
import os
import struct
import zlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def create_png(size, bg_color, letter_color, full_bleed=False):
    """Create icon PNG with book emblem."""
    w = h = size
    img_data = bytearray()

    for y in range(h):
        img_data.append(0)  # filter byte
        ny = (y - h / 2) / (h / 2)
        abs_ny = abs(ny)
        for x in range(w):
            nx = (x - w / 2) / (w / 2)

            if full_bleed:
                outside = False
            else:
                radius = 0.85
                corner_r = 0.25
                mx = abs(nx) - (radius - corner_r)
                my = abs_ny - (radius - corner_r)
                dist = (max(mx, 0) ** 2 + max(my, 0) ** 2) ** 0.5 - corner_r if mx > 0 or my > 0 else -corner_r
                outside = dist > 0

            if outside:
                img_data.extend((0, 0, 0, 0))
            else:
                bx = abs(nx)
                in_book = abs_ny < 0.36 and bx < 0.38
                center_line = abs(nx) < 0.035 and abs_ny < 0.40
                page_lines = abs_ny < 0.32 and abs(bx - 0.19) < 0.022

                if center_line or page_lines:
                    img_data.extend((letter_color[0], letter_color[1], letter_color[2], 255))
                elif in_book:
                    lc = (min(255, int(bg_color[0] * 1.15)), min(255, int(bg_color[1] * 1.15)), min(255, int(bg_color[2] * 1.15)))
                    img_data.extend((lc[0], lc[1], lc[2], 255))
                else:
                    # Subtle top-left gradient for large iPad Home Screen icon
                    grad = 1.0 + (0.08 * (-nx - ny) if full_bleed else 0.0)
                    r = max(0, min(255, int(bg_color[0] * grad)))
                    g = max(0, min(255, int(bg_color[1] * grad)))
                    b = max(0, min(255, int(bg_color[2] * grad)))
                    img_data.extend((r, g, b, 255))

    raw = zlib.compress(bytes(img_data), 9)

    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    return (
        b'\x89PNG\r\n\x1a\n' +
        chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) +
        chunk(b'IDAT', raw) +
        chunk(b'IEND', b'')
    )

bg = (30, 30, 46)        # #1e1e2e Catppuccin dark
accent = (203, 166, 247) # #cba6f7 lavender purple

icons_dir = os.path.join(BASE_DIR, "icons")
os.makedirs(icons_dir, exist_ok=True)

for size in [16, 48, 128, 180, 192, 512]:
    # Apple Home Screen (180) and PWA splash (192, 512) look crisper full-bleed
    data = create_png(size, accent, bg, full_bleed=(size >= 180))
    path = os.path.join(icons_dir, f"icon-{size}.png")
    with open(path, 'wb') as f:
        f.write(data)
    print(f"Created {path} ({len(data)} bytes)")

print("All icons created!")
