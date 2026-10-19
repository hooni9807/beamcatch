export const REGIONS = [
  { id: 'meadow', name: '새빛 마을', subtitle: '모험이 시작되는 작은 마을' },
  { id: 'lake', name: '잔물결 호수', subtitle: '물빛 사이에 숨은 작은 친구들' },
  { id: 'ruins', name: '황금빛 유적', subtitle: '오래된 숲이 간직한 비밀' },
];

const T = 32, COLS = 30, ROWS = 18;
const P = { outline: '#314a39', lawn: '#a4cd75', lawnLight: '#b6d98a', lawnDark: '#8dbd65', path: '#e6ce92', pathLight: '#efdaa4', pathEdge: '#b9ad73', leaf: '#588954', leafLight: '#77a663', leafDark: '#3b6c49', wood: '#98765a', water: '#6bb8c0', waterLight: '#97d6d1', waterDark: '#559da9' };
const hash = (x, y, salt = 0) => Math.abs(((x * 374761393 + y * 668265263 + salt * 982451653) ^ (x * y * 127)) % 997) / 997;
const box = (ctx, x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

export class World {
  constructor(canvas, { onStep = () => {}, onInteract = () => {} } = {}) {
    this.canvas = canvas;
    canvas.width = COLS * T; canvas.height = ROWS * T;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.onStep = onStep; this.onInteract = onInteract;
    this.enabled = true; this.night = false; this.facing = 'down';
    this.lastMove = 0; this.animation = 0; this.destroyed = false;
    this.base = document.createElement('canvas');
    this.base.width = canvas.width; this.base.height = canvas.height;
    this.tap = (event) => {
      if (!this.enabled) return;
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * COLS;
      const y = (event.clientY - rect.top) / rect.height * ROWS;
      const target = this.interactions.find((p) => Math.hypot(p.x + .5 - x, p.y + .5 - y) < 1.3 && Math.hypot(p.x - this.x, p.y - this.y) <= 2.2);
      if (target) { this.onInteract({ kind: target.kind, text: target.text }); return; }
      if (Math.hypot(x - this.x - .5, y - this.y - .5) < .7) { this.interact(); return; }
      const dx = x - this.x - .5, dy = y - this.y - .5;
      if (Math.abs(dx) > Math.abs(dy)) this.move(Math.sign(dx), 0);
      else this.move(0, Math.sign(dy));
    };
    canvas.addEventListener('pointerdown', this.tap);
    this.setRegion('meadow');
    this.tick = (now) => {
      if (this.destroyed) return;
      if (now - this.animation > 45) { this.draw(now); this.animation = now; }
      this.frame = requestAnimationFrame(this.tick);
    };
    this.frame = requestAnimationFrame(this.tick);
  }

  setRegion(id) {
    this.region = REGIONS.some((r) => r.id === id) ? id : 'meadow';
    this.cells = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ type: 'ground', blocked: false })));
    this.trees = []; this.houses = []; this.decor = []; this.interactions = []; this.water = [];
    const fill = (x, y, w, h, type, blocked = false) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.cells[j]?.[i]) this.cells[j][i] = { type, blocked };
    };
    const tree = (x, y, kind = 'green') => { this.trees.push({ x, y, kind }); fill(x, y, 2, 2, 'ground', true); };
    const house = (x, y, w, h, color, kind) => { this.houses.push({ x, y, w, h, color, kind }); fill(x, y, w, h, 'ground', true); };
    const prop = (kind, x, y, extra = {}) => { this.decor.push({ kind, x, y, ...extra }); if (extra.blocked !== false) fill(x, y, 1, 1, 'ground', true); };
    for (let x = 0; x < COLS; x += 2) { tree(x, 0); tree(x, 16); }
    for (let y = 2; y < 16; y += 2) { tree(0, y); tree(28, y); }
    if (this.region === 'meadow') {
      fill(2, 9, 26, 3, 'path'); fill(13, 3, 3, 13, 'path');
      fill(5, 8, 3, 2, 'path'); fill(11, 8, 4, 2, 'path'); fill(22, 7, 3, 3, 'path');
      fill(17, 5, 5, 4, 'grass'); fill(18, 12, 4, 3, 'grass'); fill(4, 12, 5, 3, 'grass');
      fill(25, 2, 3, 14, 'water', true); fill(24, 5, 1, 3, 'water', true); fill(24, 13, 1, 3, 'water', true);
      fill(24, 9, 4, 3, 'bridge');
      house(4, 4, 5, 4, 'teal', 'shop'); house(10, 3, 6, 5, 'red', 'heal'); house(21, 3, 4, 4, 'gold', 'home');
      tree(2, 2); tree(8, 2); tree(17, 2); tree(3, 7); tree(10, 13); tree(16, 13);
      prop('sign', 16, 10); prop('mail', 9, 7); prop('bench', 10, 10); prop('flowerpot', 20, 10);
      for (let x = 4; x <= 8; x++) prop('fence', x, 15);
      for (let x = 18; x <= 22; x++) prop('fence', x, 15);
      this.interactions.push({ kind: 'heal', x: 14, y: 9 }, { kind: 'shop', x: 7, y: 8 }, { kind: 'sign', x: 16, y: 10, text: '새빛 마을에 오신 걸 환영해요! 키보드 방향키 또는 WASD로 움직이고, E 또는 스페이스로 이야기해 보세요. 풀숲에서는 야생 빔을 만날 수 있어요.' });
      this.npcs = [{ x: 14, y: 9, palette: 'pink' }, { x: 7, y: 8, palette: 'blue' }, { x: 22, y: 8, palette: 'brown' }];
      this.x = 15; this.y = 10;
    } else if (this.region === 'lake') {
      fill(3, 3, 12, 11, 'water', true); fill(5, 2, 8, 1, 'water', true); fill(2, 6, 1, 5, 'water', true); fill(5, 14, 7, 1, 'water', true);
      fill(14, 3, 3, 2, 'water', true); fill(14, 6, 2, 6, 'water', true);
      fill(16, 9, 12, 2, 'path'); fill(18, 4, 2, 12, 'path'); fill(3, 12, 15, 2, 'bridge');
      fill(21, 4, 5, 4, 'grass'); fill(21, 12, 5, 3, 'grass'); fill(16, 2, 4, 2, 'grass');
      house(20, 2, 5, 4, 'teal', 'home'); tree(25, 2); tree(26, 6); tree(16, 14); tree(20, 14);
      prop('sign', 20, 10); prop('bench', 17, 7); prop('flowerpot', 26, 10); prop('rock', 26, 14);
      this.interactions.push({ kind: 'heal', x: 18, y: 8 }, { kind: 'sign', x: 20, y: 10, text: '잔물결 호수 · 반짝이는 수면을 따라 걷다 보면 새로운 빔을 만날 거예요. 호수 오른쪽 풀숲을 탐험해 보세요.' });
      this.npcs = [{ x: 18, y: 8, palette: 'blue' }];
      this.x = 18; this.y = 10;
    } else {
      fill(13, 3, 4, 13, 'path'); fill(4, 9, 23, 3, 'path'); fill(9, 4, 13, 6, 'stone');
      fill(4, 4, 4, 4, 'grass'); fill(22, 4, 4, 4, 'grass'); fill(5, 12, 6, 3, 'grass'); fill(20, 12, 6, 3, 'grass');
      for (const [x, y] of [[9,4],[20,4],[9,8],[20,8]]) { prop('pillar', x, y); prop('rock', x + 1, y + 1); }
      prop('altar', 14, 4); prop('altar', 15, 4); prop('sign', 17, 11);
      tree(2, 2, 'gold'); tree(7, 2, 'gold'); tree(22, 2, 'gold'); tree(26, 2, 'gold'); tree(2, 13, 'gold'); tree(11, 13, 'gold'); tree(18, 13, 'gold'); tree(26, 13, 'gold');
      this.interactions.push({ kind: 'heal', x: 12, y: 10 }, { kind: 'sign', x: 17, y: 11, text: '황금빛 유적 · 오래전, 빔과 사람은 같은 하늘의 빛을 따라 이곳에 모였다고 해요. 오래된 돌담 주변에서 희귀한 친구를 찾아보세요.' });
      this.npcs = [{ x: 12, y: 10, palette: 'brown' }];
      this.x = 15; this.y = 11;
    }
    for (const npc of this.npcs) this.cells[npc.y][npc.x].blocked = true;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (this.cells[y][x].type === 'water') this.water.push({ x, y });
    this.previous = { x: this.x - 1, y: this.y }; this.from = { x: this.x, y: this.y }; this.lastMove = 0;
    this.paintBase(); this.draw(performance.now());
  }

  paintBase() {
    const ctx = this.base.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    box(ctx, 0, 0, this.base.width, this.base.height, P.lawn);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) this.tile(ctx, x, y, this.cells[y][x].type);
    for (const tree of this.trees) this.tree(ctx, tree);
    for (const house of this.houses) this.house(ctx, house);
    for (const item of this.decor) this.prop(ctx, item);
    for (const npc of this.npcs) this.person(ctx, npc.x * T, npc.y * T, npc.palette, 'down');
  }

  tile(ctx, tx, ty, type) {
    const x = tx * T, y = ty * T, h = hash(tx, ty);
    if (type === 'water') {
      box(ctx, x, y, 32, 32, P.water);
      box(ctx, x + 2, y + 8, 12, 2, P.waterLight); box(ctx, x + 19, y + 24, 10, 2, P.waterDark);
      if (this.cells[ty - 1]?.[tx]?.type !== 'water') { box(ctx, x, y, 32, 4, '#e5d59c'); box(ctx, x, y + 4, 32, 3, P.waterDark); }
      if (this.cells[ty]?.[tx - 1]?.type !== 'water') { box(ctx, x, y, 4, 32, '#e5d59c'); box(ctx, x + 4, y, 2, 32, P.waterDark); }
      return;
    }
    if (type === 'path' || type === 'bridge' || type === 'stone') {
      box(ctx, x, y, 32, 32, type === 'stone' ? '#c4c6a4' : P.path);
      if (type === 'bridge') {
        box(ctx, x, y, 32, 32, '#b68b60');
        for (let j = 0; j < 32; j += 8) { box(ctx, x, y + j, 32, 2, '#88684c'); box(ctx, x + 2, y + j + 2, 28, 2, '#d9b782'); }
        for (const side of [-1, 1]) if (this.cells[ty + side]?.[tx]?.type !== 'bridge') { box(ctx, x, y + (side < 0 ? 0 : 26), 32, 6, '#745e49'); box(ctx, x, y + (side < 0 ? 0 : 26), 32, 2, '#e6ca95'); }
      } else {
        for (let i = 0; i < 4; i++) { const r = hash(tx, ty, i + 7); box(ctx, x + 2 + Math.floor(r * 13) * 2, y + 2 + Math.floor(hash(ty, tx, i + 3) * 13) * 2, 2 + (i % 2) * 2, 2, type === 'stone' ? '#a6b494' : i % 2 ? '#d4bd80' : P.pathLight); }
        if (type === 'stone') { box(ctx, x, y + 28, 32, 2, '#a4ad92'); box(ctx, x + (ty % 2 ? 20 : 8), y, 2, 28, '#a4ad92'); }
        for (const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
          const next = this.cells[ty + dy]?.[tx + dx]?.type;
          if (next === 'ground' || next === 'grass') {
            box(ctx, x + (dx === 1 ? 30 : 0), y + (dy === 1 ? 30 : 0), dx ? 2 : 32, dy ? 2 : 32, P.pathEdge);
          }
        }
      }
      return;
    }
    box(ctx, x, y, 32, 32, h > .8 ? '#a7ce78' : P.lawn);
    for (let i = 0; i < 3; i++) {
      const sx = x + 2 + Math.floor(hash(tx, ty, i + 9) * 12) * 2, sy = y + 4 + Math.floor(hash(ty, tx, i + 18) * 11) * 2;
      box(ctx, sx, sy, 4, 2, P.lawnDark); box(ctx, sx + 2, sy - 2, 2, 2, P.lawnLight);
    }
    if (type === 'grass') {
      box(ctx, x, y, 32, 32, '#81b566');
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const sx = x + i * 16, sy = y + j * 16;
        box(ctx, sx + 2, sy + 10, 12, 4, '#538a51'); box(ctx, sx + 2, sy + 6, 2, 6, '#588d50'); box(ctx, sx + 6, sy + 2, 2, 10, '#4c8050'); box(ctx, sx + 10, sy + 6, 2, 6, '#4c8050');
        box(ctx, sx + 4, sy + 5, 2, 6, '#b0d780'); box(ctx, sx + 8, sy + 8, 2, 4, '#a6d17b'); box(ctx, sx + 12, sy + 3, 2, 8, '#9aca70');
      }
    } else if (h > .74 && !this.cells[ty][tx].blocked) {
      const color = h > .9 ? '#faf1bc' : '#eaa4a0';
      for (let i = 0; i < 2; i++) { const sx = x + 8 + i * 12, sy = y + 8 + (i % 2) * 10; box(ctx, sx, sy + 4, 2, 6, '#598753'); box(ctx, sx - 2, sy, 6, 4, color); box(ctx, sx, sy, 2, 2, '#f4d46e'); }
    }
  }

  tree(ctx, { x, y, kind }) {
    x *= T; y *= T;
    const gold = kind === 'gold' || (this.region === 'ruins' && hash(x, y) > .5);
    const dark = gold ? '#8c8050' : '#365e43', middle = gold ? '#b7a55f' : P.leaf, light = gold ? '#d1bb75' : P.leafLight;
    box(ctx, x + 10, y + 51, 46, 10, '#89b367');
    box(ctx, x + 26, y + 41, 14, 19, P.outline); box(ctx, x + 30, y + 45, 6, 14, '#ae8b61');
    box(ctx, x + 10, y + 12, 44, 34, dark); box(ctx, x + 4, y + 22, 56, 22, dark); box(ctx, x + 16, y + 4, 32, 10, dark); box(ctx, x + 22, y, 20, 8, dark);
    box(ctx, x + 12, y + 10, 40, 28, middle); box(ctx, x + 8, y + 22, 48, 14, middle); box(ctx, x + 20, y + 4, 24, 12, middle);
    box(ctx, x + 18, y + 8, 20, 8, light); box(ctx, x + 12, y + 18, 14, 6, light); box(ctx, x + 30, y + 18, 14, 6, light); box(ctx, x + 8, y + 28, 10, 6, light);
    box(ctx, x + 44, y + 28, 8, 10, dark); box(ctx, x + 22, y + 36, 12, 6, dark); box(ctx, x + 34, y + 30, 8, 4, light);
    box(ctx, x + 24, y + 2, 12, 4, gold ? '#e4ce89' : '#97ba75');
  }

  house(ctx, { x, y, w, h, color, kind }) {
    x *= T; y *= T; w *= T; h *= T;
    const roof = color === 'red' ? ['#a35f51','#cf7c60','#e69b76'] : color === 'teal' ? ['#3e7771','#5f9b8d','#8ab9a0'] : ['#a3874f','#d4b266','#e9cc87'];
    box(ctx, x + 6, y + h - 12, w - 2, 18, '#85ae65');
    box(ctx, x + 8, y + 32, w - 16, h - 32, P.outline); box(ctx, x + 12, y + 38, w - 24, h - 44, '#ecddb2');
    for (let j = 64; j < h - 6; j += 14) { box(ctx, x + 12, y + j, w - 24, 2, '#d1bd91'); for (let i = 20 + (j % 28 ? 0 : 12); i < w - 20; i += 28) box(ctx, x + i, y + j - 10, 2, 10, '#d6c49b'); }
    box(ctx, x + 4, y + 24, w - 8, 36, P.outline); box(ctx, x + 12, y + 8, w - 24, 18, P.outline); box(ctx, x + 20, y + 2, w - 40, 8, P.outline);
    box(ctx, x + 8, y + 28, w - 16, 24, roof[0]); box(ctx, x + 16, y + 12, w - 32, 18, roof[1]); box(ctx, x + 24, y + 6, w - 48, 8, roof[2]);
    for (let j = 18; j < 50; j += 10) { box(ctx, x + 14, y + j, w - 28, 2, roof[2]); for (let i = 20 + (j % 20 ? 0 : 10); i < w - 16; i += 24) box(ctx, x + i, y + j + 2, 2, 7, roof[0]); }
    box(ctx, x + 4, y + 52, w - 8, 6, roof[0]); box(ctx, x + 8, y + 58, w - 16, 4, '#a49170');
    const door = x + Math.floor(w / 2) - 12;
    box(ctx, door - 4, y + h - 42, 32, 42, '#957d5b'); box(ctx, door, y + h - 38, 24, 36, '#485b55'); box(ctx, door + 4, y + h - 34, 16, 16, '#84b6b2'); box(ctx, door + 16, y + h - 14, 4, 4, '#f1d78f');
    box(ctx, door - 6, y + h - 2, 36, 6, '#d8c393');
    for (const wx of [x + 24, x + w - 48]) {
      box(ctx, wx - 4, y + 76, 32, 30, '#9b8867'); box(ctx, wx, y + 80, 24, 22, '#6a9b9c'); box(ctx, wx + 2, y + 82, 8, 8, '#b0d3c5'); box(ctx, wx + 11, y + 80, 2, 22, '#ece1b7'); box(ctx, wx, y + 90, 24, 2, '#ece1b7'); box(ctx, wx - 4, y + 104, 32, 4, '#ac9167');
    }
    if (kind === 'heal') { box(ctx, x + w / 2 - 14, y + 64, 28, 26, '#fff1c9'); box(ctx, x + w / 2 - 4, y + 68, 8, 18, '#c97461'); box(ctx, x + w / 2 - 9, y + 73, 18, 8, '#c97461'); }
    if (kind === 'shop') { box(ctx, x + w / 2 - 15, y + 64, 30, 22, '#f4e3ad'); box(ctx, x + w / 2 - 7, y + 69, 14, 12, '#5b8b76'); box(ctx, x + w / 2 - 3, y + 66, 6, 4, '#5b8b76'); }
    box(ctx, x + w - 40, y - 2, 18, 24, '#8d7560'); box(ctx, x + w - 42, y - 4, 22, 6, '#b69d7b');
  }

  prop(ctx, { kind, x, y }) {
    x *= T; y *= T;
    if (kind === 'fence') { box(ctx, x, y + 12, 32, 5, '#8e7955'); box(ctx, x, y + 22, 32, 4, '#aa8d5f'); box(ctx, x + 4, y + 4, 6, 26, '#9d8055'); box(ctx, x + 4, y + 4, 4, 22, '#dfc896'); }
    if (kind === 'sign') { box(ctx, x + 14, y + 15, 5, 16, '#836b4e'); box(ctx, x + 3, y + 3, 27, 18, '#775f49'); box(ctx, x + 5, y + 5, 23, 12, '#e6d6a1'); box(ctx, x + 9, y + 8, 15, 2, '#9c8a62'); box(ctx, x + 9, y + 12, 10, 2, '#9c8a62'); }
    if (kind === 'bench') { box(ctx, x + 2, y + 6, 28, 8, '#97704e'); box(ctx, x, y + 16, 32, 7, '#b48b5f'); box(ctx, x + 4, y + 23, 4, 7, '#5b6251'); box(ctx, x + 24, y + 23, 4, 7, '#5b6251'); box(ctx, x + 2, y + 16, 28, 2, '#e0be85'); }
    if (kind === 'mail') { box(ctx, x + 15, y + 15, 4, 15, '#8d7858'); box(ctx, x + 5, y + 5, 23, 15, '#547f83'); box(ctx, x + 8, y + 3, 17, 4, '#76a2a1'); box(ctx, x + 9, y + 9, 14, 3, '#d2dfc0'); }
    if (kind === 'flowerpot') { box(ctx, x + 6, y + 18, 22, 11, '#a77955'); box(ctx, x + 4, y + 16, 26, 5, '#c29364'); for (let i = 0; i < 3; i++) { box(ctx, x + 8 + i * 7, y + 8, 3, 12, '#578554'); box(ctx, x + 5 + i * 7, y + 5 + i % 2 * 3, 8, 6, i % 2 ? '#edbd82' : '#e59c95'); } }
    if (kind === 'rock') { box(ctx, x + 3, y + 14, 27, 14, '#84907a'); box(ctx, x + 7, y + 8, 19, 17, '#abb69b'); box(ctx, x + 10, y + 6, 12, 6, '#c6cbb0'); box(ctx, x + 9, y + 12, 7, 4, '#d3d2b6'); }
    if (kind === 'pillar') { box(ctx, x + 4, y + 25, 26, 7, '#7e8b77'); box(ctx, x + 8, y - 14, 18, 40, '#aeb59b'); box(ctx, x + 10, y - 12, 5, 36, '#d2cfad'); box(ctx, x + 20, y - 12, 4, 36, '#929f86'); box(ctx, x + 4, y - 19, 26, 8, '#c3c6a4'); box(ctx, x + 8, y - 21, 18, 3, '#dbd6b4'); box(ctx, x + 20, y + 3, 8, 5, '#719268'); }
    if (kind === 'altar') { box(ctx, x, y + 4, 32, 28, '#8e967c'); box(ctx, x + 2, y, 28, 24, '#b6b696'); box(ctx, x + 4, y + 2, 24, 4, '#d8cfa5'); box(ctx, x + 12, y + 9, 8, 8, '#d4b15e'); box(ctx, x + 14, y + 7, 4, 12, '#ead58b'); }
  }

  person(ctx, x, y, palette, facing = 'down', step = 0) {
    const player = palette === 'player';
    const hat = player ? '#d77755' : palette === 'pink' ? '#d28e99' : palette === 'blue' ? '#5b929f' : '#ab946a';
    const shirt = player ? '#ddaa66' : palette === 'pink' ? '#f1e2ca' : palette === 'blue' ? '#8db7a9' : '#a88a61';
    box(ctx, x + 7, y + 27, 20, 5, '#7d9d61');
    const foot = step % 2 ? 2 : 0;
    box(ctx, x + 9, y + 23, 6, 7 - foot, '#3d5653'); box(ctx, x + 20, y + 23, 6, 5 + foot, '#3d5653');
    box(ctx, x + 8, y + 15, 19, 10, '#5c5c48'); box(ctx, x + 10, y + 15, 15, 9, shirt);
    box(ctx, x + 7, y + 16, 4, 7, '#edc293'); box(ctx, x + 25, y + 16, 3, 7, '#edc293');
    box(ctx, x + 10, y + 5, 15, 13, '#695a45'); box(ctx, x + 12, y + 8, 12, 10, '#f2cf9a');
    if (facing !== 'up') { const sx = facing === 'left' ? -2 : facing === 'right' ? 2 : 0; box(ctx, x + 14 + sx, y + 11, 2, 3, '#414d3d'); box(ctx, x + 21 + sx, y + 11, 2, 3, '#414d3d'); }
    else { box(ctx, x + 11, y + 9, 14, 8, '#756046'); box(ctx, x + 12, y + 17, 12, 8, '#b47c52'); box(ctx, x + 14, y + 18, 8, 5, '#d09d65'); }
    box(ctx, x + 9, y + 2, 18, 7, '#805e45'); box(ctx, x + 11, y, 14, 4, hat); box(ctx, x + 10, y + 3, 17, 5, hat);
    box(ctx, x + (facing === 'left' ? 6 : 13), y + 7, 16, 3, player ? '#ac5c48' : hat);
    if (player) box(ctx, x + 12, y + 2, 5, 3, '#f0c385');
  }

  follower(ctx, x, y, now) {
    const bob = Math.floor(now / 400) % 2 * 2;
    box(ctx, x + 8, y + 26, 20, 4, '#7d9d61');
    box(ctx, x + 8, y + 15 - bob, 20, 13, '#9d996d'); box(ctx, x + 10, y + 13 - bob, 16, 13, '#f0e1a4');
    box(ctx, x + 8, y + 7 - bob, 5, 12, '#e9ce8a'); box(ctx, x + 23, y + 7 - bob, 5, 12, '#e9ce8a'); box(ctx, x + 10, y + 8 - bob, 2, 5, '#c58c7c'); box(ctx, x + 24, y + 8 - bob, 2, 5, '#c58c7c');
    box(ctx, x + 13, y + 18 - bob, 2, 3, '#4c6150'); box(ctx, x + 22, y + 18 - bob, 2, 3, '#4c6150'); box(ctx, x + 17, y + 23 - bob, 3, 2, '#bd9273'); box(ctx, x + 28, y + 18 - bob, 4, 6, '#f0e1a4');
  }

  draw(now = performance.now()) {
    const ctx = this.ctx;
    ctx.drawImage(this.base, 0, 0);
    const wave = Math.floor(now / 480) % 3;
    for (const { x, y } of this.water) {
      if (hash(x, y) < .7) { const sx = x * T + 10 + wave * 3, sy = y * T + 16; box(ctx, sx, sy, 10, 2, P.waterLight); box(ctx, sx + 4, sy + 2, 8, 2, '#7bc6ca'); }
    }
    const t = Math.min(1, Math.max(0, (now - this.lastMove) / 130));
    const px = (this.from.x + (this.x - this.from.x) * t) * T;
    const py = (this.from.y + (this.y - this.from.y) * t) * T;
    this.follower(ctx, this.previous.x * T, this.previous.y * T, now);
    this.person(ctx, px, py, 'player', this.facing, t < 1 ? Math.floor(t * 4) : 0);
    if (this.night) { box(ctx, 0, 0, this.canvas.width, this.canvas.height, 'rgba(27, 44, 79, .30)'); }
    for (let i = 0; i < 7; i++) {
      const x = (i * 149 + now / (55 + i * 3)) % this.canvas.width;
      const y = (i * 83 + Math.sin(now / 1800 + i) * 20) % this.canvas.height;
      box(ctx, Math.floor(x / 2) * 2, Math.floor(y / 2) * 2, 2, 2, this.night ? '#e9dc9b' : 'rgba(255, 247, 194, .7)');
    }
  }

  move(dx, dy) {
    if (!this.enabled || !Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) + Math.abs(dy) !== 1) return false;
    this.facing = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
    const x = this.x + dx, y = this.y + dy;
    if (!this.cells[y]?.[x] || this.cells[y][x].blocked) { this.draw(); return false; }
    this.from = { x: this.x, y: this.y }; this.previous = { ...this.from }; this.x = x; this.y = y; this.lastMove = performance.now();
    this.onStep({ x, y, terrain: this.cells[y][x].type === 'grass' ? 'grass' : 'path', region: this.region });
    return true;
  }

  interact() {
    if (!this.enabled) return false;
    const nearby = this.interactions.filter((p) => Math.hypot(p.x - this.x, p.y - this.y) <= 2.2).sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
    if (!nearby.length) return false;
    const { kind, text } = nearby[0]; this.onInteract({ kind, text }); return true;
  }

  setEnabled(value) { this.enabled = Boolean(value); }
  setNight(value) { this.night = Boolean(value); this.draw(); }
  getPosition() { return { x: this.x, y: this.y, region: this.region }; }
  setPosition({ x, y, region } = {}) {
    if (region && region !== this.region) this.setRegion(region);
    if (Number.isInteger(x) && Number.isInteger(y) && this.cells[y]?.[x] && !this.cells[y][x].blocked) {
      this.x = x; this.y = y; this.from = { x, y }; this.previous = { x, y }; this.lastMove = 0; this.draw();
    }
  }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.frame); this.canvas.removeEventListener('pointerdown', this.tap); }
}
