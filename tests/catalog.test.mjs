import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { CREATURES, FORM_LABELS, TYPE_STRENGTHS } from '../dist/creatures.js';

const byId = new Map(CREATURES.map(creature => [creature.id, creature]));
const regions = ['meadow', 'lake', 'ruins'];
const originals = [
  ['heebeom', 1, 48, 12], ['ajae', 2, 54, 11], ['sleepy', 3, 58, 10],
  ['leesin', 4, 46, 16], ['percival', 5, 44, 15], ['hugo', 6, 52, 13], ['drunk', 7, 50, 14],
];

test('36 complete entries have unique identities, consecutive numbers and bundled portraits', () => {
  assert.equal(CREATURES.length, 36);
  assert.equal(byId.size, 36);
  assert.equal(new Set(CREATURES.map(creature => creature.name)).size, 36);
  assert.deepEqual(CREATURES.map(creature => creature.no), Array.from({ length: 36 }, (_, index) => index + 1));
  for (const creature of CREATURES) {
    for (const field of ['id', 'name', 'type', 'color', 'image', 'description', 'family', 'form', 'emblem', 'move']) {
      assert.equal(typeof creature[field], 'string', `${creature.id}: ${field}`);
      assert.ok(creature[field].length > 0, `${creature.id}: empty ${field}`);
    }
    assert.match(creature.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.match(creature.image, /^\.\/assets\/[a-z-]+\.png$/);
    assert.ok(existsSync(new URL(`../dist/${creature.image}`, import.meta.url)), creature.image);
    assert.match(creature.color, /^#[a-f\d]{6}$/i);
    assert.ok(Object.hasOwn(TYPE_STRENGTHS, creature.type), creature.id);
    assert.ok(Object.hasOwn(FORM_LABELS, creature.form), creature.id);
    assert.ok(['common', 'rare'].includes(creature.rarity));
    assert.ok(['any', 'day', 'night'].includes(creature.activeTime));
    assert.ok(Number.isInteger(creature.baseHp) && creature.baseHp > 0);
    assert.ok(Number.isInteger(creature.attack) && creature.attack > 0);
    assert.ok(Number.isFinite(creature.encounterWeight) && creature.encounterWeight >= 0);
    assert.ok(Array.isArray(creature.habitats) && creature.habitats.every(region => regions.includes(region)));
    assert.equal(byId.get(creature.family)?.form, 'base');
  }
});

test('the original seven keep their save-compatible identities, HP, attack and portrait paths', () => {
  for (const [id, no, baseHp, attack] of originals) {
    const creature = byId.get(id);
    assert.deepEqual([creature.no, creature.baseHp, creature.attack], [no, baseHp, attack]);
    assert.equal(creature.image, `./assets/${id}-face.png`);
  }
});

test('every family has one reachable evolution and one wild variant with a distinct type', () => {
  const bases = CREATURES.filter(creature => creature.form === 'base');
  assert.equal(bases.length, 12);
  for (const base of bases) {
    const family = CREATURES.filter(creature => creature.family === base.id);
    assert.deepEqual(family.map(creature => creature.form), ['base', 'evolved', 'variant']);
    assert.equal(base.activeTime, 'any');
    assert.equal(base.evolutionLevel, 10);
    assert.ok(base.habitats.length > 0 && base.encounterWeight > 0);
    const evolved = byId.get(base.evolvesTo);
    assert.equal(evolved.id, `${base.id}-evolved`);
    assert.equal(evolved.form, 'evolved');
    assert.equal(evolved.evolvedFrom, base.id);
    assert.equal(evolved.evolvesTo, undefined);
    assert.equal(evolved.evolutionLevel, undefined);
    assert.ok(evolved.baseHp > base.baseHp && evolved.attack > base.attack);
    assert.deepEqual(evolved.habitats, []);
    assert.equal(evolved.encounterWeight, 0);
    const variant = byId.get(`${base.id}-variant`);
    assert.equal(variant.form, 'variant');
    assert.notEqual(variant.type, base.type);
    assert.equal(variant.rarity, 'rare');
    assert.equal(variant.encounterWeight, 0.12);
    assert.equal(variant.activeTime, base.no % 2 ? 'day' : 'night');
    assert.ok(variant.habitats.length > 0);
    assert.equal(variant.evolvesTo, undefined);
  }
  for (const region of regions) {
    for (const time of ['day', 'night']) {
      const wild = CREATURES.filter(creature => creature.habitats.includes(region)
        && creature.encounterWeight > 0 && ['any', time].includes(creature.activeTime));
      assert.ok(wild.some(creature => creature.form === 'base'), `${region}: ${time} has base encounters`);
      assert.ok(wild.some(creature => creature.form === 'variant'), `${region}: ${time} has rare encounters`);
    }
  }
});

test('all ten types have a complete, unambiguous strength matchup', () => {
  assert.equal(Object.keys(TYPE_STRENGTHS).length, 10);
  assert.deepEqual(new Set(Object.values(TYPE_STRENGTHS)), new Set(Object.keys(TYPE_STRENGTHS)));
  for (const [type, weakness] of Object.entries(TYPE_STRENGTHS)) {
    assert.notEqual(type, weakness);
    assert.notEqual(TYPE_STRENGTHS[weakness], type);
    assert.ok(CREATURES.some(creature => creature.type === type), type);
  }
});
