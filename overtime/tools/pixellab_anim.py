#!/usr/bin/env python3
"""PixelLab 관절 애니메이션으로 캐릭터 동작을 만들고 게임용 스프라이트 띠로 묶습니다.

  python3 tools/pixellab_anim.py jiwoo            # 아직 없는 동작만 생성 후 묶기
  python3 tools/pixellab_anim.py jiwoo --only run1 atk1   # 지정한 요청만 (다시) 생성
  python3 tools/pixellab_anim.py jiwoo --pack     # 생성 없이 묶기만

준비물: art-src/<캐릭터>/ref.png (128×128, 투명 배경, 왼쪽을 보는 옆모습)
       art-src/<캐릭터>/ref_skeleton.json (PixelLab estimate-skeleton 결과)
API 키: PIXELLAB_API_KEY 환경 변수 (클라우드 환경에서는 프록시가 자동으로 넣어 줌)
결과: art-src/<캐릭터>/frames/*.png (원본 프레임), sprites/<캐릭터>_<동작>.png (게임용, 오른쪽을 봄),
      sprites/<캐릭터>_meta.json (손 위치 — 서류철 같은 소품을 그릴 자리)
"""
import base64, io, json, math, os, subprocess, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
API = 'https://api.pixellab.ai/v1/animate-with-skeleton'
SIZE = 128
F = -1  # 기준 그림이 왼쪽을 봄 → 앞쪽은 -x

# 팔·다리 길이 (그림 크기 대비 비율)
UA, FA, TH, SH = 0.125, 0.105, 0.225, 0.205

# 자세: lean(상체 앞으로), dy(몸 전체 아래로), up(상체만 아래로)
# 팔 [위팔 각도, 팔꿈치 굽힘], 다리 [허벅지 각도, 무릎 굽힘]. 각도는 아래 방향 0, 앞쪽 +
POSES = {
    'idle1': dict(up=0.007),
    'runA': dict(lean=0.03, R=[0.55, 0.15], L=[-0.45, 0.35], RA=[-0.6, 1.2], LA=[0.6, 1.0]),
    'runB': dict(lean=0.03, dy=-0.015, R=[0.05, 0.05], L=[0.5, 1.4], RA=[-0.1, 1.2], LA=[0.1, 1.1]),
    'runC': dict(lean=0.03, R=[-0.45, 0.35], L=[0.55, 0.15], RA=[0.6, 1.0], LA=[-0.6, 1.2]),
    'runD': dict(lean=0.03, dy=-0.015, R=[0.5, 1.4], L=[0.05, 0.05], RA=[0.1, 1.1], LA=[-0.1, 1.2]),
    'jump': dict(dy=-0.02, R=[0.7, 1.3], L=[0.2, 1.0], RA=[2.3, 0.3], LA=[1.9, 0.4]),
    'fall': dict(R=[0.3, 0.3], L=[-0.25, 0.2], RA=[2.0, 0.5], LA=[1.6, 0.6]),
    'windup': dict(lean=-0.015, R=[0.35, 0.2], L=[-0.35, 0.15], RA=[-1.3, 0.6], LA=[0.4, 0.6]),
    'strike': dict(lean=0.04, dy=0.01, R=[0.5, 0.3], L=[-0.5, 0.15], RA=[1.55, 0.0], LA=[-0.5, 0.6]),
    'low': dict(lean=0.02, dy=0.01, R=[0.45, 0.3], L=[-0.45, 0.15], RA=[0.6, 0.3], LA=[-0.4, 0.6]),
    'upper': dict(lean=0.01, dy=-0.005, R=[0.4, 0.2], L=[-0.4, 0.15], RA=[2.7, 0.0], LA=[-0.6, 0.6]),
    'overhead': dict(lean=-0.02, dy=-0.01, R=[0.3, 0.2], L=[-0.35, 0.15], RA=[3.0, 0.2], LA=[2.8, 0.3]),
    'slam': dict(lean=0.06, dy=0.035, R=[0.8, 0.9], L=[-0.6, 0.3], RA=[1.0, 0.1], LA=[0.6, 0.4]),
    'stamp': dict(dy=-0.03, R=[1.0, 1.8], L=[0.6, 1.6], RA=[0.05, 0.0], LA=[-0.6, 0.6]),
    'dash': dict(dy=0.10, lean=-0.03, R=[1.45, 1.45], L=[1.35, 1.35], RA=[1.0, 0.6], LA=[-0.3, 0.6]),
    'hurt': dict(lean=-0.05, R=[0.3, 0.2], L=[-0.4, 0.2], RA=[-0.8, 0.9], LA=[-1.2, 0.6]),
    'down': dict(dy=0.33, lean=-0.05, R=[1.5, 0.1], L=[1.4, 0.15], RA=[-0.5, 0.2], LA=[-0.7, 0.3]),
    'cast': dict(dy=-0.005, RA=[2.9, 0.1], LA=[0.2, 0.3]),
    'talk': dict(RA=[0.8, 1.1], LA=[0.1, 0.2]),
    'grab1': dict(lean=-0.03, RA=[2.4, 0.5], LA=[1.9, 0.8], R=[0.2, 0.2], L=[-0.3, 0.2]),
    'grab2': dict(lean=-0.03, RA=[2.0, 0.9], LA=[2.5, 0.4], R=[0.1, 0.2], L=[-0.2, 0.2]),
}
# 요청 하나 = [기준 프레임, 새 프레임 2장]. 기준 프레임은 'ref' 또는 앞서 만든 프레임
CALLS = {
    'idle': ['ref', 'idle1', 'idle1'],
    'run1': ['ref', 'runA', 'runB'],
    'run2': ['runB', 'runC', 'runD'],
    'jump': ['ref', 'jump', 'fall'],
    'atk1': ['ref', 'windup', 'strike'],
    'atk2': ['strike', 'low', 'upper'],
    'atk3': ['ref', 'overhead', 'slam'],
    'misc1': ['ref', 'stamp', 'dash'],
    'misc2': ['ref', 'hurt', 'down'],
    'misc3': ['ref', 'cast', 'talk'],
    'misc4': ['ref', 'grab1', 'grab2'],
}
# 게임 동작 → 프레임 목록
ANIMS = {
    'idle': ['ref', 'idle1'], 'run': ['runA', 'runB', 'runC', 'runD'], 'jump': ['jump'], 'fall': ['fall'],
    'atk1': ['windup', 'strike', 'strike'], 'atk2': ['low', 'upper', 'upper'], 'atk3': ['overhead', 'slam', 'slam'],
    'stamp': ['stamp'], 'dash': ['dash'], 'hurt': ['hurt'], 'dead': ['down'], 'shoot': ['strike'],
    'cast': ['cast', 'cast'], 'ult': ['runA', 'runB', 'runC', 'runD'], 'talk': ['ref', 'talk'], 'grabbed': ['grab1', 'grab2'],
}


