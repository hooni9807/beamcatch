import { CREATURES } from './creatures.js';
import { Game, catchChance } from './engine.js';
import { World, REGIONS } from './world.js';

const $ = id => document.getElementById(id);
const species = id => CREATURES.find(c => c.id === id);
const game = new Game();
let busy = false, stepsSinceEncounter = 0, night = false, sound = false, audio, toastTimer, currentView = '', dexOwned = false;
const modal = $('modal');
const world = new World($('world'), {
  onStep(position) {
    game.step(position); stepsSinceEncounter++;
    if (position.terrain === 'grass' && stepsSinceEncounter >= 4 && Math.random() < .2) startEncounter();
  },
  onInteract({kind,text}) {
    if (kind === 'heal') { const result = game.heal(); speak(result.message, '마을의 안내자'); render(); chime('heal'); }
    else if (kind === 'shop') openView('bag');
    else speak(text || '풀이 바스락거려요. 주변 탐색으로 친구를 만나보세요.', '작은 안내판');
  },
});
world.setPosition(game.state.position);
game.state.position = world.getPosition();
try { const prefs = JSON.parse(localStorage.getItem('beamcatch-prefs') || '{}'); night = !!prefs.night; sound = !!prefs.sound; } catch {}
world.setNight(night);
updatePreferences();

