import xml.etree.ElementTree as ET
import base64
import os
import subprocess

def process_image():
    svg_file = "/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/RailSathi/mobile/assets/railio-ai.svg"
    out_png = "/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/RailSathi/mobile/assets/railio-ai-extracted.png"
    final_png = "/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/RailSathi/mobile/assets/railio-ai-nobg.png"
    
    print("Parsing SVG to extract base64 image...")
    try:
        tree = ET.parse(svg_file)
        root = tree.getroot()
        # Find image tag
        for elem in root.iter():
            if 'image' in elem.tag:
                href = elem.attrib.get('href') or elem.attrib.get('{http://www.w3.org/1999/xlink}href')
                if href and href.startswith('data:image/png;base64,'):
                    base64_data = href.split('base64,')[1]
                    with open(out_png, 'wb') as f:
                        f.write(base64.b64decode(base64_data))
                    print(f"Extracted PNG saved to {out_png}")
                    break
    except Exception as e:
        print("Failed to parse SVG:", e)
        return

    if not os.path.exists(out_png):
        print("No image extracted.")
        return

    print("Attempting to remove white background using PIL...")
    try:
        from PIL import Image
        img = Image.open(out_png).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            # Check if pixel is close to white
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0)) # transparent
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(final_png, "PNG")
        print("White background removed successfully with PIL!")
    except Exception as e:
        print("Failed to process with PIL:", e)

if __name__ == '__main__':
    process_image()