def b64img(path):
    return {'type': 'base64', 'base64': base64.b64encode(open(path, 'rb').read()).decode()}


def solid(white):
    m = Image.new('RGB', (SIZE, SIZE), (255, 255, 255) if white else (0, 0, 0))
    b = io.BytesIO(); m.save(b, 'PNG')
    return {'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode()}


def make_pose(base, p):
    """기준 관절에서 자세 매개변수로 새 관절 좌표를 계산"""
    k = {q['label']: dict(q) for q in base}
    dy, up, lean = p.get('dy', 0), p.get('up', 0), p.get('lean', 0)
    upper = ['NOSE', 'NECK', 'RIGHT EYE', 'LEFT EYE', 'RIGHT EAR', 'LEFT EAR', 'RIGHT SHOULDER', 'LEFT SHOULDER']
    for lab in upper:
        k[lab]['x'] += F * lean; k[lab]['y'] += dy + up
    for lab in ['RIGHT HIP', 'LEFT HIP']:
        k[lab]['y'] += dy
    for side, arm in (('RIGHT', 'RA'), ('LEFT', 'LA')):
        s = k[f'{side} SHOULDER']
        if arm in p:
            a1, a2 = p[arm]
            e = (s['x'] + F * UA * math.sin(a1), s['y'] + UA * math.cos(a1))
            h = (e[0] + F * FA * math.sin(a1 + a2), e[1] + FA * math.cos(a1 + a2))
        else:  # 원래 팔 모양 유지, 어깨를 따라 이동
            ob = {q['label']: q for q in base}
            ddx, ddy = s['x'] - ob[f'{side} SHOULDER']['x'], s['y'] - ob[f'{side} SHOULDER']['y']
            e = (ob[f'{side} ELBOW']['x'] + ddx, ob[f'{side} ELBOW']['y'] + ddy)
            h = (ob[f'{side} ARM']['x'] + ddx, ob[f'{side} ARM']['y'] + ddy)
        k[f'{side} ELBOW'].update(x=e[0], y=e[1]); k[f'{side} ARM'].update(x=h[0], y=h[1])
    for side, leg in (('RIGHT', 'R'), ('LEFT', 'L')):
        hp = k[f'{side} HIP']
        if leg in p:
            a1, a2 = p[leg]
            kn = (hp['x'] + F * TH * math.sin(a1), hp['y'] + TH * math.cos(a1))
            ft = (kn[0] + F * SH * math.sin(a1 - a2), kn[1] + SH * math.cos(a1 - a2))
            k[f'{side} KNEE'].update(x=kn[0], y=kn[1]); k[f'{side} LEG'].update(x=ft[0], y=ft[1])
        elif dy:
            k[f'{side} KNEE']['y'] += dy * 0.5
    out = []
    for q in base:
        r = k[q['label']]
        out.append({'x': round(r['x'], 4), 'y': round(r['y'], 4), 'label': q['label'], 'z_index': int(q.get('z_index', 0))})
    return out


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
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(1)
    ch = args[0]
    src = os.path.join(ROOT, 'art-src', ch)
    fdir = os.path.join(src, 'frames'); os.makedirs(fdir, exist_ok=True)
    base = json.load(open(os.path.join(src, 'ref_skeleton.json')))['keypoints']
    ref_path = os.path.join(src, 'ref.png')
    poses = {'ref': base, **{n: make_pose(base, p) for n, p in POSES.items()}}
    json.dump(poses, open(os.path.join(src, 'poses.json'), 'w'))
    only = args[args.index('--only') + 1:] if '--only' in args else None
    frame_path = lambda n: ref_path if n == 'ref' else os.path.join(fdir, f'{n}.png')

    if '--pack' not in args:
        for name, seq in CALLS.items():
            if only is not None and name not in only:
                continue
            if only is None and all(os.path.exists(frame_path(n)) for n in seq[1:]):
                continue
            anchor = frame_path(seq[0])
            if not os.path.exists(anchor):
                print(f'{name}: 기준 프레임 {seq[0]} 이 아직 없어 건너뜀'); continue
            body = {
                'image_size': {'width': SIZE, 'height': SIZE}, 'view': 'side', 'direction': 'west', 'guidance_scale': 4.0,
                'reference_image': b64img(ref_path),
                'skeleton_keypoints': [poses[n] for n in seq],
                'inpainting_images': [b64img(anchor), None, None],
                'mask_images': [solid(False), solid(True), solid(True)],
            }
            d = post(body)
            imgs = d['images']
            for n, im in zip(seq[1:], imgs[1:]):
                Image.open(io.BytesIO(base64.b64decode(im['base64'].split(',')[-1]))).convert('RGBA').save(frame_path(n))
            print(f'{name}: {", ".join(seq[1:])} 생성 ({d.get("usage")})')

    # 묶기: 오른쪽을 보도록 좌우 반전, 가로로 이어 붙임
    sp = os.path.join(ROOT, 'sprites'); os.makedirs(sp, exist_ok=True)
    ref = Image.open(ref_path).convert('RGBA')
    foot = ref.getbbox()[3]
    meta = {'size': SIZE, 'foot': foot, 'anims': {}}
    for anim, names in ANIMS.items():
        if not all(os.path.exists(frame_path(n)) for n in names):
            print(f'{anim}: 프레임이 모자라 건너뜀'); continue
        strip = Image.new('RGBA', (SIZE * len(names), SIZE))
        hands = []
        for i, n in enumerate(names):
            im = Image.open(frame_path(n)).convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT)
            strip.paste(im, (i * SIZE, 0))
            k = {q['label']: q for q in poses[n]}
            e, h = k['RIGHT ELBOW'], k['RIGHT ARM']
            hx, hy = (1 - h['x']) * SIZE, h['y'] * SIZE
            ang = math.atan2((h['y'] - e['y']), (-(h['x'] - e['x'])))
            hip = ((1 - (k['RIGHT HIP']['x'] + k['LEFT HIP']['x']) / 2) * SIZE, (k['RIGHT HIP']['y'] + k['LEFT HIP']['y']) / 2 * SIZE)
            hands.append({'x': round(hx, 1), 'y': round(hy, 1), 'a': round(ang, 3), 'hx': round(hip[0], 1), 'hy': round(hip[1], 1)})
        strip.save(os.path.join(sp, f'{ch}_{anim}.png'))
        meta['anims'][anim] = hands
    json.dump(meta, open(os.path.join(sp, f'{ch}_meta.json'), 'w'), indent=1)
    print('묶기 완료:', ', '.join(meta['anims']))


if __name__ == '__main__':
    main()
