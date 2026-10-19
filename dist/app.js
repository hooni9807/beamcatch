import { CREATURES, FORM_LABELS, TYPE_STRENGTHS } from './creatures.js';
import { Game, catchChance, typeMultiplier } from './engine.js';
import { World, REGIONS } from './world.js';

const $ = id => document.getElementById(id);
const species = id => CREATURES.find(c => c.id === id);
const game = new Game();
let busy = false, stepsSinceEncounter = 0, night = false, sound = false, audio, toastTimer, currentView = '', dexFilter = 'all', dexType = '';
const period = () => night ? 'night' : 'day';
const timeLabel = time => ({day:'낮에만',night:'밤에만',any:'낮과 밤'})[time];
const inField = (c, region) => c.encounterWeight > 0 && c.habitats.includes(region);
const availableNow = c => c.activeTime === 'any' || c.activeTime === period();
function portrait(c, size = '') {
  return `<span class="creature-portrait form-${c.form} ${size}" style="--aura:${c.color}"><img src="${c.image}" alt="${c.name}" loading="lazy"><span class="portrait-mark" aria-hidden="true">${c.emblem}</span>${c.form === 'base' ? '' : `<span class="portrait-stage" aria-hidden="true">${c.form === 'evolved' ? '♛' : '✦'}</span>`}</span>`;
}
const modal = $('modal');
document.querySelector('[data-action="attack"] small').id = 'attack-name';
$('side-portrait').closest('.partner-portrait').insertAdjacentHTML('beforeend','<span class="side-form" id="side-form"></span>');
$('team-preview').insertAdjacentHTML('beforebegin','<button id="partner-evolution" data-view="team" class="partner-evolution" hidden></button>');
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
  const frame = $('side-portrait').closest('.partner-portrait');
  frame.dataset.form = creature.form; frame.style.setProperty('--aura', creature.color);
  $('side-form').textContent = `${creature.emblem} ${FORM_LABELS[creature.form]}`;
  $('partner-evolution').hidden = !creature.evolvesTo;
  $('partner-evolution').textContent = creature.evolvesTo ? member.level >= creature.evolutionLevel ? '✦ 진화할 수 있어요 →' : `Lv. ${creature.evolutionLevel}에 새로운 모습으로 →` : '';
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
    return `<button class="team-slot ${c ? 'filled' : ''}" data-view="team" title="${c ? c.name : '새로운 친구를 기다려요'}" aria-label="${c ? c.name + ' 동료 보기' : '동료 목록 열기'}">${c ? portrait(c,'mini') : '+'}</button>`;
  }).join('');
  $('quest-progress').innerHTML = `${Math.min(3,state.caught)} <small>/ 3</small>`;
  document.querySelectorAll('.quest-bars i').forEach((bar,i) => bar.classList.toggle('done', state.caught > i));
  $('claim-button').hidden = state.caught < 3 || state.questClaimed;
  $('quest-title').textContent = state.questClaimed ? '첫걸음, 멋지게 완료!' : '친구가 되는 첫걸음';
  $('quest-description').innerHTML = state.questClaimed ? `진화와 희귀 변종까지 만나보세요.<br>현재 도감 ${state.collection.length} / ${CREATURES.length}종 수집 완료!` : '새로운 빔몬을 3번 포획해 보세요.<br>작은 만남이 큰 모험이 될 거예요.';
  $('quest-reward').innerHTML = state.questClaimed ? '<span>첫 모험의 기록</span><b>✓ 보상 받음</b>' : '<span>완료 보상</span><b>빔볼 × 5 · 80 G</b>';
  $('region-heading').innerHTML = `${region.name} <b>↗</b>`; $('location-label').textContent = region.name; $('location-sub').textContent = region.subtitle;
  $('field-code').textContent = `FIELD 0${REGIONS.indexOf(region)+1}`;
  const inhabitants = CREATURES.filter(c => inField(c,region.id));
  $('habitat-count').textContent = inhabitants.length;
  $('habitat-note').textContent = `${night ? '밤' : '낮'}에는 ${inhabitants.filter(availableNow).length}종을 만날 수 있어요 · 옆으로 넘겨보기`;
  $('habitat-list').innerHTML = inhabitants.map(c => {
    const owned = state.collection.includes(c.id);
    return `<button class="habitat-item ${availableNow(c) ? '' : 'other-time'}" data-creature="${c.id}">${portrait(c,'small')}<span><small>NO. ${String(c.no).padStart(3,'0')} · ${c.type}</small><strong>${c.name}</strong><span class="habitat-status">${c.rarity === 'rare' ? '희귀 · ' : ''}${timeLabel(c.activeTime)}</span></span>${owned ? '<span class="habitat-tick">✓</span>' : ''}</button>`;
  }).join('');
  const saved = game.save();
  $('save-status').innerHTML = `<i></i> ${saved ? '자동 저장 완료' : '저장 공간 확인 필요'}`;
  $('save-status').title = saved ? '이 브라우저에 모험이 저장됩니다.' : '브라우저 저장소를 사용할 수 없어 새로고침하면 진행이 사라집니다.';
  if (game.battle) renderBattle(game.battle);
}
function renderBattle(battle) {
  const enemy = battle.enemy, ec = species(enemy.speciesId), member = game.active(), pc = species(member.speciesId);
  $('enemy-name').textContent = ec.name; $('enemy-level').textContent = `Lv. ${enemy.level}`;
  $('enemy-type').textContent = `${ec.emblem} ${ec.type} · ${FORM_LABELS[ec.form]}`;
  $('partner-type').textContent = `${pc.emblem} ${pc.type} · ${FORM_LABELS[pc.form]}`;
  for (const [side,c] of [['enemy',ec],['partner',pc]]) {
    const aura = $(`${side}-aura`); aura.dataset.form = c.form; aura.style.setProperty('--aura',c.color);
    const mark = $(`${side}-form`); mark.textContent = c.form === 'base' ? c.emblem : `${c.form === 'evolved' ? '♛' : '✦'} ${c.emblem}`;
    mark.style.color = c.color;
  }
  const multiplier = typeMultiplier(pc.type,ec.type);
  $('battle-matchup').textContent = `${pc.type} → ${ec.type} · 피해 ×${multiplier}`;
  $('battle-matchup').dataset.advantage = String(multiplier > 1);
  $('attack-name').textContent = pc.move;
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
  const result = game.encounter(game.state.position.region,period());
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
    const c = species(game.active().speciesId);
    if (result.captured && game.state.collection.length === CREATURES.length) toast(`✦ 빔몬 도감 완성! ${CREATURES.length}종의 빛을 모두 모았어요.`);
    else if (result.levelUp && c.evolvesTo && game.active().level >= c.evolutionLevel) toast(`${c.name}의 진화가 준비됐어요. 나의 동료에서 새로운 모습을 만나보세요!`);
    else if (game.state.caught >= 3 && !game.state.questClaimed) toast('첫 번째 목표를 달성했어요. 오른쪽에서 보상을 받아보세요!');
  }
  busy = false; setBattleButtons(false);
}
function openView(view) {
  if (view === 'field') { modal.close(); return; }
  if (busy || game.battle) return toast('지금 만난 친구에게 먼저 집중해 주세요.');
  currentView = view; world.setEnabled(false);
  const titles = {dex:['EXPANDED FIELD GUIDE','빔몬 도감'],types:['KNOW YOUR PARTNER','속성 상성 안내'],team:['BETTER TOGETHER','나의 동료'],bag:['READY FOR ADVENTURE','가방 & 보급 상점'],map:['A LITTLE WORLD','어디로 떠나볼까?'],settings:['MAKE YOURSELF AT HOME','모험 설정'],about:['THE STORY OF BEAMCATCH','작은 빛, 새로운 모험'],reset:['A NEW BEGINNING','처음부터 다시 시작할까요?']};
  const [eyebrow,title] = titles[view] || titles.about;
  $('modal-eyebrow').textContent = eyebrow; $('modal-title').textContent = title;
  const state = game.state;
  if (view === 'dex') {
    $('modal-body').innerHTML = `<div class="dex-summary"><div><strong>${state.collection.length}<span> / ${CREATURES.length}</span></strong><p>수집한 빔몬 · 발견 ${state.seen.length}종</p></div><span>기본형 ${CREATURES.filter(c=>c.form==='base').length}<br>진화형 ${CREATURES.filter(c=>c.form==='evolved').length} · 희귀 변종 ${CREATURES.filter(c=>c.form==='variant').length}</span></div><p class="modal-intro">사진을 눌러 서식지와 진화 조건을 확인하세요.<br>기본형은 Lv. 10에 진화하고, 희귀 변종은 낮과 밤에 다르게 나타나요.</p><div class="dex-toolbar"><input id="dex-search" aria-label="빔몬 이름 검색" placeholder="이름 / 속성 / 원래 캐릭터 검색"><select id="dex-type" aria-label="속성 필터"><option value="">모든 속성</option>${Object.keys(TYPE_STRENGTHS).map(type=>`<option ${dexType===type?'selected':''}>${type}</option>`).join('')}</select></div><div class="dex-filters">${[['all','전체'],['owned','수집'],['evolved','진화형'],['variant','희귀 변종']].map(([key,label])=>`<button class="filter-button ${dexFilter===key?'selected':''}" data-filter="${key}" aria-pressed="${dexFilter===key}">${label}</button>`).join('')}<button class="type-guide-link" data-view="types">상성 안내 ↗</button></div><p class="dex-results" id="dex-results" aria-live="polite"></p><div class="dex-grid" id="dex-grid"></div>`; renderDex();
  } else if (view === 'types') {
    $('modal-body').innerHTML = `<p class="modal-intro">왼쪽 속성의 기술은 오른쪽 상대에게 <strong>1.5배</strong> 피해를 줘요.<br>반대 방향은 0.75배, 같은 속성과 나머지 조합은 1배예요. 상대의 반격에도 적용됩니다.</p><div class="type-chart">${Object.entries(TYPE_STRENGTHS).map(([from,to])=>`<div><strong>${from}</strong><span>→ ×1.5 →</span><strong>${to}</strong></div>`).join('')}</div><p class="shop-note">전투 화면에 현재 파트너의 상성 배율이 표시돼요.<br>파트너 교체는 전투를 마친 뒤 나의 동료에서 할 수 있어요.</p><button class="primary-button" data-view="dex">도감으로 돌아가기</button>`;
  } else if (view === 'team') {
    const memberRow = (m, inBox = false) => {
      const c = species(m.speciesId), active = m.uid === state.activeUid;
      const canEvolve = c.evolvesTo && m.level >= c.evolutionLevel;
      return `<div class="team-row ${active ? 'current' : ''}">${portrait(c,'small')}<div class="team-info"><h3>${c.name}<small>Lv. ${m.level} · ${c.type}</small></h3><div class="hp-track"><i style="width:${m.hp / m.maxHp * 100}%"></i></div><p>HP ${m.hp} / ${m.maxHp} · ${m.xp} EXP</p><p>${FORM_LABELS[c.form]} · ${c.evolvesTo ? `Lv. ${c.evolutionLevel} → ${species(c.evolvesTo).name}` : c.move}</p></div><div class="team-row-actions"><button data-select="${m.uid}" ${active ? 'disabled' : ''}>${active ? '함께 걷는 중' : inBox ? '파트너 교체' : '파트너로'}</button>${c.evolvesTo ? `<button class="evolve-button" data-evolve="${m.uid}" ${canEvolve?'':'disabled'}>${canEvolve ? '✦ 진화하기' : `Lv. ${c.evolutionLevel} 진화`}</button>` : ''}</div></div>`;
    };
    $('modal-body').innerHTML = `<p class="modal-intro">${state.party.length} / 6명의 친구와 함께 모험하고 있어요.<br>선두가 전투 경험치를 얻어요. 기본형은 Lv. 10부터 원하는 때 진화할 수 있어요.</p><div class="team-list">${state.party.map(m=>memberRow(m)).join('')}</div>${state.box?.length ? `<h3 style="font-size:13px;margin-top:24px">마을에서 쉬는 친구들 · ${state.box.length}</h3><p class="modal-intro">선택하면 지금 파트너와 자리를 바꿔요.</p><div class="team-list">${state.box.map(m=>memberRow(m,true)).join('')}</div>` : ''}`;
  } else if (view === 'bag') {
    $('modal-body').innerHTML = `<p class="modal-intro">필요한 준비물을 챙겨보세요. 어디서든 보급받을 수 있어요.</p><div class="shop-balance"><span>내가 모은 골드</span><strong>${state.coins.toLocaleString()} G</strong></div><div class="shop-item"><span class="beam-ball"></span><div><h3>빔볼 <small>× ${state.balls}</small></h3><p>친구에게 마음을 전하는 작은 볼.<br>5개 묶음 · 50 G</p></div><button data-buy="balls" ${state.coins < 50 ? 'disabled' : ''}>5개 구매</button></div><div class="shop-item"><span class="potion-icon">✚</span><div><h3>상처약 <small>× ${state.potions}</small></h3><p>파트너의 HP를 35 회복해요.<br>1개 · 30 G</p></div><button data-buy="potions" ${state.coins < 30 ? 'disabled' : ''}>1개 구매</button></div><div class="settings-row"><div><strong>파트너 회복하기</strong><p>${species(game.active().speciesId).name} · HP ${game.active().hp} / ${game.active().maxHp}</p></div><button data-use-potion ${state.potions < 1 || game.active().hp === game.active().maxHp ? 'disabled' : ''}>상처약 사용</button></div><p class="shop-note">✦ 전투에서 이기거나 친구를 포획하면 골드를 얻어요.<br>마을에서 쉬어가면 모든 동료가 무료로 회복됩니다.</p>`;
  } else if (view === 'map') {
    $('modal-body').innerHTML = `<p class="modal-intro">현재는 ${night?'밤':'낮'}이에요. 지도의 해·달 버튼으로 시간을 바꿀 수 있어요.<br>지역을 선택하면 바로 이동해요. 진화형은 동료를 키워서 만나요.</p><div class="region-cards">`+REGIONS.map((r,i)=>`<button class="region-card ${state.position.region === r.id ? 'current' : ''}" data-region="${r.id}"><span class="region-art">${['♧','≋','♜'][i]}</span><div><h3>${r.name}</h3><small>${r.subtitle}<br>야생 레벨 ${['3–6','5–8','7–10'][i]} · 총 ${CREATURES.filter(c=>inField(c,r.id)).length}종 / 지금 ${CREATURES.filter(c=>inField(c,r.id)&&availableNow(c)).length}종</small></div><span>${state.position.region === r.id ? '●' : '↗'}</span></button>`).join('')+'</div>';
  } else if (view === 'settings') {
    $('modal-body').innerHTML = `<div class="settings-row"><div><strong>작은 효과음</strong><p>만남과 포획 순간을 소리로 남겨요.</p></div><button data-setting="sound">${sound ? '켜짐 ♪' : '꺼짐'}</button></div><div class="settings-row"><div><strong>마을의 시간</strong><p>분위기에 맞춰 낮과 밤을 바꿔보세요.</p></div><button data-setting="night">${night ? '밤 ☾' : '낮 ☀'}</button></div><div class="settings-row"><div><strong>모험 저장</strong><p>이 브라우저에 자동 저장해요. 기기 간 연동은 지원하지 않아요.</p></div><button data-save>지금 저장</button></div><div class="settings-row"><div><strong>새로운 모험</strong><p>현재 동료, 도감과 가방 기록이 초기화됩니다.</p></div><button class="danger" data-view="reset">처음부터</button></div><p class="shop-note">방향키 / WASD : 이동 · E / 스페이스 : 대화<br>화면의 지도를 눌러 이동할 수도 있어요. 모바일은 하단 방향 버튼을 사용하세요.</p>`;
  } else if (view === 'reset') {
    $('modal-body').innerHTML = '<p class="about-copy">지금까지 모은 동료, 도감, 골드와 탐험 기록이 삭제돼요.<br>희범과 처음 만났던 날부터 다시 시작합니다.</p><div class="confirm-actions"><button data-view="settings">돌아가기</button><button class="danger" data-reset>새 모험 시작</button></div>';
  } else {
    $('modal-body').innerHTML = `<p class="about-copy">어릴 적 작은 화면 속에서 시작했던 큰 모험을 기억하나요?<br><strong>beamcatch</strong>는 그 설렘에 우리의 얼굴을 더한 탐험·수집 게임입니다.</p><p class="about-copy"><a href="https://github.com/hooni9807/beamrpg" target="_blank" rel="noopener noreferrer">beamrpg</a>와 <a href="https://github.com/hooni9807/spin-tt" target="_blank" rel="noopener noreferrer">spin-tt</a>의 사진과 캐릭터 이름을 바탕으로 기본형 12종, 진화형 12종, 희귀 변종 12종을 만들었습니다. 같은 캐릭터의 성장을 사진, 속성 문양과 오라로 표현했어요.</p><p class="about-copy">작은 마을, 풀숲의 만남, 턴제 전투와 도감은 <a href="https://www.pokemon.co.jp/game/other/gbc-gs/" target="_blank" rel="noopener noreferrer">포켓몬스터 금·은</a>을 참고했습니다. 공식 포켓몬 게임과 관계없는 개인 오마주 프로젝트입니다.<br>3개 지역 · ${CREATURES.length}종 도감 · 10개 속성 · Lv. 10 진화</p><p class="shop-note">BEAMCATCH · SECOND ADVENTURE · v2.0</p>`;
  }
  if (!modal.open) modal.showModal();
}
function renderDex() {
  const search = ($('dex-search')?.value || '').trim().toLowerCase();
  const list = CREATURES.filter(c => (dexFilter === 'all' || (dexFilter === 'owned' ? game.state.collection.includes(c.id) : c.form === dexFilter)) && (!dexType || c.type === dexType) && (!search || `${c.name} ${c.type} ${species(c.family).name}`.toLowerCase().includes(search)));
  $('dex-results').textContent = `${list.length}종 표시 · 전체 ${CREATURES.length}종`;
  $('dex-grid').innerHTML = list.map(c => {
    const owned = game.state.collection.includes(c.id), seen = game.state.seen.includes(c.id);
    return `<button class="dex-card form-${c.form}" data-creature="${c.id}" style="--aura:${c.color}"><small>NO. ${String(c.no).padStart(3,'0')} · ${FORM_LABELS[c.form]}</small>${owned ? '<span class="owned-badge">✓</span>' : ''}${portrait(c)}<h3>${c.name}</h3><span class="type-pill" style="background:${c.color}24;border-color:${c.color}60">${c.emblem} ${c.type}</span><p>${owned ? '✓ 수집 완료' : seen ? '발견 · 미수집' : '미발견'}<br>${c.form === 'evolved' ? 'Lv. 10 진화로 만나요' : `${c.rarity==='rare'?'희귀 · ':''}${timeLabel(c.activeTime)}`}</p></button>`;
  }).join('') || '<p class="empty-message">조건에 맞는 친구가 없어요. 필터를 바꿔보세요.</p>';
}
function openCreature(id) {
  if (game.battle || busy) return;
  const c = species(id), seen = game.state.seen.includes(id), owned = game.state.collection.includes(id);
  const family = species(c.family), evolved = species(family.evolvesTo), variant = CREATURES.find(s=>s.family === c.family && s.form === 'variant');
  world.setEnabled(false); currentView = 'creature'; $('modal-eyebrow').textContent = `FIELD GUIDE / NO. ${String(c.no).padStart(3,'0')}`; $('modal-title').textContent = c.name;
  $('modal-body').innerHTML = `<div class="dex-detail">${portrait(c,'large')}<span class="type-pill" style="background:${c.color}24;border-color:${c.color}60">${c.emblem} ${c.type} · ${FORM_LABELS[c.form]}</span><p>${c.description}</p><div class="detail-stats"><div><span>기본 체력</span>${c.baseHp}</div><div><span>공격력</span>${c.attack}</div><div><span>기술</span>${c.move}</div></div><div class="detail-habitat">${c.form==='evolved' ? `${family.name}를 Lv. ${family.evolutionLevel}까지 키운 뒤 나의 동료에서 진화하세요.` : `서식지 · ${c.habitats.map(r=>REGIONS.find(x=>x.id===r).name).join(' / ')}<br>${timeLabel(c.activeTime)} 출현${c.rarity==='rare'?' · 희귀한 만남':''}`}</div><p class="type-relation">${c.type} 기술 → ${TYPE_STRENGTHS[c.type]} 상대에게 피해 1.5배</p><div class="family-line"><button data-creature="${family.id}">${portrait(family,'small')}<span>${family.name}</span></button><span class="family-arrow">Lv. ${family.evolutionLevel}<br>→</span><button data-creature="${evolved.id}">${portrait(evolved,'small')}<span>${evolved.name}</span></button><button data-creature="${variant.id}">${portrait(variant,'small')}<span>${variant.name}<small>별도 포획 · ${timeLabel(variant.activeTime)}</small></span></button></div><p>${owned ? '✓ 도감에 등록된 친구예요.' : seen ? '발견했지만 아직 수집하지 않았어요.' : '도감에 사진만 등록된 미발견 친구예요.'}</p><div class="detail-buttons"><button class="filter-button" data-view="dex">도감 목록</button><button class="primary-button" data-view="${c.form==='evolved'?'team':'map'}">${c.form==='evolved'?'나의 동료에서 진화':'만나러 가기'} ↗</button></div></div>`;
  if (!modal.open) modal.showModal();
}
function evolve(uid) {
  if (busy || game.battle) return;
  const result = game.evolve(uid);
  if (result.type !== 'evolve') return toast(result.message,true);
  render(); chime('catch'); speak(result.message,'새로운 빛으로!');
  const from = species(result.from), to = species(result.to);
  currentView = 'evolution'; $('modal-eyebrow').textContent = 'A NEW LIGHT AWAKENS'; $('modal-title').textContent = '새로운 모습으로 진화했어요!';
  $('modal-body').innerHTML = `<div class="evolution-result"><div class="evolution-pair"><div>${portrait(from)}<p>${from.name}</p></div><span>✦<br>→</span><div>${portrait(to)}<p>${to.name}</p></div></div><p>${result.message}</p><p class="modal-intro">레벨과 경험치, 함께한 기록은 그대로예요.<br>${to.type} 속성 · ${to.move} 기술 · 도감 ${game.state.collection.length} / ${CREATURES.length}</p><button class="primary-button" data-view="team">함께 모험하기 ↗</button></div>`;
  if (!modal.open) modal.showModal();
  if (game.state.collection.length === CREATURES.length) toast(`✦ ${CREATURES.length}종 도감을 완성했어요!`);
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
$('time-button').addEventListener('click',()=> { if(busy || game.battle)return; night = !night; world.setNight(night); updatePreferences(); render(); toast(`${night?'밤':'낮'}이 됐어요. 이 시간에만 나타나는 희귀 변종을 찾아보세요.`); });
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
  else if (d.evolve) evolve(d.evolve);
  else if (d.select) { const result = game.select(d.select); render(); openView('team'); speak(result.message); toast(result.message); }
  else if (d.buy) { const result = game.buy(d.buy); render(); openView('bag'); toast(result.message,result.type === 'error'); chime(); }
  else if ('usePotion' in d) { const result = game.action('potion'); render(); openView('bag'); toast(result.message); chime('heal'); }
  else if (d.filter) { dexFilter = d.filter; document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.filter === d.filter);b.setAttribute('aria-pressed',String(b.dataset.filter===d.filter));}); renderDex(); }
  else if (d.setting) { if(d.setting === 'sound') sound = !sound; else { night = !night; world.setNight(night); } updatePreferences(); render(); openView('settings'); chime(); }
  else if ('save' in d) toast(game.save() ? '이 브라우저에 모험을 저장했어요.' : '저장하지 못했어요. 브라우저 저장 공간을 확인해주세요.',!game.storage);
  else if ('reset' in d) { game.reset(); world.setPosition(game.state.position); render(); modal.close(); speak('희범과 새로운 모험을 시작해요!'); toast('새로운 모험이 시작됐어요.'); }
});
document.addEventListener('input',event=> { if (event.target.id === 'dex-search') renderDex(); });
document.addEventListener('change',event=> { if (event.target.id === 'dex-type') {dexType = event.target.value; renderDex();} });
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
