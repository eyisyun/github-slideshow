// 전투기 부품 정의 — 서버와 클라이언트가 함께 사용합니다.
(function (root) {
  const SLOTS = [
    { id: 'body', name: '동체' },
    { id: 'wing', name: '날개' },
    { id: 'engine', name: '엔진' },
    { id: 'gun', name: '주무기' },
    { id: 'special', name: '보조무기' },
  ];

  // tier: 스프라이트 모양, price: 코인
  const PARTS = {
    // 동체: hp, mass(무거울수록 선회·가속 감소)
    b1: { slot: 'body', tier: 1, name: '연습기 동체', price: 0, hp: 100, mass: 1.0, desc: '가볍고 평범한 기본 동체' },
    b2: { slot: 'body', tier: 2, name: '강화 동체', price: 400, hp: 150, mass: 1.12, desc: '장갑판을 덧댄 동체' },
    b3: { slot: 'body', tier: 3, name: '중장갑 동체', price: 1200, hp: 230, mass: 1.32, desc: '튼튼하지만 무겁다' },
    b4: { slot: 'body', tier: 4, name: '스텔스 동체', price: 2600, hp: 170, mass: 1.0, stealth: true, desc: '적 레이더(미니맵)에 잡히지 않음' },

    // 날개: turn(rad/s)
    w1: { slot: 'wing', tier: 1, name: '직선익', price: 0, turn: 2.5, desc: '기본 날개' },
    w2: { slot: 'wing', tier: 2, name: '후퇴익', price: 350, turn: 3.0, desc: '선회력 향상' },
    w3: { slot: 'wing', tier: 3, name: '델타익', price: 1000, turn: 3.5, desc: '날카로운 선회' },
    w4: { slot: 'wing', tier: 4, name: '가변익', price: 2200, turn: 4.0, desc: '최고의 기동성' },

    // 엔진: thrust(가속), maxV(최고속도)
    e1: { slot: 'engine', tier: 1, name: '프로펠러', price: 0, thrust: 140, maxV: 170, desc: '느리지만 믿음직함' },
    e2: { slot: 'engine', tier: 2, name: '터보제트', price: 450, thrust: 190, maxV: 215, desc: '제트 엔진' },
    e3: { slot: 'engine', tier: 3, name: '애프터버너', price: 1300, thrust: 250, maxV: 260, desc: '폭발적인 가속' },
    e4: { slot: 'engine', tier: 4, name: '램제트', price: 2800, thrust: 300, maxV: 310, desc: '초음속 비행' },

    // 주무기: dmg, rate(발/초), speed(탄속), spread(rad), twin(쌍열)
    g1: { slot: 'gun', tier: 1, name: '7.7mm 기관총', price: 0, dmg: 6, rate: 8, speed: 430, spread: 0.06, range: 1.0, desc: '기본 기관총' },
    g2: { slot: 'gun', tier: 2, name: '20mm 기관포', price: 500, dmg: 11, rate: 6.5, speed: 460, spread: 0.05, range: 1.1, desc: '한 발 한 발이 묵직함' },
    g3: { slot: 'gun', tier: 3, name: '쌍열 기관포', price: 1400, dmg: 8, rate: 7, speed: 470, spread: 0.05, range: 1.1, twin: true, desc: '두 줄로 쏟아지는 탄환' },
    g4: { slot: 'gun', tier: 4, name: '펄스 레이저', price: 3000, dmg: 15, rate: 8, speed: 720, spread: 0.015, range: 1.2, laser: true, desc: '빠르고 정확한 광선' },

    // 보조무기: kind, dmg, cd(재사용 대기초), count
    s0: { slot: 'special', tier: 0, name: '없음', price: 0, kind: 'none', desc: '보조무기 없음' },
    s1: { slot: 'special', tier: 1, name: '로켓 포드', price: 400, kind: 'rocket', dmg: 30, cd: 1.8, count: 2, desc: '직진하는 로켓 2발' },
    s2: { slot: 'special', tier: 2, name: '유도 미사일', price: 1500, kind: 'missile', dmg: 45, cd: 4.5, count: 1, desc: '적을 추적하는 미사일' },
    s3: { slot: 'special', tier: 3, name: '다탄두 미사일', price: 3200, kind: 'missile', dmg: 28, cd: 6, count: 3, desc: '유도 미사일 3발 동시 발사' },
  };

  // 도색 색상
  const PAINTS = ['#4a8ce8', '#e84a4a', '#e8c34a', '#4ae87a', '#c84ae8', '#e8884a', '#4ae0e8', '#e84aa8', '#9ae84a', '#d8dce6'];

  const DEFAULT_LOADOUT = { body: 'b1', wing: 'w1', engine: 'e1', gun: 'g1', special: 's0' };

  function stats(lo) {
    const b = PARTS[lo.body], w = PARTS[lo.wing], e = PARTS[lo.engine];
    return {
      hp: b.hp,
      turn: w.turn / Math.sqrt(b.mass),
      accel: e.thrust / b.mass,
      maxV: e.maxV,
      minV: Math.round(e.maxV * 0.45),
      stealth: !!b.stealth,
      gun: PARTS[lo.gun],
      special: PARTS[lo.special],
    };
  }

  function validLoadout(lo, owned) {
    if (!lo) return false;
    for (const s of SLOTS) {
      const p = PARTS[lo[s.id]];
      if (!p || p.slot !== s.id) return false;
      if (owned && !owned.includes(lo[s.id])) return false;
    }
    return true;
  }

  const api = { SLOTS, PARTS, PAINTS, DEFAULT_LOADOUT, stats, validLoadout, WORLD: 2400 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SKY = api;
})(this);
