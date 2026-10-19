import assert from 'node:assert/strict';
import { Game, catchChance, typeMultiplier } from '../dist/engine.js';
import { CREATURES, TYPE_STRENGTHS } from '../dist/creatures.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

const storage = memoryStorage();
const game = new Game({ storage, random: () => 0 });
assert.equal(game.active().speciesId, 'heebeom');
assert.deepEqual(game.state.position, { x: 15, y: 10, region: 'meadow' });
assert.equal(game.state.balls, 12);
assert.deepEqual(game.state.box, []);
assert.equal(game.step({ x: 30, y: 10, region: 'meadow' }).type, 'error');
assert.equal(game.step({ x: 15, y: 18, region: 'meadow' }).type, 'error');

const common = CREATURES.find(creature => creature.rarity === 'common');
const rare = CREATURES.find(creature => creature.rarity === 'rare');
assert.ok(catchChance({ hp: 10, maxHp: 50 }, common) > catchChance({ hp: 50, maxHp: 50 }, common));
assert.ok(catchChance({ hp: 10, maxHp: 50 }, common) > catchChance({ hp: 10, maxHp: 50 }, rare));

game.encounter('lake');
assert.ok(CREATURES.find(creature => creature.id === game.battle.enemy.speciesId).habitats.includes('lake'));
const captured = game.action('catch');
assert.equal(captured.ended, true);
assert.equal(captured.type, 'catch');
assert.equal(captured.storedInBox, false);
assert.equal(game.battle, null);
assert.equal(game.state.balls, 11);
assert.equal(game.state.caught, 1);
assert.equal(game.state.party.length, 2);
assert.ok(game.state.collection.includes(captured.captured));
assert.ok(game.state.seen.includes(captured.captured));

const secondUid = game.state.party[1].uid;
assert.equal(game.select(secondUid).type, 'select');
assert.equal(game.active().uid, secondUid);
assert.equal(game.select('unknown').type, 'error');
game.encounter('meadow');
assert.equal(game.select('beam-1').type, 'error');
assert.equal(game.buy('balls').type, 'error');
assert.equal(game.heal().type, 'error');
assert.equal(game.step({ x: 10, y: 10, region: 'meadow' }).type, 'error');
assert.equal(game.action('run').ended, true);

const coinsBefore = game.state.coins;
const ballsBefore = game.state.balls;
assert.equal(game.buy('balls').type, 'buy');
assert.equal(game.state.balls, ballsBefore + 5);
assert.equal(game.state.coins, coinsBefore - 50);
game.state.coins = 0;
assert.equal(game.buy('potions').type, 'error');
assert.equal(game.buy('constructor').type, 'error');
assert.equal(game.state.potions, 3);

game.state.questClaimed = true;
game.step({ x: 12, y: 8, region: 'lake' });
assert.equal(game.save(), true);
const loaded = new Game({ storage });
assert.deepEqual(loaded.state, game.state);
assert.equal(loaded.state.questClaimed, true);
assert.equal(loaded.active().uid, secondUid);
assert.equal(loaded.battle, null);
const legacyState = { ...game.state };
delete legacyState.box;
storage.setItem('beamcatch-v1', JSON.stringify(legacyState));
assert.deepEqual(new Game({ storage }).state, game.state);

for (const broken of ['{not json', 'null', '{}', JSON.stringify({ ...game.state, balls: -1 }),
  JSON.stringify({ ...game.state, activeUid: 'missing' }),
  JSON.stringify({ ...game.state, party: [{ ...game.state.party[0], speciesId: 'unknown' }] }),
  JSON.stringify({ ...game.state, party: [game.state.party[0], game.state.party[0]] }),
  JSON.stringify({ ...game.state, questClaimed: 'yes' }),
  JSON.stringify({ ...game.state, box: [game.state.party[0]] }),
  JSON.stringify({ ...game.state, box: {} }),
  JSON.stringify({ ...game.state, position: { x: 30, y: 10, region: 'meadow' } }),
]) {
  storage.setItem('beamcatch-v1', broken);
  const recovered = new Game({ storage });
  assert.equal(recovered.state.caught, 0);
  assert.equal(recovered.state.party.length, 1);
  assert.equal(recovered.active().speciesId, 'heebeom');
}
assert.equal(new Game({ storage: null }).save(), false);
assert.equal(new Game({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } } }).save(), false);

