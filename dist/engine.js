import { CREATURES } from './creatures.js';

const STORAGE_KEY = 'beamcatch-v1';
const SPECIES = new Map(CREATURES.map(creature => [creature.id, creature]));
const REGIONS = ['meadow', 'lake', 'ruins'];
const BOX_LIMIT = 500;
const HOME = { x: 15, y: 10, region: 'meadow' };
const hpFor = (speciesId, level) => SPECIES.get(speciesId).baseHp + level * 3;
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const validPosition = position => position && REGIONS.includes(position.region)
  && integer(position.x, 0, 29) && integer(position.y, 0, 17);

function initialState() {
  const maxHp = hpFor('heebeom', 5);
  return {
    version: 1,
    party: [{ uid: 'beam-1', speciesId: 'heebeom', level: 5, hp: maxHp, maxHp, xp: 0 }],
    box: [],
    collection: ['heebeom'], seen: ['heebeom'], activeUid: 'beam-1', nextUid: 2,
    balls: 12, potions: 3, coins: 120, steps: 0, caught: 0, questClaimed: false,
    position: { ...HOME },
  };
}

function readState(storage) {
  try {
    const data = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (!data || data.version !== 1 || !Array.isArray(data.party)
      || data.party.length < 1 || data.party.length > 6 || !validPosition(data.position)) return null;
    const box = data.box === undefined ? [] : data.box;
    if (!Array.isArray(box) || box.length > BOX_LIMIT) return null;
    const members = [...data.party, ...box];
    if (!members.every(member => member && /^beam-[1-9]\d*$/.test(member.uid)
      && typeof member.uid === 'string' && member.uid.length < 24 && SPECIES.has(member.speciesId)
      && integer(member.level, 1, 100) && member.maxHp === hpFor(member.speciesId, member.level)
      && integer(member.hp, 0, member.maxHp) && integer(member.xp, 0, member.level * 12 - 1))) return null;
    if (new Set(members.map(member => member.uid)).size !== members.length
      || !data.party.some(member => member.uid === data.activeUid)) return null;
    for (const key of ['collection', 'seen']) {
      if (!Array.isArray(data[key]) || data[key].length > CREATURES.length
        || !data[key].every(id => SPECIES.has(id)) || new Set(data[key]).size !== data[key].length) return null;
    }
    if (!members.every(member => data.collection.includes(member.speciesId))
      || !data.collection.every(id => data.seen.includes(id))) return null;
    if (!['balls', 'potions', 'coins', 'steps', 'caught'].every(key => integer(data[key], 0, 1e9))) return null;
    if (!integer(data.nextUid, 2, 1e9)
      || members.some(member => Number(member.uid.slice(5)) >= data.nextUid)
      || (data.questClaimed !== undefined && typeof data.questClaimed !== 'boolean')) return null;
    const cleanMembers = members.map(({ uid, speciesId, level, hp, maxHp, xp }) => ({ uid, speciesId, level, hp, maxHp, xp }));
    return {
      version: 1,
      party: cleanMembers.slice(0, data.party.length), box: cleanMembers.slice(data.party.length),
      collection: [...data.collection], seen: [...data.seen], activeUid: data.activeUid,
      nextUid: data.nextUid, balls: data.balls, potions: data.potions, coins: data.coins,
      steps: data.steps, caught: data.caught, questClaimed: data.questClaimed ?? false,
      position: { x: data.position.x, y: data.position.y, region: data.position.region },
    };
  } catch {
    return null;
  }
}

export function catchChance(enemy, creature) {
  const weakened = 1 - Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
  return Math.min(0.92, (creature.rarity === 'rare' ? 0.14 : 0.3) + weakened * 0.62);
}

export class Game {
  constructor(options = {}) {
    this.random = options.random ?? Math.random;
    try {
      this.storage = options.storage === undefined ? globalThis.localStorage : options.storage;
    } catch {
      this.storage = null;
    }
    this.state = readState(this.storage) ?? initialState();
    this.battle = null;
  }

  active() {
    return this.state.party.find(member => member.uid === this.state.activeUid);
  }

  save() {
    try {
      if (!this.storage) return false;
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      return true;
    } catch {
      return false;
    }
  }

