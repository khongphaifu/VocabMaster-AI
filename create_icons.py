#!/usr/bin/env python3
"""Create VocabMaster icon PNGs using built-in libraries only (no Pillow needed)."""
import struct
import zlib

def create_png(size, bg_color, letter_color):
    """Create a simple icon PNG with 📚 emoji as base colors."""
    # bg_color: (r, g, b) background (Catppuccin Mocha purple)
    # letter_color: (r, g, b) letter color
    
    w = h = size
    img_data = []
    
    for y in range(h):
        row = []
        for x in range(w):
            nx = (x - w/2) / (w/2)  # normalized -1..1
            ny = (y - h/2) / (h/2)

            # Rounded rect background
            radius = 0.65
            corner_r = 0.25
            # Simple rounded square: Chebyshev-rounded
            mx = abs(nx) - (radius - corner_r)
            my = abs(ny) - (radius - corner_r)
            dist = (max(mx, 0)**2 + max(my, 0)**2) ** 0.5 - corner_r if mx > 0 or my > 0 else -corner_r

            if dist > 0:
                # Outside — transparent
                row += [0, 0, 0, 0]
            else:
                # Book shape: two vertical lines in center area
                bx = abs(nx)
                in_book = abs(ny) < 0.38 and bx < 0.38
                center_line = abs(nx) < 0.04 and abs(ny) < 0.42
                page_lines = abs(ny) < 0.35 and abs(bx - 0.2) < 0.02

                if center_line or page_lines:
                    row += [letter_color[0], letter_color[1], letter_color[2], 255]
                elif in_book:
                    # Book cover color
                    lc = [min(255, int(c * 1.15)) for c in bg_color]
                    row += [lc[0], lc[1], lc[2], 255]
                else:
                    row += [bg_color[0], bg_color[1], bg_color[2], 255]
        img_data.append(bytes([0] + row))  # filter byte

    raw = zlib.compress(b''.join(img_data), 9)

    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    return (
        b'\x89PNG\r\n\x1a\n' +
        chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) +
        chunk(b'IDAT', raw) +
        chunk(b'IEND', b'')
    )

# Catppuccin Mocha purple: #cba6f7 as bg, white letters
bg = (30, 30, 46)       # #1e1e2e base
accent = (203, 166, 247) # #cba6f7 purple

for size in [16, 48, 128]:
    data = create_png(size, accent, bg)
    path = f"icons/icon-{size}.png"
    with open(path, 'wb') as f:
        f.write(data)
    print(f"Created {path} ({len(data)} bytes)")

print("All icons created!")