const battle = new Game({ storage: null, random: () => 0 });
battle.encounter('ruins');
battle.state.balls = 0;
const originalHp = battle.active().hp;
assert.equal(battle.action('catch').type, 'error');
assert.equal(battle.active().hp, originalHp);
assert.equal(battle.battle.turn, 0);
assert.equal(battle.action('potion').type, 'info');
assert.equal(battle.state.potions, 3);
battle.active().hp = 1;
const defeat = battle.action('attack');
assert.equal(defeat.type, 'defeat');
assert.equal(defeat.ended, true);
assert.equal(battle.battle, null);
assert.equal(battle.active().hp, battle.active().maxHp);
assert.deepEqual(battle.state.position, { x: 15, y: 10, region: 'meadow' });

battle.encounter('meadow');
battle.active().hp = 20;
assert.equal(battle.action('potion').type, 'potion');
assert.equal(battle.state.potions, 2);
assert.ok(battle.active().hp > 20);
assert.equal(battle.battle.turn, 1);
battle.battle.enemy.hp = 1;
battle.active().xp = battle.active().level * 12 - 1;
assert.equal(battle.action('attack').levelUp, true);
assert.equal(battle.active().level, 6);
assert.equal(battle.active().maxHp, common.baseHp + 6 * 3);
battle.active().hp = 10;
assert.equal(battle.action('potion').ended, true);
assert.equal(battle.active().hp, 45);
assert.equal(battle.state.potions, 1);

const firstCatch = new Game({ storage: null, random: () => 0.85 });
firstCatch.encounter('ruins');
assert.equal(firstCatch.action('catch').type, 'catch');
firstCatch.encounter('ruins');
const beforeFailedCatch = firstCatch.active().hp;
assert.equal(firstCatch.action('catch').ended, false);
assert.equal(firstCatch.state.balls, 10);
assert.ok(firstCatch.active().hp < beforeFailedCatch);

const boxStorage = memoryStorage();
const full = new Game({ storage: boxStorage, random: () => 0 });
for (let i = 0; i < 7; i += 1) {
  full.encounter('lake');
  const result = full.action('catch');
  assert.equal(result.captured, 'sleepy');
  assert.equal(result.joinedParty, i < 5);
  assert.equal(result.storedInBox, i >= 5);
}
assert.equal(full.state.party.length, 6);
assert.equal(full.state.box.length, 2);
assert.equal(new Set(full.state.party.map(member => member.uid)).size, 6);
assert.equal(full.state.caught, 7);
assert.equal(full.state.collection.length, 2);
full.encounter('ruins');
assert.equal(full.action('catch').storedInBox, true);
const boxed = full.state.box.at(-1);
const formerActive = full.active();
assert.equal(boxed.speciesId, 'ajae');
assert.equal(full.select(boxed.uid).type, 'select');
assert.equal(full.active().uid, boxed.uid);
assert.equal(full.state.box.at(-1).uid, formerActive.uid);
assert.equal(full.state.box.some(member => member.uid === boxed.uid), false);
assert.equal(full.state.party.length, 6);
assert.deepEqual(new Game({ storage: boxStorage }).state, full.state);
full.encounter('lake');
assert.equal(full.select(formerActive.uid).type, 'error');
full.action('run');
full.state.box.at(-1).hp = 1;
full.heal();
assert.equal(full.state.box.at(-1).hp, full.state.box.at(-1).maxHp);

