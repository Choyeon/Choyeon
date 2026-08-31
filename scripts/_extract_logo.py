"""Extract Choyeon Exercises logo from brand sheet → Android icon set."""
import numpy as np
from PIL import Image
import os

ROOT = r'D:\WebProjects\ChoyeonExercises'
SRC = r'c:\Users\Choyeon\.trae-cn\attachments\6a90e548af5c641164b59ff1\c72dd155-f71b-4b3f-9d32-0d0325d9e992_ae2b5109-97d6-48ad-92bd-81df2b96dc57_9d818f9a-9b0f-4349-854b-a2e4a75f8d88.png'

img = Image.open(SRC).convert('RGBA')
arr = np.array(img)
h, w = arr.shape[:2]

# Find non-white content pixels (RGB all < 240 means non-white)
rgb = arr[:, :, :3].astype(int)
brightness = rgb.mean(axis=2)
content = brightness < 240

# Find bounding box
rows = np.where(content.any(axis=1))[0]
cols = np.where(content.any(axis=0))[0]
print(f'Full content: rows {rows.min()}-{rows.max()}, cols {cols.min()}-{cols.max()}')

# Split into 4 by col ranges and find each logo bbox
labels = ['Choyeon To Do', 'Choyeon Note', 'Choyeon Exercises', 'Rosetta']
col_ranges = np.array_split(range(cols.min(), cols.max()+1), 4)

logo_bboxes = []
for i, r in enumerate(col_ranges):
    sub = content[:, r[0]:r[-1]+1]
    rows_sub = np.where(sub.any(axis=1))[0]
    cols_sub = np.where(sub.any(axis=0))[0]
    # Full image coords
    r0, r1 = rows_sub.min(), rows_sub.max()
    c0, c1 = cols_sub.min() + r[0], cols_sub.max() + r[0]
    # Add padding
    pad_row = int((r1 - r0) * 0.08)
    pad_col = int((c1 - c0) * 0.08)
    r0 = max(0, r0 - pad_row)
    r1 = min(h, r1 + pad_row)
    c0 = max(0, c0 - pad_col)
    c1 = min(w, c1 + pad_col)
    logo_bboxes.append((r0, r1, c0, c1, labels[i]))
    print(f'Logo {i+1} ({labels[i]}): ({r0},{c0})-({r1},{c1}) size=({r1-r0}x{c1-c0})')

# Extract the 3rd one — Choyeon Exercises (C + fitness figure)
r0, r1, c0, c1, name = logo_bboxes[2]
logo = img.crop((c0, r0, c1, r1))
print(f'\nSelected: {name} → {logo.size}')

# Make it square (center-crop to square)
lw, lh = logo.size
side = max(lw, lh)
square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
off_x = (side - lw) // 2
off_y = (side - lh) // 2
square.paste(logo, (off_x, off_y), logo)

# Save 1024x1024 for Expo
logo_1024 = square.resize((1024, 1024), Image.LANCZOS)
out_path = os.path.join(ROOT, 'assets', 'icon-exercises-1024.png')
os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
logo_1024.save(out_path, 'PNG')
print(f'Saved 1024px icon → {out_path}')

# Also generate adaptive icon foreground (transparent bg, just the C)
# The original logo already has white bg — convert white→transparent
logo_rgb = logo.convert('RGBA')
data = np.array(logo_rgb)
rgb_check = data[:, :, :3].astype(int)
white_mask = (rgb_check[:, :, 0] > 240) & (rgb_check[:, :, 1] > 240) & (rgb_check[:, :, 2] > 240)
data[white_mask, 3] = 0  # make white pixels transparent
logo_transparent = Image.fromarray(data)

# Make square
lt, lg = logo_transparent.size
side2 = max(lt, lg)
sq2 = Image.new('RGBA', (side2, side2), (0, 0, 0, 0))
sq2.paste(logo_transparent, ((side2-lt)//2, (side2-lg)//2), logo_transparent)

# Save adaptive foreground (432x432 is recommended for Android adaptive)
fg_path = os.path.join(ROOT, 'assets', 'adaptive-icon.png')
sq2.resize((1024, 1024), Image.LANCZOS).save(fg_path, 'PNG')
print(f'Saved adaptive foreground → {fg_path}')

print('\n✅ Logo extraction done. Next: update app.json → expo prebuild.')
