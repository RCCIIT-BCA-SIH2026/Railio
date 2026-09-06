import xml.etree.ElementTree as ET
tree = ET.parse('/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/hero-section.svg')
root = tree.getroot()
paths = root.findall('{http://www.w3.org/2000/svg}path')
print("Total paths:", len(paths))
# Find paths that are very large (likely background)
for p in paths[:10]:
    d = p.get('d', '')
    fill = p.get('fill', '')
    print(f"Path size: {len(d)}, fill: {fill}")