full.state.box = Array.from({ length: 500 }, (_, index) => ({ ...formerActive, uid: `beam-${index + 100}` }));
full.state.nextUid = 600;
full.encounter('lake');
const overflow = full.action('catch');
assert.equal(overflow.storedInBox, false);
assert.equal(overflow.joinedParty, false);
assert.match(overflow.message, /500칸/);
assert.equal(full.state.box.length, 500);
assert.deepEqual(new Game({ storage: boxStorage }).state, full.state);
full.state.box.push({ ...formerActive, uid: 'beam-600' });
full.state.nextUid = 601;
full.save();
assert.equal(new Game({ storage: boxStorage }).state.caught, 0);
full.reset();
assert.equal(full.state.party.length, 1);
assert.equal(full.state.box.length, 0);
assert.equal(full.state.caught, 0);
assert.equal(full.state.questClaimed, false);
assert.equal(full.state.balls, 12);

assert.equal(CREATURES.length, 36);
assert.equal(new Set(CREATURES.map(creature => creature.id)).size, 36);
assert.equal(CREATURES.filter(creature => creature.form === 'base').length, 12);
assert.equal(CREATURES.filter(creature => creature.form === 'evolved').length, 12);
assert.equal(CREATURES.filter(creature => creature.form === 'variant').length, 12);

// Choose the midpoint of every weighted interval: every eligible friend must be reachable.
const reachable = new Set();
for (const region of ['meadow', 'lake', 'ruins']) {
  for (const period of ['day', 'night']) {
    const candidates = CREATURES.filter(creature => creature.habitats.includes(region)
      && creature.encounterWeight > 0 && ['any', period].includes(creature.activeTime));
    const total = candidates.reduce((sum, creature) => sum + creature.encounterWeight, 0);
    assert.ok(total > 0);
    let intervalStart = 0;
    for (const creature of candidates) {
      const roll = (intervalStart + creature.encounterWeight / 2) / total;
      const encounter = new Game({ storage: null, random: () => roll });
      assert.equal(encounter.encounter(region, period).type, 'encounter');
      assert.equal(encounter.battle.enemy.speciesId, creature.id);
      assert.notEqual(creature.form, 'evolved');
      reachable.add(creature.id);
      intervalStart += creature.encounterWeight;
    }
    const last = new Game({ storage: null, random: () => 1 - Number.EPSILON });
    last.encounter(region, period);
    assert.equal(last.battle.enemy.speciesId, candidates.at(-1).id);
  }
}
assert.deepEqual(reachable, new Set(CREATURES.filter(creature => creature.form !== 'evolved').map(creature => creature.id)));
assert.equal(reachable.size, 24);
assert.ok(CREATURES.some(creature => creature.activeTime === 'night'));
assert.ok(CREATURES.some(creature => creature.activeTime === 'day'));
for (const creature of CREATURES.filter(creature => creature.form === 'evolved')) {
  assert.deepEqual(creature.habitats, []);
  assert.equal(creature.encounterWeight, 0);
}
const invalidEncounter = new Game({ storage: null });
const untouchedState = structuredClone(invalidEncounter.state);
assert.equal(invalidEncounter.encounter('meadow', 'dawn').type, 'error');
assert.equal(invalidEncounter.encounter('unknown', 'night').type, 'error');
assert.equal(invalidEncounter.battle, null);
assert.deepEqual(invalidEncounter.state, untouchedState);

const expectedStrengths = {
  불꽃: '풀', 풀: '물', 물: '불꽃', 전기: '바람', 바람: '강철',
  강철: '얼음', 얼음: '전기', 빛: '그림자', 그림자: '꿈', 꿈: '빛',
};
assert.deepEqual(TYPE_STRENGTHS, expectedStrengths);
for (const [attacker, defender] of Object.entries(expectedStrengths)) {
  assert.equal(typeMultiplier(attacker, defender), 1.5);
  assert.equal(typeMultiplier(defender, attacker), 0.75);
  assert.equal(typeMultiplier(attacker, attacker), 1);
}
assert.equal(typeMultiplier('빛', '물'), 1);
assert.equal(typeMultiplier('unknown', '물'), 1);

