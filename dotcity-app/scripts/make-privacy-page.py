#!/usr/bin/env python3
"""Regenerates site/privacy/index.html from dotcity-app/PRIVACY.md (run from the repo root)."""
import html, re, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
md = (root / 'dotcity-app' / 'PRIVACY.md').read_text()

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', t)
    return re.sub(r'(?<!href=")(https?://[^\s<)]+)', r'<a href="\1">\1</a>', t)

out, ol, ul = [], False, False
for line in md.split('\n'):
    if re.match(r'^\d+\. ', line):
        if ul: out.append('</ul>'); ul = False
        if not ol: out.append('<ol>'); ol = True
        out.append('<li>' + inline(re.sub(r'^\d+\. ', '', line))); continue
    if line.startswith('   - '):
        if not ul: out.append('<ul>'); ul = True
        out.append('<li>' + inline(line[5:]) + '</li>'); continue
    if ul: out.append('</ul>'); ul = False
    if not line.strip(): continue
    if ol: out.append('</ol>'); ol = False
    if line.startswith('# '): out.append('<h1>' + inline(line[2:]) + '</h1>')
    elif line.strip() == '---': out.append('<hr>')
    else: out.append('<p>' + inline(line) + '</p>')
if ul: out.append('</ul>')
if ol: out.append('</ol>')

page = '''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>도트시티 개인정보처리방침</title>
<meta name="theme-color" content="#141a30">
<!-- Generated from dotcity-app/PRIVACY.md by dotcity-app/scripts/make-privacy-page.py. Edit the .md and rerun. -->
<style>
:root{--void:#141a30;--panel:#222a4a;--ink:#eef0fa;--dim:#98a1c8;--gold:#ffcc4d}
html,body{margin:0;background:var(--void);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif}
main{max-width:760px;margin:0 auto;padding:40px 16px 56px}
h1{color:var(--gold);font-weight:700;font-size:26px;margin:28px 0 8px}
p{color:var(--dim)} li{margin:6px 0} b{color:var(--ink)} a{color:var(--gold);word-break:break-all}
hr{border:0;border-top:2px solid var(--panel);margin:40px 0}
.back{display:inline-block;margin-bottom:8px;color:var(--dim)}
</style>
</head>
<body><main>
<a class="back" href="../">← 도트시티</a>
''' + '\n'.join(out) + '''
</main></body>
</html>
'''
(root / 'site' / 'privacy' / 'index.html').write_text(page)
print('wrote site/privacy/index.html')
