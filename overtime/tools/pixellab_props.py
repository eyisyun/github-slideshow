#!/usr/bin/env python3
"""적·배경 소품 그림을 PixelLab으로 만듭니다 → sprites/<이름>.png

  python3 tools/pixellab_props.py             # 아직 없는 것만
  python3 tools/pixellab_props.py desk slime  # 지정한 것만 (다시) 생성

크기는 '고해상도 픽셀'(게임 월드 1칸 = 2픽셀) 기준입니다.
적은 왼쪽을 보게 만듭니다(게임이 필요할 때 뒤집음).
"""
import base64, io, json, os, subprocess, sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SP = os.path.join(ROOT, 'sprites')
API = 'https://api.pixellab.ai/v1/generate-image-pixflux'
STYLE = 'modern high quality pixel art game asset, detailed shading, single color black outline'


def desk_template():
    """책상 위치 가이드: 96×96, 바닥 y=95, 책상 윗면 y=31~36 (게임 책상 타일과 맞춤)"""
    im = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([0, 31, 95, 37], fill=(200, 149, 90, 255))
    d.rectangle([3, 38, 7, 95], fill=(150, 105, 60, 255)); d.rectangle([88, 38, 92, 95], fill=(150, 105, 60, 255))
    d.rectangle([60, 38, 86, 76], fill=(150, 156, 170, 255))
    d.rectangle([30, 6, 62, 28], fill=(40, 40, 50, 255)); d.rectangle([33, 9, 59, 25], fill=(110, 170, 225, 255))
    d.rectangle([44, 28, 48, 31], fill=(40, 40, 50, 255)); d.rectangle([14, 28, 30, 30], fill=(220, 220, 228, 255))
    b = io.BytesIO(); im.save(b, 'PNG'); return base64.b64encode(b.getvalue()).decode()


def bat_template():
    """서류철 박쥐 모양 가이드: 가운데 노란 서류철 몸통, 양옆 위로 든 종이 날개"""
    im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.polygon([(26, 30), (4, 12), (8, 34)], fill=(246, 246, 240, 255)); d.polygon([(38, 30), (60, 12), (56, 34)], fill=(246, 246, 240, 255))
    d.rectangle([20, 22, 44, 46], fill=(233, 196, 106, 255)); d.rectangle([20, 18, 30, 22], fill=(233, 196, 106, 255))
    d.rectangle([20, 44, 44, 46], fill=(201, 154, 58, 255))
    d.rectangle([25, 29, 28, 32], fill=(230, 40, 40, 255)); d.rectangle([36, 29, 39, 32], fill=(230, 40, 40, 255))
    b = io.BytesIO(); im.save(b, 'PNG'); return base64.b64encode(b.getvalue()).decode()


ITEMS = {
    # 적
    'slime': dict(size=(64, 64), dir='west', desc='small grumpy blob monster made of crumpled white office paper sheets, angry eyes, frowning mouth, side view'),
    'bat': dict(size=(64, 64), dir='west', desc='cute angry flying creature whose rectangular body is a closed yellow manila office document folder with a paper tab on top, a few white papers sticking out, two folded white paper sheets as bat wings, glowing red eyes, small fangs, not an insect, side view'),
    'copier': dict(size=(96, 96), dir='west', desc='angry office photocopier machine monster, grey plastic body, glowing red LED eyes, paper output tray like a mouth with sharp teeth, side view'),
    'copier_b': dict(size=(96, 96), dir='west', init='copier', strength=300, desc='same angry office photocopier monster, mouth wide open spitting a sheet of paper, glowing yellow eyes, side view'),
    # 배경 소품
    'bg_desk': dict(size=(96, 96), template=desk_template, strength=520, desc='office desk seen from the side with computer monitor, keyboard, papers and a coffee mug on top, metal drawer unit under the desk, wooden desk top'),
    'bg_cabinet': dict(size=(32, 32), bg=True, desc='front of one grey metal filing cabinet drawer with handle and label slot, fills the whole image, flat'),
    'bg_cooler': dict(size=(32, 64), desc='office water cooler dispenser with big blue water bottle on top, white body, red and blue taps, side view'),
    'bg_door': dict(size=(64, 112), bg=True, desc='closed wooden double door of a meeting room with small glass windows and metal handles, front view, fills the whole image'),
    'bg_plant': dict(size=(32, 64), desc='tall potted office plant with green leaves in a white pot'),
    'bg_wall_day': dict(size=(384, 320), bg=True, desc='interior wall of a modern office in daytime seen straight on, two large windows showing a sunny city skyline with skyscrapers, beige wall panels, ceiling with fluorescent light panels at the top, carpet floor edge at the bottom, no furniture, no people, flat side view'),
    'bg_wall_night': dict(size=(384, 320), bg=True, init='bg_wall_day', strength=420, desc='the same interior office wall late at night, dark blue lighting, two large windows showing a night city skyline with lit windows and moon, dim fluorescent ceiling lights, no furniture, no people, flat side view'),
}


def post(body):
    headers = ['-H', 'Content-Type: application/json']
    if os.environ.get('PIXELLAB_API_KEY'):
        headers += ['-H', 'Authorization: Bearer ' + os.environ['PIXELLAB_API_KEY']]
    r = subprocess.run(['curl', '-s', '-w', '\n%{http_code}', '-X', 'POST', API, *headers, '--data-binary', '@-'],
                       input=json.dumps(body).encode(), capture_output=True, check=True)
    text, code = r.stdout.decode().rsplit('\n', 1)
    if code != '200':
        raise RuntimeError(f'HTTP {code}: {text[:300]}')
    return json.loads(text)


def main():
    want = [a for a in sys.argv[1:] if not a.startswith('--')]
    os.makedirs(SP, exist_ok=True)
    for name, it in ITEMS.items():
        out = os.path.join(SP, f'{name}.png')
        if want and name not in want:
            continue
        if not want and os.path.exists(out):
            continue
        w, h = it['size']
        body = {
            'description': f"{it['desc']}, {STYLE}", 'image_size': {'width': w, 'height': h},
            'no_background': not it.get('bg'), 'text_guidance_scale': 8,
            'outline': 'single color black outline', 'shading': 'detailed shading', 'detail': 'highly detailed',
        }
        if it.get('dir'):
            body.update(view='side', direction=it['dir'])
        if it.get('init'):
            body['init_image'] = {'type': 'base64', 'base64': base64.b64encode(open(os.path.join(SP, f"{it['init']}.png"), 'rb').read()).decode()}
            body['init_image_strength'] = it.get('strength', 300)
        if it.get('template'):
            body['init_image'] = {'type': 'base64', 'base64': it['template']()}
            body['init_image_strength'] = it.get('strength', 400)
        d = post(body)
        Image.open(io.BytesIO(base64.b64decode(d['image']['base64'].split(',')[-1]))).convert('RGBA').save(out)
        print(f'{name}: 저장 ({d.get("usage")})')


if __name__ == '__main__':
    main()
