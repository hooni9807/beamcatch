// Original BeamRPG / spin-tt portraits; Beamcatch names for evolutions and variants.
export const TYPE_STRENGTHS = {
  불꽃: '풀', 풀: '물', 물: '불꽃', 전기: '바람', 바람: '강철',
  강철: '얼음', 얼음: '전기', 빛: '그림자', 그림자: '꿈', 꿈: '빛',
};
export const FORM_LABELS = { base: '기본형', evolved: '진화형', variant: '희귀 변종' };

const BASE_CREATURES = [
  {
    id: 'heebeom', no: 1, name: '희범', type: '빛', color: '#e8b74f',
    image: './assets/heebeom-face.png',
    description: '작은 라켓에 큰 꿈을 담은 첫 번째 친구. 낯선 길에서도 한 걸음씩 씩씩하게 나아간다.',
    baseHp: 48, attack: 12, rarity: 'common', habitats: ['meadow'], emblem: '☀', move: '새빛 드라이브',
  },
  {
    id: 'ajae', no: 2, name: '아재범', type: '풀', color: '#85aa66',
    image: './assets/ajae-face.png',
    description: '풀숲의 산책길을 누구보다 잘 안다. 배낭에는 간식이 가득하고, 말싸움에는 좀처럼 지지 않는다.',
    baseHp: 54, attack: 11, rarity: 'common', habitats: ['meadow', 'ruins'], emblem: '♧', move: '덩굴 엣지',
  },
  {
    id: 'sleepy', no: 3, name: '꿀잠범', type: '꿈', color: '#b29acb',
    image: './assets/sleepy-face.png',
    description: '포근한 풀밭이나 호숫가에서 낮잠을 잔다. 잠결에도 날아오는 공을 되받아치는 재주가 있다.',
    baseHp: 58, attack: 10, rarity: 'common', habitats: ['meadow', 'lake'], emblem: '☾', move: '잠꼬대 리턴',
  },
  {
    id: 'leesin', no: 4, name: '리신범', type: '불꽃', color: '#d88062',
    image: './assets/leesin-face.png',
    description: '고요한 유적에서 수련하는 열혈 친구. 기합 한 번에 불꽃 같은 포핸드가 터져 나온다.',
    baseHp: 46, attack: 16, rarity: 'rare', habitats: ['ruins'], emblem: '♨', move: '용의 드라이브',
  },
  {
    id: 'percival', no: 5, name: '퍼시벌', type: '그림자', color: '#8b8cb5',
    image: './assets/percival-face.png',
    description: '달빛 아래 유적에서 활짝 웃는 장난꾸러기. 왼손으로 만들어 낸 회전은 누구도 쉽게 읽지 못한다.',
    baseHp: 44, attack: 15, rarity: 'rare', habitats: ['ruins'], emblem: '◆', move: '그림자 왼손',
  },
  {
    id: 'hugo', no: 6, name: '휴고범', type: '물', color: '#6f9fab',
    image: './assets/hugo-face.png',
    description: '잔잔한 호수 곁에 살지만 백핸드는 파도처럼 거세다. 마음을 연 친구에게는 누구보다 든든하다.',
    baseHp: 52, attack: 13, rarity: 'common', habitats: ['lake'], emblem: '≈', move: '파도 백핸드',
  },
  {
    id: 'drunk', no: 7, name: '만취범', type: '전기', color: '#d5ae60',
    image: './assets/drunk-face.png',
    description: '호숫가를 비틀비틀 걷다가도 번개 같은 한 방을 날린다. 종잡을 수 없는 박자가 매력인 친구.',
    baseHp: 50, attack: 14, rarity: 'common', habitats: ['lake'], emblem: 'ϟ', move: '번개 박자',
  },
  {
    id: 'jongryeong', no: 8, name: '빽종령', type: '강철', color: '#a69ac4',
    image: './assets/jongryeong-face.png',
    description: '둥근 안경 너머로 공의 길을 읽는 백핸드 장인. 단단한 블록으로 친구들이 지나갈 길을 지킨다.',
    baseHp: 56, attack: 12, rarity: 'common', habitats: ['ruins'], emblem: '▣', move: '철벽 백블록',
  },
  {
    id: 'seohyun', no: 9, name: '김서현', type: '바람', color: '#83bca5',
    image: './assets/seohyun-face.png',
    description: '바람이 불수록 맞드라이브가 빨라지는 친구. 짧게 떨어지는 커트 서브로 랠리의 시작을 알린다.',
    baseHp: 47, attack: 15, rarity: 'common', habitats: ['meadow', 'lake'], emblem: '≋', move: '질풍 맞드라이브',
  },
  {
    id: 'songstar', no: 10, name: '송스타', type: '얼음', color: '#91cbd4',
    image: './assets/songstar-face.png',
    description: '차분한 호숫가에서 커트 수비를 연습한다. 길게 이어지는 랠리도 서늘한 미소로 받아 낸다.',
    baseHp: 59, attack: 10, rarity: 'common', habitats: ['lake'], emblem: '❄', move: '서리 롱커트',
  },
  {
    id: 'ttalgak', no: 11, name: '딸각세', type: '전기', color: '#dfb35c',
    image: './assets/ttalgak-face.png',
    description: '라켓을 딸각 울리면 번개 같은 서브가 시작된다. 풀잎 사이로 튀는 공의 회전이 누구보다 날카롭다.',
    baseHp: 45, attack: 16, rarity: 'common', habitats: ['meadow'], emblem: 'ϟ', move: '딸각 스핀서브',
  },
  {
    id: 'yunhwan', no: 12, name: '카사노바 윤', type: '물', color: '#70b8ad',
    image: './assets/yunhwan-face.png',
    description: '물결을 깎듯 정교한 커트를 구사한다. 호숫가 친구들에게 부드러운 회전을 가르쳐 주는 인기쟁이.',
    baseHp: 53, attack: 12, rarity: 'common', habitats: ['lake'], emblem: '≈', move: '물결 커트',
  },
];