  encounter(region = this.state.position.region) {
    if (this.battle) return { type: 'error', message: '먼저 눈앞의 친구와 만남을 마쳐 주세요.', ended: false };
    if (!REGIONS.includes(region)) return { type: 'error', message: '이곳에서는 친구를 만날 수 없어요.', ended: false };
    if (this.active().hp <= 0) this.heal();
    const candidates = CREATURES.filter(creature => creature.habitats.includes(region));
    const total = candidates.reduce((sum, creature) => sum + (creature.rarity === 'rare' ? 0.45 : 1), 0);
    let roll = this.random() * total;
    const creature = candidates.find(candidate => (roll -= candidate.rarity === 'rare' ? 0.45 : 1) < 0) ?? candidates.at(-1);
    const level = ({ meadow: 3, lake: 5, ruins: 7 })[region] + Math.floor(this.random() * 4);
    const maxHp = hpFor(creature.id, level);
    this.battle = { enemy: { speciesId: creature.id, level, hp: maxHp, maxHp }, turn: 0 };
    if (!this.state.seen.includes(creature.id)) this.state.seen.push(creature.id);
    this.save();
    return { type: 'encounter', message: `야생의 ${creature.name}${particle(creature.name, '이', '가')} 나타났다!`, ended: false };
  }

  action(kind) {
    const member = this.active();
    const friend = SPECIES.get(member.speciesId);
    let message;
    if (kind === 'potion') {
      if (this.state.potions < 1) return { type: 'error', message: '회복약이 없어요. 보급 상점에서 채워 주세요.', ended: !this.battle };
      if (member.hp === member.maxHp) return { type: 'info', message: '이미 기운이 가득해요!', ended: !this.battle };
      const recovered = Math.min(35, member.maxHp - member.hp);
      this.state.potions -= 1;
      member.hp += recovered;
      message = `회복약으로 ${friend.name}의 HP를 ${recovered} 회복했어요.`;
      if (!this.battle) {
        this.save();
        return { type: 'potion', message, ended: true };
      }
    }
    if (!this.battle) return { type: 'info', message: '풀숲을 걸으며 새로운 친구를 찾아보세요.', ended: true };
    const { enemy } = this.battle;
    const creature = SPECIES.get(enemy.speciesId);

    if (kind === 'run') {
      this.battle = null;
      this.save();
      return { type: 'run', message: '무사히 돌아왔다. 다음 만남을 기다려 보자!', ended: true };
    }
    if (kind === 'catch') {
      if (this.state.balls < 1) return { type: 'error', message: '빔볼이 없어요. 보급 상점에서 채워 주세요.', ended: false };
      this.state.balls -= 1;
      this.battle.turn += 1;
      const chance = Math.max(this.state.caught === 0 ? 0.9 : 0, catchChance(enemy, creature));
      if (this.random() < chance) {
        this.state.caught += 1;
        if (!this.state.collection.includes(creature.id)) this.state.collection.push(creature.id);
        const joinedParty = this.state.party.length < 6;
        const storedInBox = !joinedParty && this.state.box.length < BOX_LIMIT;
        if (joinedParty || storedInBox) (joinedParty ? this.state.party : this.state.box).push({
          uid: `beam-${this.state.nextUid++}`, speciesId: creature.id,
          level: enemy.level, hp: enemy.maxHp, maxHp: enemy.maxHp, xp: 0,
        });
        const xp = 14 + enemy.level * 3;
        const levelUp = this.gainXp(xp);
        this.state.coins += 8;
        this.battle = null;
        this.save();
        message = `${creature.name}${particle(creature.name, '이', '가')} 새로운 친구가 됐어요! 경험치 +${xp}, 코인 +8.`;
        if (storedInBox) message += ' 파티가 가득 차 보관함에서 기다려요. 친구 메뉴에서 데려올 수 있어요.';
        else if (!joinedParty) message += ` 보관함 ${BOX_LIMIT}칸이 가득 차 도감에만 기록했어요.`;
        if (levelUp) message += ` ${friend.name} 레벨 ${member.level}!`;
        return { type: 'catch', message, ended: true, captured: creature.id, levelUp, joinedParty, storedInBox };
      }
      message = `${creature.name}${particle(creature.name, '이', '가')} 빔볼에서 빠져나왔어요!`;
    } else if (kind === 'attack') {
      const damage = Math.max(4, Math.round(friend.attack + member.level * 1.3 - enemy.level * 0.5) + Math.floor(this.random() * 5));
      enemy.hp = Math.max(0, enemy.hp - damage);
      this.battle.turn += 1;
      message = `${friend.name}의 랠리 샷! ${damage}의 피해를 줬어요.`;
      if (enemy.hp === 0) {
        const xp = 18 + enemy.level * 4;
        const coins = 12 + enemy.level * 2;
        const levelUp = this.gainXp(xp);
        this.state.coins += coins;
        this.battle = null;
        this.save();
        message += ` 상대가 물러났어요. 경험치 +${xp}, 코인 +${coins}.`;
        if (levelUp) message += ` ${friend.name} 레벨 ${member.level}!`;
        return { type: 'victory', message, ended: true, levelUp };
      }
    } else if (kind === 'potion') {
      this.battle.turn += 1;
    } else {
      return { type: 'error', message: '사용할 행동을 선택해 주세요.', ended: false };
    }

    const damage = Math.max(4, Math.round((creature.attack + enemy.level - member.level) * 0.55) + Math.floor(this.random() * 4));
    member.hp = Math.max(0, member.hp - damage);
    message += ` ${creature.name}의 반격! ${damage}의 피해를 받았어요.`;
    if (member.hp === 0) {
      this.battle = null;
      this.state.position = { ...HOME };
      for (const ally of [...this.state.party, ...this.state.box]) ally.hp = ally.maxHp;
      this.save();
      return { type: 'defeat', message: '친구가 지쳤어요. 새빛마을에서 푹 쉬고 모두 건강해졌어요!', ended: true };
    }
    this.save();
    return { type: kind, message, ended: false };
  }

