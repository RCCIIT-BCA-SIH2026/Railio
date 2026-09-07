import re
import base64
import os

svg_file = "/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/train -logo.svg"
with open(svg_file, "r") as f:
    content = f.read()

match = re.search(r'href="data:image/png;base64,([^"]+)"', content)
if match:
    base64_data = match.group(1)
    png_data = base64.b64decode(base64_data)
    
    assets_dir = "/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/RailIo/mobile/assets"
    
    with open(os.path.join(assets_dir, "logo.png"), "wb") as out:
        out.write(png_data)
    
    with open(os.path.join(assets_dir, "icon.png"), "wb") as out:
        out.write(png_data)
        
    with open(os.path.join(assets_dir, "splash-icon.png"), "wb") as out:
        out.write(png_data)
        
    with open(os.path.join(assets_dir, "adaptive-icon.png"), "wb") as out:
        out.write(png_data)
        
    print("Successfully extracted and saved PNGs.")
else:
    print("Could not find base64 PNG data in the SVG.")
