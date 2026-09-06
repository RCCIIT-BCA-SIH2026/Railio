from PIL import Image, ImageDraw

img = Image.open('assets/hero-section.png').convert('RGBA')
ImageDraw.floodfill(img, xy=(0, 0), value=(255, 255, 255, 0), thresh=20)
ImageDraw.floodfill(img, xy=(img.width-1, 0), value=(255, 255, 255, 0), thresh=20)
ImageDraw.floodfill(img, xy=(0, img.height-1), value=(255, 255, 255, 0), thresh=20)
ImageDraw.floodfill(img, xy=(img.width-1, img.height-1), value=(255, 255, 255, 0), thresh=20)

img.save('assets/hero-section-transparent.png', 'PNG')
print('Flood fill complete')
