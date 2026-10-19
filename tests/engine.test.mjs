import assert from 'node:assert/strict';
import { Game, catchChance } from '../dist/engine.js';
import { CREATURES } from '../dist/creatures.js';

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
console.log('Engine tests passed: encounters, catches, inventory, party, XP, recovery, save validation, reset.');
