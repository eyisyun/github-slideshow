#!/usr/bin/env python3
"""캐릭터 기준 그림(128×128 옆모습)을 PixelLab으로 만들고 관절을 추정합니다.

  python3 tools/pixellab_base.py oh "설명..."                 # 새로 생성
  python3 tools/pixellab_base.py zombie "설명..." --init worker  # 다른 캐릭터 그림에서 출발 (같은 사람으로 보이게)
  python3 tools/pixellab_base.py oh --skeleton-only           # 이미 있는 ref.png 로 관절만 다시 추정

결과: art-src/<캐릭터>/ref.png (왼쪽을 봄), art-src/<캐릭터>/ref_skeleton.json
주인공(jiwoo)과 같은 설정을 써서 그림체를 맞춥니다.
"""
import base64, io, json, os, subprocess, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
STYLE = 'full body, side view, standing idle pose, modern high quality pixel art game character sprite'


def post(url, body):
    headers = ['-H', 'Content-Type: application/json']
    if os.environ.get('PIXELLAB_API_KEY'):
        headers += ['-H', 'Authorization: Bearer ' + os.environ['PIXELLAB_API_KEY']]
    r = subprocess.run(['curl', '-s', '-w', '\n%{http_code}', '-X', 'POST', url, *headers, '--data-binary', '@-'],
                       input=json.dumps(body).encode(), capture_output=True, check=True)
    text, code = r.stdout.decode().rsplit('\n', 1)
    if code != '200':
        raise RuntimeError(f'HTTP {code}: {text[:300]}')
    return json.loads(text)


def b64(path):
    return base64.b64encode(open(path, 'rb').read()).decode()


def estimate(path):
    d = post('https://api.pixellab.ai/v1/estimate-skeleton', {'image': {'type': 'base64', 'base64': b64(path)}})
    return d


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(1)
    ch = a[0]
    out = os.path.join(ROOT, 'art-src', ch); os.makedirs(out, exist_ok=True)
    ref = os.path.join(out, 'ref.png')
    if '--skeleton-only' not in a:
        desc = a[1]
        body = {
            'description': f'{desc}, {STYLE}', 'image_size': {'width': 128, 'height': 128}, 'no_background': True,
            'view': 'side', 'direction': 'east', 'outline': 'single color black outline',
            'shading': 'detailed shading', 'detail': 'highly detailed', 'text_guidance_scale': 8,
        }
        if '--init' in a:
            body['init_image'] = {'type': 'base64', 'base64': b64(os.path.join(ROOT, 'art-src', a[a.index('--init') + 1], 'ref.png'))}
            body['init_image_strength'] = 350
        if '--seed' in a:
            body['seed'] = int(a[a.index('--seed') + 1])
        d = post('https://api.pixellab.ai/v1/generate-image-pixflux', body)
        Image.open(io.BytesIO(base64.b64decode(d['image']['base64'].split(',')[-1]))).convert('RGBA').save(ref)
        print(f'{ch}: 기준 그림 저장 ({d.get("usage")})')
    sk = estimate(ref)
    k = {p['label']: p for p in sk['keypoints']}
    ears = (k['LEFT EAR']['x'] + k['RIGHT EAR']['x']) / 2
    if k['NOSE']['x'] > ears:  # 오른쪽을 보면 뒤집어서 왼쪽을 보게 맞춤
        Image.open(ref).transpose(Image.FLIP_LEFT_RIGHT).save(ref)
        sk = estimate(ref)
        print(f'{ch}: 오른쪽을 보고 있어서 좌우 반전')
    json.dump(sk, open(os.path.join(out, 'ref_skeleton.json'), 'w'))
    print(f'{ch}: 관절 추정 완료 ({sk.get("usage")})')


if __name__ == '__main__':
    main()
