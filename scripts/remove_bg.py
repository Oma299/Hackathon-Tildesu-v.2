from PIL import Image
from collections import deque
import sys

src = "public/tildesu-drop.png"
dst = "public/tildesu-drop.png"

img = Image.open(src).convert("RGBA")
w, h = img.size
px = img.load()

def is_bg(r, g, b):
    # near-white / light gray background
    return r > 235 and g > 235 and b > 235

# Flood fill from all border pixels so we only remove the outer background,
# not white highlights inside the character.
visited = [[False] * w for _ in range(h)]
q = deque()

for x in range(w):
    for y in (0, h - 1):
        q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        q.append((x, y))

while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= w or y >= h:
        continue
    if visited[y][x]:
        continue
    visited[y][x] = True
    r, g, b, a = px[x, y]
    if not is_bg(r, g, b):
        continue
    px[x, y] = (r, g, b, 0)
    q.append((x + 1, y))
    q.append((x - 1, y))
    q.append((x, y + 1))
    q.append((x, y - 1))

img.save(dst)
print("done", img.size)