// Validate real damage on both sides, including resisted attacks and neutral matchups.
for (const [friendId, enemyId, playerMultiplier, enemyMultiplier] of [
  ['heebeom', 'percival', 1.5, 0.75],
  ['percival', 'heebeom', 0.75, 1.5],
  ['heebeom', 'hugo', 1, 1],
]) {
  const match = new Game({ storage: null, random: () => 0 });
  const friend = CREATURES.find(creature => creature.id === friendId);
  const opponent = CREATURES.find(creature => creature.id === enemyId);
  Object.assign(match.active(), { speciesId: friendId, level: 10, maxHp: friend.baseHp + 30, hp: friend.baseHp + 30 });
  match.battle = { enemy: { speciesId: enemyId, level: 10, hp: opponent.baseHp + 30, maxHp: opponent.baseHp + 30 }, turn: 0 };
  const playerHp = match.active().hp;
  const enemyHp = match.battle.enemy.hp;
  const result = match.action('attack');
  assert.equal(result.type, 'attack');
  assert.equal(result.playerMultiplier, playerMultiplier);
  assert.equal(result.enemyMultiplier, enemyMultiplier);
  assert.equal(enemyHp - match.battle.enemy.hp, Math.round(Math.round(friend.attack + 8) * playerMultiplier));
  assert.equal(playerHp - match.active().hp, Math.round(Math.round(opponent.attack * 0.55) * enemyMultiplier));
  assert.ok(result.message.includes(friend.move));
  assert.ok(result.message.includes(opponent.move));
  if (playerMultiplier !== 1) {
    assert.match(result.message, /효과가 굉장/);
    assert.match(result.message, /효과가 약/);
  }
  match.battle.enemy.hp = 1;
  const winningBlow = match.action('attack');
  assert.equal(winningBlow.type, 'victory');
  assert.equal(winningBlow.playerMultiplier, playerMultiplier);
  assert.equal(winningBlow.enemyMultiplier, undefined);
}

const evolutionStorage = memoryStorage();
const evolution = new Game({ storage: evolutionStorage, random: () => 0 });
const beforeEvolution = structuredClone(evolution.state);
assert.equal(evolution.evolve('missing').type, 'error');
assert.equal(evolution.evolve(evolution.active().uid).type, 'error');
assert.deepEqual(evolution.state, beforeEvolution);
evolution.encounter('meadow');
assert.equal(evolution.evolve(evolution.active().uid).type, 'error');
evolution.action('run');
evolution.gainXp(9 * 12 + 8 * 12 + 7 * 12 + 6 * 12 + 5 * 12 + 17);
assert.equal(evolution.active().level, 10);
assert.equal(evolution.active().speciesId, 'heebeom');
evolution.active().hp -= 23;
const oldMember = { ...evolution.active() };
const evolvedSpecies = CREATURES.find(creature => creature.id === 'heebeom-evolved');
const evolutionResult = evolution.evolve(oldMember.uid);
assert.equal(evolutionResult.type, 'evolve');
assert.equal(evolutionResult.from, 'heebeom');
assert.equal(evolutionResult.to, evolvedSpecies.id);
assert.equal(evolutionResult.uid, oldMember.uid);
assert.equal(evolution.active().speciesId, evolvedSpecies.id);
assert.equal(evolution.active().uid, oldMember.uid);
assert.equal(evolution.active().level, oldMember.level);
assert.equal(evolution.active().xp, oldMember.xp);
assert.equal(evolution.active().maxHp, evolvedSpecies.baseHp + 30);
assert.equal(evolution.active().maxHp - evolution.active().hp, oldMember.maxHp - oldMember.hp);
assert.deepEqual(evolution.state.collection, ['heebeom', evolvedSpecies.id]);
assert.deepEqual(evolution.state.seen, ['heebeom', evolvedSpecies.id]);
const afterEvolution = structuredClone(evolution.state);
assert.notEqual(evolution.evolve(oldMember.uid).type, 'evolve');
assert.deepEqual(evolution.state, afterEvolution);
assert.deepEqual(new Game({ storage: evolutionStorage }).state, evolution.state);

