import xml.etree.ElementTree as ET
import re

tree = ET.parse('/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/hero-section.svg')
root = tree.getroot()
paths = root.findall('{http://www.w3.org/2000/svg}path')

# We know from VTracer that the background is usually the largest path or paths that touch the corners.
# But it's easier to just remove any paths that are close to white or very large off-white.
def is_light(hex_color):
    if not hex_color.startswith('#'): return False
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        # if r, g, b are all > 230, it's very light (almost white)
        return r > 230 and g > 230 and b > 230
    return False

removed = 0
for p in paths:
    fill = p.get('fill', '')
    if is_light(fill):
        root.remove(p)
        removed += 1

print(f"Removed {removed} light/white paths.")
tree.write('/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/RailSathi/mobile/assets/hero-section-clean.svg')