  gainXp(amount) {
    const member = this.active();
    const previousLevel = member.level;
    member.xp += amount;
    while (member.level < 100 && member.xp >= member.level * 12) {
      member.xp -= member.level * 12;
      member.level += 1;
      member.maxHp = hpFor(member.speciesId, member.level);
      member.hp = Math.min(member.maxHp, member.hp + 3);
    }
    if (member.level === 100) member.xp = Math.min(member.xp, 1199);
    return member.level > previousLevel;
  }

  heal() {
    if (this.battle) return { type: 'error', message: '만남 중에는 회복약을 사용해 주세요.', ended: false };
    for (const member of [...this.state.party, ...this.state.box]) member.hp = member.maxHp;
    this.save();
    return { type: 'heal', message: '친구들이 모두 건강해졌어요. 다시 모험을 떠나 볼까요?', ended: true };
  }

  buy(item) {
    if (this.battle) return { type: 'error', message: '만남을 마친 뒤 보급 상점을 이용해 주세요.', ended: false };
    const products = { balls: { cost: 50, count: 5, name: '빔볼 5개' }, potions: { cost: 30, count: 1, name: '회복약 1개' } };
    const product = products[item];
    if (!Object.hasOwn(products, item)) return { type: 'error', message: '구매할 물품을 선택해 주세요.', ended: true };
    if (this.state.coins < product.cost) return { type: 'error', message: '코인이 부족해요. 모험을 통해 모아 보세요.', ended: true };
    this.state.coins -= product.cost;
    this.state[item] += product.count;
    this.save();
    return { type: 'buy', message: `${product.name}를 받았어요. 코인 -${product.cost}.`, ended: true };
  }

  select(uid) {
    if (this.battle) return { type: 'error', message: '만남을 마친 뒤 선두 친구를 바꿀 수 있어요.', ended: false };
    let member = this.state.party.find(ally => ally.uid === uid);
    if (!member) {
      const boxIndex = this.state.box.findIndex(ally => ally.uid === uid);
      if (boxIndex < 0) return { type: 'error', message: '파티나 보관함에 있는 친구를 선택해 주세요.', ended: true };
      const partyIndex = this.state.party.findIndex(ally => ally.uid === this.state.activeUid);
      member = this.state.box[boxIndex];
      this.state.box[boxIndex] = this.state.party[partyIndex];
      this.state.party[partyIndex] = member;
    }
    this.state.activeUid = uid;
    this.save();
    return { type: 'select', message: `${SPECIES.get(member.speciesId).name}${particle(SPECIES.get(member.speciesId).name, '이', '가')} 앞장섭니다!`, ended: true };
  }

  step(position) {
    if (this.battle) return { type: 'error', message: '눈앞의 친구에게 집중해 주세요.', ended: false };
    if (!validPosition(position)) return { type: 'error', message: '그쪽으로는 갈 수 없어요.', ended: true };
    this.state.position = { x: position.x, y: position.y, region: position.region };
    this.state.steps += 1;
    this.save();
    return { type: 'move', message: '', ended: true };
  }

  reset() {
    this.state = initialState();
    this.battle = null;
    this.save();
    return { type: 'reset', message: '희범과 새로운 모험을 시작해요!', ended: true };
  }
}

function particle(name, consonant, vowel) {
  return (name.charCodeAt(name.length - 1) - 0xac00) % 28 ? consonant : vowel;
}
