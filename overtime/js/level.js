// 챕터 1 맵: 프롤로그 사무실(0~33칸) + 스테이지 1 야근 사무실(35칸~)
// 타일 16px. 천장 0~1행, 바닥 윗면 12행(y=192), 책상 10행(y=160), 선반 8행/6행.
(function () {
  const T = { EMPTY: 0, SOLID: 1, DESK: 2, CAB: 3, SHELF: 4, GATE: 5, CEIL: 6 };
  const TS = 16;

  function build() {
    const W = 188, H = 14;
    const tiles = new Uint8Array(W * H);
    const set = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) tiles[y * W + x] = v; };
    const spawns = [], decor = [];
    const px = x => x * TS + TS / 2;
    const FLOOR = 12 * TS;

    for (let x = 0; x < W; x++) { set(x, 0, T.CEIL); set(x, 1, T.CEIL); set(x, 12, T.SOLID); set(x, 13, T.SOLID); }
    for (let y = 0; y < H; y++) { set(0, y, T.SOLID); set(W - 1, y, T.SOLID); }

    const desk = (x, len, opt = {}) => { for (let i = 0; i < len; i++) set(x + i, 10, T.DESK); decor.push({ k: 'desk', x, len, ...opt }); };
    const cab = (x, h) => { for (let i = 0; i < h; i++) set(x, 11 - i, T.CAB); };
    const shelf = (x, len, row) => { for (let i = 0; i < len; i++) set(x + i, row, T.SHELF); };
    const pit = (x0, x1) => { for (let x = x0; x <= x1; x++) { set(x, 12, T.EMPTY); set(x, 13, T.EMPTY); } decor.push({ k: 'pit', x0, x1 }); };
    const sp = (type, x, opt = {}) => spawns.push({ type, x: px(x), y: opt.y !== undefined ? opt.y : FLOOR, ...opt });
    const onDesk = 10 * TS, onShelf = r => r * TS;

    // 장식: 창문, 조명, 포스터
    for (let x = 2; x < W - 4; x += 9) decor.push({ k: 'window', x, w: 4 });
    for (let x = 3; x < W - 2; x += 6) decor.push({ k: 'light', x, flicker: (x * 7) % 5 === 0 });
    const posters = [
      [6, '웃으며 일하자 :)'], [21, '우리는 가족입니다'], [40, '야근은 열정!'], [58, '칼퇴는 반역'], [77, '회의는 계속된다'],
      [97, '결재는 빠르게\n퇴근은 천천히'], [118, '이번 주도 파이팅!!'], [137, '내일 할 일을\n오늘 하자'], [160, '월요일 좋아'], [174, '야근 수당은\n마음으로'],
    ];
    for (const [x, text] of posters) decor.push({ k: 'poster', x, text });
    for (const x of [13, 31, 50, 63, 90, 118, 139, 155, 178]) decor.push({ k: 'plant', x });
    for (const x of [27, 94, 149]) decor.push({ k: 'vending', x });

    // ===== 프롤로그 (아침 사무실) =====
    desk(4, 3, { name: '한지우' });
    desk(9, 3, { name: '오대리' });
    sp('npc', 12, { who: 'oh', id: 'oh', face: -1 });
    desk(15, 3);
    cab(19, 2);
    desk(21, 3);
    sp('copier', 26, { id: 'tutCopier', passive: true });
    sp('cooler', 29, { id: 'cp0', cp: 0 });
    for (let y = 2; y <= 11; y++) set(33, y, T.GATE);
    decor.push({ k: 'sign', x: 33, y: 5, text: '부장실\n관계자 외\n출입 금지' });

    // ===== 스테이지 1 (밤) =====
    desk(37, 3);
    sp('zombie', 42, { id: 'z1', look: 'zombie' });
    desk(45, 3);
    sp('slime', 48);
    sp('money', 46, { y: onDesk });
    pit(52, 54);
    cab(57, 1);
    desk(59, 3);
    sp('money', 60, { y: onDesk }); sp('money', 61, { y: onDesk });
    sp('bat', 60, { y: 6 * TS });
    shelf(64, 4, 8);
    desk(66, 3);
    shelf(69, 3, 6);
    sp('money', 69, { y: onShelf(6) }); sp('money', 70, { y: onShelf(6) }); sp('money', 71, { y: onShelf(6) });
    sp('bat', 74, { y: 5 * TS });
    sp('slime', 78);
    cab(82, 2);
    sp('copier', 87, { id: 'c1' });
    sp('cooler', 92, { id: 'cp1', cp: 1 });

    desk(95, 3);
    sp('zombie', 101, { id: 'z2', look: 'zombie2' });
    desk(104, 3);
    sp('bat', 107, { y: 6 * TS });
    sp('zombie', 110, { id: 'z3', look: 'zombie' });
    pit(113, 116);
    shelf(114, 2, 10);
    sp('coin', 114, { y: onDesk }); sp('coin', 115, { y: onDesk });
    cab(120, 3);
    sp('slime', 122);
    cab(124, 2); cab(125, 2);
    sp('copier', 125, { id: 'c2', y: onDesk, xOff: -8 });
    shelf(128, 3, 7);
    sp('money', 128, { y: onShelf(7) }); sp('money', 129, { y: onShelf(7) }); sp('money', 130, { y: onShelf(7) });
    sp('slime', 132);
    sp('zombie', 141, { id: 'z4', look: 'zombie2' });
    desk(143, 3);
    sp('bat', 145, { y: 5 * TS });
    sp('coffee', 148);
    sp('cooler', 152, { id: 'cp2', cp: 2 });

    desk(157, 3);
    sp('zombie', 160, { id: 'z5', look: 'zombie' });
    sp('slime', 163);
    desk(165, 3);
    sp('bat', 166, { y: 6 * TS });
    sp('zombie', 168, { id: 'z6', look: 'zombie2' });
    cab(170, 1);
    sp('slime', 173);
    sp('money', 176); sp('money', 177);
    decor.push({ k: 'door', x: 181, text: '회의실' });

    return {
      W, H, TS, tiles, spawns, decor, T,
      gateX: 33, exitX: px(180), startX: px(3),
      cps: { 0: px(29), 1: px(92), 2: px(152) },
      jiwooDeskX: px(6), ohDeskX: px(12),
    };
  }

  window.LEVEL = { build, T };
})();