const EVOLUTIONS = {
  heebeom: { name: '챔피언 희범', emblem: '♛', move: '황금빛 결승타',
    description: '수많은 랠리를 지나 마침내 빛의 챔피언이 되었다. 작은 라켓에 모인 응원이 황금 궤적을 그린다.' },
  ajae: { name: '숲지기 아재범', emblem: '♣', move: '거목 수비진',
    description: '풀숲의 모든 산책길을 지키는 숲지기. 든든한 수비로 어린 친구들의 연습 상대가 되어 준다.' },
  sleepy: { name: '꿈지기 꿀잠범', emblem: '☽', move: '꿈결 무한랠리',
    description: '꿈속에서도 한 번도 공을 놓치지 않는 경지에 올랐다. 포근한 구름 위에서 끝없는 랠리를 이어 간다.' },
  leesin: { name: '용권 리신범', emblem: '♜', move: '화룡 스매싱',
    description: '유적에서 단련한 회전이 불꽃 용처럼 솟구친다. 힘찬 기합과 함께 한계 너머의 스매싱을 날린다.' },
  percival: { name: '월영 퍼시벌', emblem: '◈', move: '월영 역회전',
    description: '보름달 아래 그림자를 두른 왼손의 기사. 달빛과 함께 휘어지는 회전은 마지막 순간에 방향을 바꾼다.' },
  hugo: { name: '해일 휴고범', emblem: '≋', move: '대해일 백드라이브',
    description: '백핸드 한 번으로 호수 전체에 파문을 일으킨다. 동료를 지킬 때 가장 큰 물결이 솟아오른다.' },
  drunk: { name: '뇌격 만취범', emblem: '↯', move: '천둥 불규칙타',
    description: '종잡을 수 없던 박자가 천둥의 리듬으로 완성되었다. 비틀거리는 스텝 끝에 강렬한 번개가 터진다.' },
  jongryeong: { name: '철벽 빽종령', emblem: '▦', move: '성채 백스매시',
    description: '백핸드 수비가 성벽처럼 견고해졌다. 안경을 고쳐 쓰는 순간 날아오는 공들이 하나씩 되돌아간다.' },
  seohyun: { name: '태풍 서현', emblem: '≋', move: '태풍 맞드라이브',
    description: '맞드라이브를 주고받을수록 거대한 바람이 모인다. 짧은 서브 뒤에 폭풍 같은 랠리를 이어 간다.' },
  songstar: { name: '빙벽 송스타', emblem: '❆', move: '빙벽 롱디펜스',
    description: '긴 커트 수비가 투명한 얼음 성벽처럼 펼쳐진다. 서두르지 않는 호흡으로 어떤 랠리도 끝까지 지킨다.' },
  ttalgak: { name: '서브왕 딸각세', emblem: '♔', move: '왕의 낙뢰서브',
    description: '딸각 소리 하나로 서브의 왕임을 알린다. 작은 손목 회전이 코트 끝까지 번개 궤적을 남긴다.' },
  yunhwan: { name: '회전군주 윤', emblem: '♚', move: '소용돌이 왕커트',
    description: '잔잔한 물결을 거대한 소용돌이로 바꾸는 회전의 군주. 여유로운 미소 뒤에 정교한 커트를 숨겼다.' },
};