function speak(message, speaker = `${species(game.active().speciesId).name}와 함께`) {
  $('dialogue').textContent = message;
  $('speaker').textContent = speaker;
}
function toast(message, error = false) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.toggle('error', error); $('toast').hidden = false;
  toastTimer = setTimeout(() => $('toast').hidden = true, 3800);
}
function chime(kind = 'click') {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const notes = kind === 'catch' ? [523,659,784,1047] : kind === 'heal' ? [440,554,659] : kind === 'attack' ? [180,130] : [660];
    notes.forEach((frequency,i) => {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.045, audio.currentTime + i * .11);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + i * .11 + .15);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(audio.currentTime + i * .11); oscillator.stop(audio.currentTime + i * .11 + .16);
    });
  } catch {}
}
function updatePreferences() {
  $('sound-button').setAttribute('aria-pressed', String(sound));
  $('sound-button').setAttribute('aria-label', sound ? '소리 끄기' : '소리 켜기');
  $('sound-button').title = sound ? '소리 끄기' : '소리 켜기';
  $('sound-button').querySelector('.sound-slash').hidden = sound;
  $('time-label').textContent = night ? '밤' : '낮';
  $('time-button').firstChild.textContent = night ? '☾ ' : '☀ ';
  try { localStorage.setItem('beamcatch-prefs', JSON.stringify({night,sound})); } catch {}
}
function setHp(id, hp, max) { $(id).style.width = `${100 * hp / max}%`; $(id).classList.toggle('low', hp / max < .3); }
function render() {
  const member = game.active(), creature = species(member.speciesId), state = game.state;
  const region = REGIONS.find(r => r.id === state.position.region);
  $('side-portrait').src = creature.image; $('side-portrait').alt = creature.name;
  $('guide-image').src = creature.image; $('guide-image').alt = creature.name;
  $('side-name').textContent = creature.name; $('side-level').textContent = `Lv. ${member.level}`;
  $('partner-number').textContent = `NO. ${String(creature.no).padStart(3,'0')}`;
  $('side-type').textContent = creature.type; $('side-type').style.background = `${creature.color}24`; $('side-type').style.borderColor = `${creature.color}60`;
  $('side-hp-text').textContent = `${member.hp} / ${member.maxHp}`; setHp('side-hp', member.hp, member.maxHp);
  $('side-xp').textContent = `${member.xp} / ${member.level * 12} EXP`; $('side-xp-bar').style.width = `${member.xp / (member.level * 12) * 100}%`;
  $('ball-count').textContent = state.balls; $('potion-count').textContent = state.potions; $('coin-count').textContent = state.coins.toLocaleString();
  $('nav-count').textContent = String(state.collection.length).padStart(2,'0');
  $('team-preview').innerHTML = Array.from({length:6},(_,i) => {
    const m = state.party[i], c = m && species(m.speciesId);
    return `<button class="team-slot ${c ? 'filled' : ''}" data-view="team" title="${c ? c.name : '새로운 친구를 기다려요'}" aria-label="${c ? c.name + ' 동료 보기' : '동료 목록 열기'}">${c ? `<img src="${c.image}" alt="">` : '+'}</button>`;
  }).join('');
  $('quest-progress').innerHTML = `${Math.min(3,state.caught)} <small>/ 3</small>`;
  document.querySelectorAll('.quest-bars i').forEach((bar,i) => bar.classList.toggle('done', state.caught > i));
  $('claim-button').hidden = state.caught < 3 || state.questClaimed;
  $('quest-title').textContent = state.questClaimed ? '첫걸음, 멋지게 완료!' : '친구가 되는 첫걸음';
  $('quest-description').innerHTML = state.questClaimed ? `이제 7종의 빔몬을 모두 만나보세요.<br>현재 도감 ${state.collection.length} / 7종 수집 완료!` : '새로운 빔몬을 3번 포획해 보세요.<br>작은 만남이 큰 모험이 될 거예요.';
  $('quest-reward').innerHTML = state.questClaimed ? '<span>첫 모험의 기록</span><b>✓ 보상 받음</b>' : '<span>완료 보상</span><b>빔볼 × 5 · 80 G</b>';
  $('region-heading').innerHTML = `${region.name} <b>↗</b>`; $('location-label').textContent = region.name; $('location-sub').textContent = region.subtitle;
  $('field-code').textContent = `FIELD 0${REGIONS.indexOf(region)+1}`;
  const inhabitants = CREATURES.filter(c => c.habitats.includes(region.id));
  $('habitat-count').textContent = inhabitants.length;
  $('habitat-list').innerHTML = inhabitants.map(c => {
    const owned = state.collection.includes(c.id), seen = state.seen.includes(c.id);
    return `<button class="habitat-item ${seen ? '' : 'unknown'}" data-creature="${c.id}"><span class="habitat-image"><img src="${c.image}" alt="${seen ? c.name : '아직 만나지 못한 친구'}"></span><span><small>NO. ${String(c.no).padStart(3,'0')}</small><strong>${seen ? c.name : '아직 모르는 친구'}</strong><span class="habitat-status">${owned ? '함께하는 친구' : seen ? '발견한 친구' : '풀숲에서 만나보세요'}</span></span>${owned ? '<span class="habitat-tick">✓</span>' : ''}</button>`;
  }).join('');
  const saved = game.save();
  $('save-status').innerHTML = `<i></i> ${saved ? '자동 저장 완료' : '저장 공간 확인 필요'}`;
  $('save-status').title = saved ? '이 브라우저에 모험이 저장됩니다.' : '브라우저 저장소를 사용할 수 없어 새로고침하면 진행이 사라집니다.';
  if (game.battle) renderBattle(game.battle);
}
function renderBattle(battle) {
  const enemy = battle.enemy, ec = species(enemy.speciesId), member = game.active(), pc = species(member.speciesId);
  $('enemy-name').textContent = ec.name; $('enemy-level').textContent = `Lv. ${enemy.level}`;
  $('enemy-image').src = ec.image; $('enemy-image').alt = `야생 ${ec.name}`;
  $('enemy-hp-text').textContent = `${enemy.hp} / ${enemy.maxHp}`; setHp('enemy-hp',enemy.hp,enemy.maxHp);
  $('partner-name').textContent = pc.name; $('partner-level').textContent = `Lv. ${member.level}`;
  $('partner-image').src = pc.image; $('partner-image').alt = `파트너 ${pc.name}`;
  $('partner-hp-text').textContent = `${member.hp} / ${member.maxHp}`; setHp('partner-hp',member.hp,member.maxHp);
  $('battle-ball-count').textContent = `빔볼 ${game.state.balls}`; $('battle-potion-count').textContent = `상처약 ${game.state.potions}`;
}
function setBattleButtons(disabled) { document.querySelectorAll('[data-action]').forEach(button => button.disabled = disabled); }
function startEncounter() {
  if (busy || game.battle || modal.open) return;
  stepsSinceEncounter = 0;
  const result = game.encounter(game.state.position.region);
  if (result.type === 'error') return toast(result.message,true);
  world.setEnabled(false); $('battle').hidden = false; $('battle-actions').hidden = false; $('explore-button').hidden = true;
  $('viewport').closest('.game-console').classList.add('in-battle');
  $('enemy-image').style.opacity = '1'; $('capture-effect').hidden = true;
  speak(`${result.message} 체력을 낮추고 빔볼을 던져보세요.`, '새로운 만남!');
  render(); chime(); setBattleButtons(false);
}
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
async function battleAction(action) {
  if (busy || !game.battle) return;
  busy = true; setBattleButtons(true);
  const snapshot = structuredClone(game.battle);
  if (action === 'catch' && game.state.balls > 0) {
    speak('빔볼을 던졌다… 두근, 두근!', '마음을 전하는 중'); $('capture-effect').hidden = false; $('enemy-image').style.opacity = '.15';
    await delay(950);
  }
  const result = game.action(action);
  $('capture-effect').hidden = true; $('enemy-image').style.opacity = result.captured || result.type === 'victory' ? '0' : '1';
  if (action === 'attack' && !result.ended) { $('enemy-image').classList.add('hit'); setTimeout(() => $('enemy-image').classList.remove('hit'),400); }
  renderBattle(game.battle || snapshot);
  speak(result.message, result.captured ? '좋아, 새로운 친구야!' : result.type === 'victory' ? '멋진 랠리였어!' : '함께라면 할 수 있어');
  chime(result.captured ? 'catch' : action === 'attack' ? 'attack' : 'click'); render();
  if (result.ended) {
    await delay(result.type === 'run' ? 450 : 1700);
    $('battle').hidden = true; $('battle-actions').hidden = true; $('explore-button').hidden = false;
    $('viewport').closest('.game-console').classList.remove('in-battle');
    if (result.type === 'defeat') { world.setPosition(game.state.position); render(); }
    world.setEnabled(true);
    if (result.captured && game.state.collection.length === CREATURES.length) toast('✦ 빔몬 도감 완성! 일곱 친구의 빛을 모두 모았어요.');
    else if (game.state.caught >= 3 && !game.state.questClaimed) toast('첫 번째 목표를 달성했어요. 오른쪽에서 보상을 받아보세요!');
  }
  busy = false; setBattleButtons(false);
}
function openView(view) {
  if (view === 'field') { modal.close(); return; }
  if (busy || game.battle) return toast('지금 만난 친구에게 먼저 집중해 주세요.');
  currentView = view; world.setEnabled(false);
  const titles = {dex:['FIELD GUIDE','빔몬 도감'],team:['BETTER TOGETHER','나의 동료'],bag:['READY FOR ADVENTURE','가방 & 보급 상점'],map:['A LITTLE WORLD','어디로 떠나볼까?'],settings:['MAKE YOURSELF AT HOME','모험 설정'],about:['THE STORY OF BEAMCATCH','작은 빛, 새로운 모험'],reset:['A NEW BEGINNING','처음부터 다시 시작할까요?']};
  const [eyebrow,title] = titles[view] || titles.about;
  $('modal-eyebrow').textContent = eyebrow; $('modal-title').textContent = title;
  const state = game.state;
  if (view === 'dex') {
    $('modal-body').innerHTML = `<p class="modal-intro">발견 ${state.seen.length} / 7 · 수집 ${state.collection.length} / 7<br>아직 만나지 못한 친구는 새로운 지역에서 기다리고 있어요.</p><div class="dex-toolbar"><input id="dex-search" aria-label="빔몬 이름 검색" placeholder="친구 이름으로 검색"><button class="filter-button ${!dexOwned ? 'selected' : ''}" data-filter="all">모두 보기</button><button class="filter-button ${dexOwned ? 'selected' : ''}" data-filter="owned">수집한 친구</button></div><div class="dex-grid" id="dex-grid"></div>`; renderDex();
  } else if (view === 'team') {
    const memberRow = (m, inBox = false) => {
      const c = species(m.speciesId), active = m.uid === state.activeUid;
      return `<div class="team-row ${active ? 'current' : ''}"><img src="${c.image}" alt="${c.name}"><div class="team-info"><h3>${c.name}<small>Lv. ${m.level} · ${c.type}</small></h3><div class="hp-track"><i style="width:${m.hp / m.maxHp * 100}%"></i></div><p>HP ${m.hp} / ${m.maxHp} · ${m.xp} EXP</p></div><button data-select="${m.uid}" ${active ? 'disabled' : ''}>${active ? '함께 걷는 중' : inBox ? '파트너 교체' : '파트너로'}</button></div>`;
    };
    $('modal-body').innerHTML = `<p class="modal-intro">${state.party.length} / 6명의 친구와 함께 모험하고 있어요.<br>파트너가 전투에 나서며, 포획과 승리로 경험치를 얻어요.</p><div class="team-list">${state.party.map(m=>memberRow(m)).join('')}</div>${state.box?.length ? `<h3 style="font-size:13px;margin-top:24px">마을에서 쉬는 친구들 · ${state.box.length}</h3><p class="modal-intro">선택하면 지금 파트너와 자리를 바꿔요.</p><div class="team-list">${state.box.map(m=>memberRow(m,true)).join('')}</div>` : ''}`;
  } else if (view === 'bag') {
    $('modal-body').innerHTML = `<p class="modal-intro">필요한 준비물을 챙겨보세요. 어디서든 보급받을 수 있어요.</p><div class="shop-balance"><span>내가 모은 골드</span><strong>${state.coins.toLocaleString()} G</strong></div><div class="shop-item"><span class="beam-ball"></span><div><h3>빔볼 <small>× ${state.balls}</small></h3><p>친구에게 마음을 전하는 작은 볼.<br>5개 묶음 · 50 G</p></div><button data-buy="balls" ${state.coins < 50 ? 'disabled' : ''}>5개 구매</button></div><div class="shop-item"><span class="potion-icon">✚</span><div><h3>상처약 <small>× ${state.potions}</small></h3><p>파트너의 HP를 35 회복해요.<br>1개 · 30 G</p></div><button data-buy="potions" ${state.coins < 30 ? 'disabled' : ''}>1개 구매</button></div><div class="settings-row"><div><strong>파트너 회복하기</strong><p>${species(game.active().speciesId).name} · HP ${game.active().hp} / ${game.active().maxHp}</p></div><button data-use-potion ${state.potions < 1 || game.active().hp === game.active().maxHp ? 'disabled' : ''}>상처약 사용</button></div><p class="shop-note">✦ 전투에서 이기거나 친구를 포획하면 골드를 얻어요.<br>마을에서 쉬어가면 모든 동료가 무료로 회복됩니다.</p>`;
  } else if (view === 'map') {
    $('modal-body').innerHTML = '<p class="modal-intro">길마다 다른 풍경, 다른 만남이 기다립니다.<br>지역을 선택하면 바로 이동해요.</p><div class="region-cards">'+REGIONS.map((r,i)=>`<button class="region-card ${state.position.region === r.id ? 'current' : ''}" data-region="${r.id}"><span class="region-art">${['♧','≋','♜'][i]}</span><div><h3>${r.name}</h3><small>${r.subtitle}<br>야생 레벨 ${['3–6','5–8','7–10'][i]} · ${CREATURES.filter(c=>c.habitats.includes(r.id)).length}종 서식</small></div><span>${state.position.region === r.id ? '●' : '↗'}</span></button>`).join('')+'</div>';
  } else if (view === 'settings') {
    $('modal-body').innerHTML = `<div class="settings-row"><div><strong>작은 효과음</strong><p>만남과 포획 순간을 소리로 남겨요.</p></div><button data-setting="sound">${sound ? '켜짐 ♪' : '꺼짐'}</button></div><div class="settings-row"><div><strong>마을의 시간</strong><p>분위기에 맞춰 낮과 밤을 바꿔보세요.</p></div><button data-setting="night">${night ? '밤 ☾' : '낮 ☀'}</button></div><div class="settings-row"><div><strong>모험 저장</strong><p>이 브라우저에 자동 저장해요. 기기 간 연동은 지원하지 않아요.</p></div><button data-save>지금 저장</button></div><div class="settings-row"><div><strong>새로운 모험</strong><p>현재 동료, 도감과 가방 기록이 초기화됩니다.</p></div><button class="danger" data-view="reset">처음부터</button></div><p class="shop-note">방향키 / WASD : 이동 · E / 스페이스 : 대화<br>화면의 지도를 눌러 이동할 수도 있어요. 모바일은 하단 방향 버튼을 사용하세요.</p>`;
  } else if (view === 'reset') {
    $('modal-body').innerHTML = '<p class="about-copy">지금까지 모은 동료, 도감, 골드와 탐험 기록이 삭제돼요.<br>희범과 처음 만났던 날부터 다시 시작합니다.</p><div class="confirm-actions"><button data-view="settings">돌아가기</button><button class="danger" data-reset>새 모험 시작</button></div>';
  } else {
    $('modal-body').innerHTML = '<p class="about-copy">어릴 적 작은 화면 속에서 시작했던 큰 모험을 기억하나요?<br><strong>beamcatch</strong>는 그 설렘에 우리의 얼굴을 더한 탐험·수집 게임입니다.</p><p class="about-copy">캐릭터 7종과 이름은 <a href="https://github.com/hooni9807/beamrpg" target="_blank" rel="noopener noreferrer">hooni9807/beamrpg</a>에서 가져왔습니다. 작은 마을, 풀숲의 우연한 만남, 턴제 전투와 도감은 <a href="https://www.pokemon.co.jp/game/other/gbc-gs/" target="_blank" rel="noopener noreferrer">포켓몬스터 금·은</a>을 참고했습니다.</p><p class="about-copy">지도와 세계는 beamcatch만을 위해 새로 그렸습니다. 공식 포켓몬 게임과 관계없는 개인 오마주 프로젝트입니다.<br>이 첫 모험에는 3개 지역과 7종의 빔몬이 살고 있어요.</p><p class="shop-note">BEAMCATCH · FIRST ADVENTURE · v1.0</p>';
  }
  if (!modal.open) modal.showModal();
}
function renderDex() {
  const search = ($('dex-search')?.value || '').trim().toLowerCase();
  const list = CREATURES.filter(c => (!dexOwned || game.state.collection.includes(c.id)) && (!search || (game.state.seen.includes(c.id) && c.name.toLowerCase().includes(search))));
  $('dex-grid').innerHTML = list.map(c => {
    const owned = game.state.collection.includes(c.id), seen = game.state.seen.includes(c.id);
    return `<button class="dex-card ${seen ? '' : 'unseen'}" data-creature="${c.id}"><small>NO. ${String(c.no).padStart(3,'0')}</small>${owned ? '<span class="owned-badge">✓</span>' : ''}<img src="${c.image}" alt="${seen ? c.name : '미발견 빔몬'}"><h3>${seen ? c.name : '???'}</h3><span class="type-pill">${seen ? c.type : '미발견'}</span><p>${owned ? '함께하는 친구' : seen ? '발견 · 아직 만나가는 중' : '새로운 만남을 기다려요'}</p></button>`;
  }).join('') || '<p class="empty-message">이름이 일치하는 친구가 없어요.</p>';
}
function openCreature(id) {
  if (game.battle || busy) return;
  const c = species(id), seen = game.state.seen.includes(id), owned = game.state.collection.includes(id);
  world.setEnabled(false); currentView = 'creature'; $('modal-eyebrow').textContent = `FIELD GUIDE / NO. ${String(c.no).padStart(3,'0')}`; $('modal-title').textContent = seen ? c.name : '아직 만나지 못한 친구';
  $('modal-body').innerHTML = `<div class="dex-detail"><img src="${c.image}" alt="${seen ? c.name : '미발견 빔몬'}" style="${seen ? '' : 'filter:brightness(.3);opacity:.3'}"><span class="type-pill">${seen ? c.type : '???'}</span><p>${seen ? c.description : '풀숲 너머에서 어떤 친구가 기다리고 있을까요?<br>이 친구가 사는 곳으로 모험을 떠나보세요.'}</p>${seen ? `<div class="detail-stats"><div><span>기본 체력</span>${c.baseHp}</div><div><span>공격력</span>${c.attack}</div><div><span>만남</span>${c.rarity === 'rare' ? '희귀' : '보통'}</div></div>` : ''}<div class="detail-habitat">서식지 · ${c.habitats.map(r=>REGIONS.find(x=>x.id===r).name).join(' / ')}</div><p>${owned ? '✓ 도감에 등록된 친구예요.' : '아직 수집하지 않은 친구예요.'}</p><button class="primary-button" data-view="map">만나러 가기 ↗</button></div>`;
  if (!modal.open) modal.showModal();
}
function travel(id) {
  world.setRegion(id); game.state.position = world.getPosition(); stepsSinceEncounter = 0; game.save(); render(); modal.close();
  speak(`${REGIONS.find(r=>r.id===id).name}에 도착했어. 풀숲에서 누가 기다리는지 찾아보자!`); chime();
}

