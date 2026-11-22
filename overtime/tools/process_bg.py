#!/usr/bin/env python3
"""PixelLab 배경 그림을 게임에 맞게 다듬습니다 (생성 횟수 안 씀).

  python3 tools/process_bg.py

- sprites/bg_wall_day.png  → 원근이 들어간 양옆·천장·바닥을 잘라 내고 평평한 벽(창문 2개)만 남겨
                             반복해서 깔 수 있는 312×320 조각으로 만듦 (원본은 art-src/bg/ 에 보관)
- sprites/bg_wall_night.png ← 낮 벽을 색만 바꿔 밤으로 (창밖 하늘은 남색, 건물엔 불 켜진 창)
- sprites/bg_cabinet.png   → 흰 테두리를 잘라 내고 32×32 로
"""
import os, random, shutil
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SP = os.path.join(ROOT, 'sprites')
SRC = os.path.join(ROOT, 'art-src', 'bg')
os.makedirs(SRC, exist_ok=True)


def original(name):
    """처음 실행할 때 원본을 art-src/bg 로 옮겨 두고, 그다음부터는 원본에서 다시 만듦"""
    keep = os.path.join(SRC, f'{name}.png')
    if not os.path.exists(keep):
        shutil.copy(os.path.join(SP, f'{name}.png'), keep)
    return Image.open(keep).convert('RGBA')


# ---- 낮 벽 ----
raw = original('bg_wall_day')
WALL = (225, 204, 164, 255)
crop = raw.crop((36, 76, 348, 268))  # 창문 둘과 가운데 기둥
day = Image.new('RGBA', (312, 320), WALL)
day.paste(crop, (0, 60))
px = day.load()
for x in range(312):  # 위 몰딩·아래 걸레받이
    for y in range(0, 6): px[x, y] = (196, 174, 136, 255)
    px[x, 6] = (170, 148, 112, 255)
    for y in range(306, 320): px[x, y] = (150, 128, 96, 255)
    px[x, 305] = (120, 100, 74, 255)
day.save(os.path.join(SP, 'bg_wall_day.png'))

# ---- 밤 벽: 색 바꾸기 ----
random.seed(7)
night = day.copy(); n = night.load()
for y in range(320):
    for x in range(312):
        r, g, b, a = n[x, y]
        if b > r + 30:  # 창밖 (하늘·건물)
            light = (r + g + b) / 3
            if light > 215:  # 하늘
                n[x, y] = (22, 28, 66, 255) if y < 160 else (30, 38, 86, 255)
            else:  # 건물
                n[x, y] = (38, 44, 78, 255)
        else:
            n[x, y] = (int(r * 0.30), int(g * 0.32), int(b * 0.48), a)
# 건물 창문 불빛
for _ in range(260):
    x, y = random.randrange(0, 311), random.randrange(60, 250)
    if n[x, y][:3] == (38, 44, 78) and n[x + 1, y][:3] == (38, 44, 78):
        c = random.choice([(255, 214, 110, 255), (255, 236, 170, 255), (180, 220, 255, 255)])
        n[x, y] = c; n[x + 1, y] = c
night.save(os.path.join(SP, 'bg_wall_night.png'))

# ---- 다른 벽들: 원본 보관 후 밤 버전은 어둡게 (창이 있으면 창밖도 밤으로) ----
for name in ['bg_wall_b', 'bg_wall_c']:
    if not os.path.exists(os.path.join(SP, f'{name}.png')) and not os.path.exists(os.path.join(SRC, f'{name}.png')):
        continue
    im = original(name).resize((312, 320), Image.NEAREST)
    im.save(os.path.join(SP, f'{name}.png'))
    nn = im.copy(); q = nn.load()
    for y in range(320):
        for x in range(312):
            r, g, b, a = q[x, y]
            if b > r + 30 and (r + g + b) / 3 > 200:
                q[x, y] = (24, 30, 70, a)
            else:
                q[x, y] = (int(r * 0.30), int(g * 0.32), int(b * 0.48), a)
    nn.save(os.path.join(SP, f'{name}_night.png'))

# ---- 서랍장 ----
cab = original('bg_cabinet')
cp = cab.load()
xs = [x for x in range(32) if any(sum(cp[x, y][:3]) < 600 for y in range(32))]
ys = [y for y in range(32) if any(sum(cp[x, y][:3]) < 600 for x in range(32))]
cab.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1)).resize((32, 32), Image.NEAREST).save(os.path.join(SP, 'bg_cabinet.png'))
print('배경 다듬기 완료')