const VARIANTS = {
  heebeom: { name: '흑야 희범', type: '그림자', color: '#9292bf', emblem: '✦', move: '흑야 스핀', habitats: ['ruins'],
    description: '낮에도 짙은 그늘이 드리운 유적에 나타나는 희범. 검은 빛의 회전이 라켓 끝에서 조용히 번진다.' },
  ajae: { name: '빙하 아재범', type: '얼음', color: '#a0d8df', emblem: '❄', move: '빙하 엣지', habitats: ['lake'],
    description: '밤 호수의 찬 공기를 모은 드문 아재범. 배낭 속 간식도 차갑게 보관하며 얼음처럼 단단한 엣지를 친다.' },
  sleepy: { name: '햇살 꿀잠범', type: '빛', color: '#eacb70', emblem: '☀', move: '햇살 낮잠타', habitats: ['meadow'],
    description: '따뜻한 낮 햇살을 잔뜩 머금은 꿀잠범. 잠결의 리턴이 작은 햇빛 조각처럼 반짝인다.' },
  leesin: { name: '서리 리신범', type: '얼음', color: '#9cc9de', emblem: '❆', move: '빙룡 드라이브', habitats: ['ruins'],
    description: '차가운 밤 유적에서 수련하다 서리를 두르게 되었다. 뜨거운 기합과 달리 라켓에는 얼음 결정이 맺힌다.' },
  percival: { name: '백광 퍼시벌', type: '빛', color: '#e9d28d', emblem: '✧', move: '백광 왼손회전', habitats: ['meadow'],
    description: '햇빛이 가장 환한 날 풀숲에 모습을 드러낸다. 왼손 라켓에서 그림자 대신 밝은 빛의 고리가 피어난다.' },
  hugo: { name: '월몽 휴고범', type: '꿈', color: '#bea2d4', emblem: '☾', move: '몽환 백핸드', habitats: ['lake'],
    description: '밤 호수에 비친 달을 따라 꿈의 속성을 얻었다. 백핸드가 물결 대신 부드러운 꿈결을 일으킨다.' },
  drunk: { name: '화염 만취범', type: '불꽃', color: '#e48b67', emblem: '♨', move: '불꽃 엇박자', habitats: ['meadow'],
    description: '한낮의 따뜻한 풀밭에서 만나는 불꽃의 변종. 엇박자 스텝마다 작은 불씨가 둥글게 튄다.' },
  jongryeong: { name: '밤안개 빽종령', type: '그림자', color: '#9e93ba', emblem: '◆', move: '안개 백블록', habitats: ['meadow'],
    description: '밤안개가 내린 풀숲에서 조용히 연습한다. 안경에 비친 달빛이 사라지면 그림자 블록이 날아온다.' },
  seohyun: { name: '섬광 서현', type: '전기', color: '#e2c663', emblem: 'ϟ', move: '섬광 맞드라이브', habitats: ['lake'],
    description: '호수 수면의 낮 반짝임을 따라 달리는 변종. 맞드라이브가 번개처럼 번쩍이며 물 위를 가른다.' },
  songstar: { name: '꿈결 송스타', type: '꿈', color: '#bda1cc', emblem: '☾', move: '꿈결 롱커트', habitats: ['ruins'],
    description: '고요한 밤 유적에서 꿈속의 랠리를 펼친다. 아주 느려 보이는 커트도 어느새 라켓 앞으로 되돌아온다.' },
  ttalgak: { name: '순풍 딸각세', type: '바람', color: '#98c9ab', emblem: '≋', move: '순풍 회전서브', habitats: ['meadow'],
    description: '산들바람이 부는 낮에만 나타나는 서브 장인. 딸각 소리를 타고 바람이 공을 살짝 밀어 준다.' },
  yunhwan: { name: '야화 카사노바 윤', type: '풀', color: '#9bb779', emblem: '♧', move: '야화 꽃잎커트', habitats: ['ruins'],
    description: '밤 유적에 피는 꽃향기를 따라온 희귀한 친구. 부드러운 커트가 흩날리는 꽃잎을 빙글빙글 돌린다.' },
};

export const CREATURES = [
  ...BASE_CREATURES.map(base => ({
    ...base, family: base.id, form: 'base', activeTime: 'any',
    encounterWeight: base.rarity === 'rare' ? 0.45 : 1,
    evolvesTo: `${base.id}-evolved`, evolutionLevel: 10,
  })),
  ...BASE_CREATURES.map(base => ({
    ...base, ...EVOLUTIONS[base.id], id: `${base.id}-evolved`, no: base.no + 12,
    family: base.id, form: 'evolved', evolvedFrom: base.id,
    baseHp: base.baseHp + 12, attack: base.attack + 4,
    rarity: 'rare', habitats: [], encounterWeight: 0, activeTime: 'any',
  })),
  ...BASE_CREATURES.map(base => ({
    ...base, ...VARIANTS[base.id], id: `${base.id}-variant`, no: base.no + 24,
    family: base.id, form: 'variant', baseHp: base.baseHp + 4, attack: base.attack + 2,
    rarity: 'rare', encounterWeight: 0.12, activeTime: base.no % 2 ? 'day' : 'night',
  })),
];