const boxedBase = CREATURES.find(creature => creature.id === 'sleepy');
evolution.state.box.push({ uid: 'beam-2', speciesId: boxedBase.id, level: 14,
  hp: boxedBase.baseHp + 42 - 9, maxHp: boxedBase.baseHp + 42, xp: 31 });
evolution.state.nextUid = 3;
evolution.state.collection.push(boxedBase.id);
evolution.state.seen.push(boxedBase.id);
assert.equal(evolution.evolve('beam-2').type, 'evolve');
assert.equal(evolution.state.box[0].speciesId, 'sleepy-evolved');
assert.equal(evolution.state.box[0].uid, 'beam-2');
assert.equal(evolution.state.box[0].maxHp - evolution.state.box[0].hp, 9);
assert.equal(evolution.state.box[0].xp, 31);
assert.equal(evolution.state.party.length, 1);
assert.equal(evolution.state.activeUid, 'beam-1');
assert.deepEqual(new Game({ storage: evolutionStorage }).state, evolution.state);

// A literal v1 save protects historical stats and earned progress from catalog changes.
const v1Fixture = {
  version: 1,
  party: [
    { uid: 'beam-1', speciesId: 'heebeom', level: 21, hp: 98, maxHp: 111, xp: 41 },
    { uid: 'beam-2', speciesId: 'sleepy', level: 4, hp: 36, maxHp: 70, xp: 4 },
  ],
  box: [{ uid: 'beam-9', speciesId: 'percival', level: 11, hp: 62, maxHp: 77, xp: 42 }],
  collection: ['heebeom', 'ajae', 'sleepy', 'leesin', 'percival', 'hugo', 'drunk'],
  seen: ['heebeom', 'ajae', 'sleepy', 'leesin', 'percival', 'hugo', 'drunk'],
  activeUid: 'beam-1', nextUid: 10, balls: 16, potions: 5, coins: 555,
  steps: 203, caught: 25, questClaimed: true, position: { x: 12, y: 8, region: 'lake' },
};
const v1Storage = memoryStorage();
v1Storage.setItem('beamcatch-v1', JSON.stringify(v1Fixture));
const v1Loaded = new Game({ storage: v1Storage });
assert.deepEqual(v1Loaded.state, v1Fixture);
assert.equal(v1Loaded.evolve('beam-1').type, 'evolve');
assert.equal(v1Loaded.active().level, 21);
assert.equal(v1Loaded.active().xp, 41);
assert.equal(v1Loaded.active().maxHp - v1Loaded.active().hp, 13);
assert.equal(v1Loaded.state.balls, 16);
assert.equal(v1Loaded.state.coins, 555);
assert.equal(v1Loaded.state.caught, 25);
assert.equal(v1Loaded.state.questClaimed, true);
assert.deepEqual(v1Loaded.state.collection.slice(0, 7), v1Fixture.collection);
assert.deepEqual(v1Loaded.state.box, v1Fixture.box);
assert.deepEqual(new Game({ storage: v1Storage }).state, v1Loaded.state);

const completeStorage = memoryStorage();
const complete = new Game({ storage: completeStorage });
const allMembers = CREATURES.map((creature, index) => ({ uid: `beam-${index + 1}`, speciesId: creature.id,
  level: 10, hp: creature.baseHp + 30, maxHp: creature.baseHp + 30, xp: 1 }));
Object.assign(complete.state, { party: allMembers.slice(0, 6), box: allMembers.slice(6),
  collection: CREATURES.map(creature => creature.id), seen: CREATURES.map(creature => creature.id), nextUid: 43 });
assert.equal(complete.save(), true);
assert.deepEqual(new Game({ storage: completeStorage }).state, complete.state);
const variant = complete.state.box.find(member => CREATURES.find(creature => creature.id === member.speciesId).form === 'variant');
assert.notEqual(complete.evolve(variant.uid).type, 'evolve');
assert.deepEqual(new Game({ storage: completeStorage }).state, complete.state);

console.log('Engine tests passed: 36 species, day/night encounters, type damage, evolution, v1 saves, catches, inventory, party, XP, recovery, reset.');