$('explore-button').addEventListener('click',startEncounter);
$('close-modal').addEventListener('click',()=>modal.close());
modal.addEventListener('close',()=> { currentView = ''; world.setEnabled(!busy && !game.battle); });
modal.addEventListener('click',event=> { if(event.target === modal) {const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close();} });
$('sound-button').addEventListener('click',()=> { sound = !sound; updatePreferences(); chime(); toast(sound ? '작은 효과음을 켰어요 ♪' : '효과음을 껐어요.'); });
$('time-button').addEventListener('click',()=> { night = !night; world.setNight(night); updatePreferences(); });
$('heal-button').addEventListener('click',()=> {
  if (busy || game.battle) return toast('전투 중에는 상처약으로 회복할 수 있어요.');
  world.setRegion('meadow'); game.state.position = world.getPosition(); const result = game.heal(); render(); speak(result.message,'새빛 마을 회복소'); chime('heal'); toast('모든 동료의 HP가 가득 찼어요!');
});
$('claim-button').addEventListener('click',()=> {
  if (game.state.caught < 3 || game.state.questClaimed || busy || game.battle) return;
  game.state.questClaimed = true; game.state.balls += 5; game.state.coins += 80; render(); chime('catch'); toast('첫 모험 달성! 빔볼 5개와 80 G를 받았어요.');
});
$('battle-help').addEventListener('click',()=> {
  if (!game.battle) return;
  const chance = Math.max(game.state.caught === 0 ? .9 : 0,catchChance(game.battle.enemy,species(game.battle.enemy.speciesId)));
  toast(`현재 포획 확률 ${Math.round(chance*100)}% · HP가 낮을수록 잡기 쉬워요. HP가 0이 되기 전에 빔볼을 던지세요!`);
});
$('fullscreen-button').addEventListener('click',async()=> {
  try { if(document.fullscreenElement) await document.exitFullscreen(); else await $('viewport').closest('.game-console').requestFullscreen(); } catch { toast('이 브라우저에서는 전체 화면을 지원하지 않아요.'); }
});
document.addEventListener('click',event=> {
  const button = event.target.closest('button'); if (!button) return;
  const d = button.dataset;
  if (d.view) openView(d.view);
  else if (d.action) battleAction(d.action);
  else if (d.creature) openCreature(d.creature);
  else if (d.region) travel(d.region);
  else if (d.select) { const result = game.select(d.select); render(); openView('team'); speak(result.message); toast(result.message); }
  else if (d.buy) { const result = game.buy(d.buy); render(); openView('bag'); toast(result.message,result.type === 'error'); chime(); }
  else if ('usePotion' in d) { const result = game.action('potion'); render(); openView('bag'); toast(result.message); chime('heal'); }
  else if (d.filter) { dexOwned = d.filter === 'owned'; document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter === d.filter)); renderDex(); }
  else if (d.setting) { if(d.setting === 'sound') sound = !sound; else { night = !night; world.setNight(night); } updatePreferences(); openView('settings'); chime(); }
  else if ('save' in d) toast(game.save() ? '이 브라우저에 모험을 저장했어요.' : '저장하지 못했어요. 브라우저 저장 공간을 확인해주세요.',!game.storage);
  else if ('reset' in d) { game.reset(); world.setPosition(game.state.position); render(); modal.close(); speak('희범과 새로운 모험을 시작해요!'); toast('새로운 모험이 시작됐어요.'); }
});
document.addEventListener('input',event=> { if (event.target.id === 'dex-search') renderDex(); });
const directions = {ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
document.addEventListener('keydown',event=> {
  if (modal.open || busy || game.battle || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.matches('input,textarea,select')) return;
  const direction = directions[event.key] || directions[event.key.toLowerCase()];
  if (direction) { event.preventDefault(); world.move(...direction); }
  else if ((event.code === 'Space' && !event.target.matches('button,a')) || event.key.toLowerCase() === 'e') { event.preventDefault(); world.interact(); }
});
const dirValues = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
let moveTimer;
document.querySelectorAll('[data-dir]').forEach(button=> {
  button.addEventListener('pointerdown',event=> { event.preventDefault(); if (busy || game.battle || modal.open) return; clearInterval(moveTimer); world.move(...dirValues[button.dataset.dir]); moveTimer = setInterval(()=>world.move(...dirValues[button.dataset.dir]),180); button.setPointerCapture(event.pointerId); });
  for (const eventName of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(eventName,()=>clearInterval(moveTimer));
});
$('interact-button').addEventListener('click',()=> { if(!game.battle && !busy) world.interact(); });
window.addEventListener('blur',()=>clearInterval(moveTimer));
window.addEventListener('pagehide',()=> { game.save(); clearInterval(moveTimer); });
render();
if (!game.save()) toast('브라우저 저장소를 사용할 수 없어요. 새로고침 전에 저장 공간을 확인해주세요.',true);
