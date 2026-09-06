import os
import sys

try:
    from PIL import Image
except ImportError:
    print("Pillow (PIL) is not installed. Installing Pillow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image

def optimize_icon():
    base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
    img_path = os.path.join(base_dir, "logo.png")
    
    if not os.path.exists(img_path):
        print(f"Error: Base logo file not found at {img_path}")
        return

    img = Image.open(img_path).convert("RGBA")
    
    # Get bounding box of non-transparent pixels
    bbox = img.getbbox()
    if not bbox:
        print("Image is entirely transparent!")
        return
        
    cropped_img = img.crop(bbox)
    width, height = cropped_img.size
    
    # For Android adaptive icons, content should be about 66% of the canvas
    # Let's make the canvas size so that the cropped image takes up 65%
    canvas_size = int(max(width, height) / 0.65)
    
    # Create new transparent canvas
    new_img = Image.new("RGBA", (canvas_size, canvas_size), (255, 255, 255, 0))
    
    # Paste cropped image in the center
    offset_x = (canvas_size - width) // 2
    offset_y = (canvas_size - height) // 2
    new_img.paste(cropped_img, (offset_x, offset_y))
    
    # Resize to standard 1024x1024 for consistency
    final_img = new_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    # Save the optimized images
    final_img.save(os.path.join(base_dir, "logo.png"))
    final_img.save(os.path.join(base_dir, "icon.png"))
    final_img.save(os.path.join(base_dir, "splash-icon.png"))
    final_img.save(os.path.join(base_dir, "adaptive-icon.png"))
    
    print("Successfully optimized and resized the icons!")

if __name__ == "__main__":
    optimize_icon()
