import Phaser from 'phaser';
import { GardenScene } from './GardenScene.js';
import './style.css';

const SAVE_KEY = 'mosslight-garden-save-v1';
const PLOT_COUNT = 5;
const emptyDailyProgress = () => ({ plants: 0, harvests: 0, dew: 0 });
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const SEEDS = [
  { id: 'moss', name: '苔苔傘菇', shortName: '苔苔傘菇', emoji: '🍄', cost: 22, growMs: 45_000, reward: 30, rate: 0.22, note: '很願意陪你慢慢長大' },
  { id: 'star', name: '星星點點菇', shortName: '星星菇', emoji: '🌟', cost: 42, growMs: 90_000, reward: 54, rate: 0.34, note: '夜裡會悄悄亮起來' },
  { id: 'honey', name: '蜜糖小圓菇', shortName: '蜜糖菇', emoji: '🌼', cost: 68, growMs: 150_000, reward: 86, rate: 0.5, note: '把甜甜的香氣留給森林' },
];

const TASKS = [
  { id: 'plant', title: '邀請兩位新朋友', note: '種下 2 株蘑菇', icon: '♧', goal: 2, reward: 25, progress: (state) => state.dailyProgress.plants },
  { id: 'harvest', title: '收下一份小禮物', note: '採收 1 株成熟蘑菇', icon: '✿', goal: 1, reward: 30, progress: (state) => state.dailyProgress.harvests },
  { id: 'dew', title: '收集一把晨露', note: '累積收集 50 點露珠', icon: '✧', goal: 50, reward: 20, progress: (state) => state.dailyProgress.dew },
];

function freshState() {
  const now = Date.now();
  return {
    version: 1,
    coins: 120,
    xp: 24,
    totalCollected: 0,
    plantedTotal: 1,
    harvestTotal: 0,
    dayStartedAt: now,
    lastTick: now,
    dailyDate: localDateKey(),
    dailyProgress: emptyDailyProgress(),
    claimed: {},
    discovered: ['moss'],
    plants: [
      { type: 'moss', plantedAt: now - 105_000, readyAt: now - 60_000, lastDewAt: now - 35_000, stored: 8 },
      null, null, null, null,
    ],
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved || saved.version !== 1) return freshState();
    const base = freshState();
    const state = {
      ...base,
      ...saved,
      plants: Array.from({ length: PLOT_COUNT }, (_, index) => saved.plants?.[index] || null),
      claimed: saved.claimed || {},
      dailyProgress: { ...emptyDailyProgress(), ...saved.dailyProgress },
      discovered: saved.discovered?.length ? saved.discovered : ['moss'],
    };
    if (!Number.isFinite(state.lastTick)) state.lastTick = Date.now();
    return state;
  } catch {
    return freshState();
  }
}

let state = loadState();
let selectedSeed = 'moss';
let scene = null;
let saveTimer = 0;
let toastTimer = 0;
let audioContext = null;
let soundOn = true;
let modalCloseAction = null;

const $ = (selector) => document.querySelector(selector);
const seedFor = (id) => SEEDS.find((seed) => seed.id === id) || SEEDS[0];

function resetDailyIfNeeded() {
  const today = localDateKey();
  if (state.dailyDate === today) return;
  state.dailyDate = today;
  state.dailyProgress = emptyDailyProgress();
  state.claimed = {};
  persist();
}

function persist() {
  state.lastTick = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* Storage can be unavailable in private browsing. */ }
}

function advanceIdle(now = Date.now()) {
  for (const plant of state.plants) {
    if (!plant || now <= plant.readyAt) continue;
    const from = Math.max(plant.lastDewAt || plant.readyAt, plant.readyAt);
    if (now > from) {
      plant.stored = (plant.stored || 0) + ((now - from) / 1000) * seedFor(plant.type).rate;
      plant.lastDewAt = now;
    }
  }
  state.lastTick = now;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2300);
}

function playChime() {
  if (!soundOn) return;
  try {
    audioContext ||= new window.AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    [784, 1046].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.055, now + index * 0.07 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.55);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + index * 0.07 + 0.57);
    });
  } catch { /* Audio is an optional little flourish. */ }
}

function levelInfo() {
  return { level: Math.floor(state.xp / 100) + 1, within: state.xp % 100 };
}

function showModal(title, html, actionLabel = '知道了，慢慢來', onClose = null) {
  $('#modal-title').textContent = title;
  $('#modal-content').innerHTML = html;
  $('#modal-action').textContent = actionLabel;
  modalCloseAction = onClose;
  $('#modal-backdrop').classList.add('open');
  $('#modal-backdrop').setAttribute('aria-hidden', 'false');
}

function closeModal() {
  $('#modal-backdrop').classList.remove('open');
  $('#modal-backdrop').setAttribute('aria-hidden', 'true');
  const callback = modalCloseAction;
  modalCloseAction = null;
  callback?.();
}

function renderSeedCards() {
  const wrapper = $('#seed-options');
  wrapper.innerHTML = SEEDS.map((seed) => `
    <button class="seed-card ${selectedSeed === seed.id ? 'selected' : ''}" data-seed="${seed.id}" aria-pressed="${selectedSeed === seed.id}">
      <span class="seed-art">${seed.emoji}</span>
      <span class="seed-copy"><strong>${seed.name}</strong><small>${seed.note}</small></span>
      <span class="seed-cost"><span>✦</span>${seed.cost}</span>
    </button>
  `).join('');
  wrapper.querySelectorAll('[data-seed]').forEach((button) => button.addEventListener('click', () => {
    selectedSeed = button.dataset.seed;
    renderSeedCards();
    $('#garden-hint').classList.remove('hidden');
    $('#garden-hint').innerHTML = `<span class="hint-icon">✦</span><span>已選好${seedFor(selectedSeed).name}，點一塊空地讓它住下來。</span>`;
  }));
}

function renderTasks() {
  $('#task-list').innerHTML = TASKS.map((task) => {
    const progress = Math.min(task.goal, task.progress(state));
    const claimed = Boolean(state.claimed[task.id]);
    const complete = progress >= task.goal;
    return `<div class="task-item">
      <span class="task-badge">${task.icon}</span>
      <span class="task-copy"><strong>${task.title}</strong><small>${task.note}・${progress}/${task.goal}</small></span>
      ${claimed ? '<button class="task-claim" disabled>已完成</button>' : complete ? `<button class="task-claim" data-claim="${task.id}">領取</button>` : `<span class="task-reward">✦ <b>${task.reward}</b></span>`}
    </div>`;
  }).join('');
  $('#task-list').querySelectorAll('[data-claim]').forEach((button) => button.addEventListener('click', () => claimTask(button.dataset.claim)));
}

function renderCollection() {
  const count = state.discovered.length;
  const latest = SEEDS.find((seed) => seed.id === state.discovered.at(-1)) || SEEDS[0];
  $('#collection-name').textContent = count > 1 ? `${latest.name} 已加入` : `${latest.name} 已加入`;
  $('#collection-subtitle').textContent = count > 1 ? '牠在你的森林裡找到新朋友了' : '圓圓的傘，喜歡柔柔的晨光';
  $('.collection-mushroom').textContent = latest.emoji;
  $('#species-count').textContent = `${count} / ${SEEDS.length} 種`;
  $('#species-progress').style.width = `${(count / SEEDS.length) * 100}%`;
  $('#seed-total').textContent = `${count} / ${SEEDS.length} 種已遇見`;
}

function render() {
  const { level, within } = levelInfo();
  $('#dew-count').textContent = Math.floor(state.coins).toLocaleString('zh-TW');
  $('#planted-count').textContent = state.plants.filter(Boolean).length;
  $('#collected-count').textContent = Math.floor(state.totalCollected).toLocaleString('zh-TW');
  $('#level-label').textContent = `LV. ${level}`;
  $('#xp-label').textContent = `${within} / 100 XP`;
  $('#xp-progress').style.width = `${within}%`;
  const days = Math.max(1, Math.floor((Date.now() - state.dayStartedAt) / 86_400_000) + 1);
  $('#day-label').textContent = `森林日記・第 ${days} 天`;
  renderTasks();
  renderCollection();
  scene?.sync(state, SEEDS);
}

function claimTask(taskId) {
  const task = TASKS.find((item) => item.id === taskId);
  if (!task || state.claimed[taskId] || task.progress(state) < task.goal) return;
  state.claimed[taskId] = true;
  state.coins += task.reward;
  state.xp += 10;
  persist();
  render();
  playChime();
  showToast(`願望完成，收下 ${task.reward} 點露珠 ✦`);
}

function handlePlotClick(index) {
  advanceIdle();
  const plant = state.plants[index];
  if (plant) {
    if (Date.now() < plant.readyAt) {
      showToast(`再等一下下，${seedFor(plant.type).name}還在長大 🌱`);
      return;
    }
    const seed = seedFor(plant.type);
    const yieldAmount = seed.reward + Math.floor(plant.stored || 0);
    state.coins += yieldAmount;
    state.totalCollected += yieldAmount;
    state.harvestTotal += 1;
    state.dailyProgress.harvests += 1;
    state.dailyProgress.dew += yieldAmount;
    state.xp += 18;
    state.plants[index] = null;
    persist();
    render();
    playChime();
    showToast(`收下 ${yieldAmount} 點露珠，謝謝你照顧它 ✨`);
    $('#garden-hint').classList.add('hidden');
    return;
  }

  const seed = seedFor(selectedSeed);
  if (state.coins < seed.cost) {
    showToast(`還差一點露珠才能種下${seed.name}，再採收一朵吧。`);
    return;
  }
  state.coins -= seed.cost;
  const now = Date.now();
  state.plants[index] = { type: seed.id, plantedAt: now, readyAt: now + seed.growMs, lastDewAt: now + seed.growMs, stored: 0 };
  state.plantedTotal += 1;
  state.dailyProgress.plants += 1;
  state.xp += 5;
  if (!state.discovered.includes(seed.id)) state.discovered.push(seed.id);
  persist();
  render();
  playChime();
  showToast(`${seed.name}找到喜歡的小角落了 🌿`);
  $('#garden-hint').classList.add('hidden');
}

function showGardenHelp() {
  showModal('照顧花園的小方法', `
    <p><b>① 選一顆種子：</b>下方卡片會顯示需要的露珠和大約生長時間。</p>
    <p><b>② 點一塊空地：</b>種子就會在那裡慢慢長大。每株蘑菇成熟後，還會替你收集露珠。</p>
    <p><b>③ 點成熟的蘑菇：</b>收下露珠與森林經驗，再把空位留給新的朋友。</p>
    <p>離開時也會繼續生長。你的花園進度會自動保存在這台裝置上。</p>
  `);
}

function setupEvents() {
  $('#garden-help').addEventListener('click', showGardenHelp);
  $('#garden-menu').addEventListener('click', () => showModal('給花園一個新開始？', '<p>重新開始會清除這台裝置上已保存的森林進度。</p><p>如果你只是想休息，直接關掉視窗就可以了。</p>', '清除並重新開始', () => {
    localStorage.removeItem(SAVE_KEY);
    state = freshState();
    selectedSeed = 'moss';
    persist();
    renderSeedCards();
    render();
    showToast('新的森林日記，從今天開始 🌱');
  }));
  $('#dew-info').addEventListener('click', () => showModal('露珠從哪裡來？', '<p>成熟的蘑菇會在森林裡慢慢收集露珠。點一下成熟的蘑菇，就能把露珠帶回來。</p><p>也可以完成右邊的今日小願望，得到一點額外鼓勵。</p>'));
  $('#inventory-button').addEventListener('click', () => showModal('森林圖鑑', `<p>目前遇見了 <b>${state.discovered.length} / ${SEEDS.length}</b> 種蘑菇。</p><p>${SEEDS.map((seed) => `${state.discovered.includes(seed.id) ? seed.emoji : '？'} ${state.discovered.includes(seed.id) ? seed.name : '還沒遇見'}`).join('<br />')}</p>`));
  $('#sound-toggle').addEventListener('click', () => {
    soundOn = !soundOn;
    $('#sound-icon').textContent = soundOn ? '♫' : '♪';
    $('#sound-toggle').setAttribute('aria-label', soundOn ? '關閉輕柔音效' : '開啟輕柔音效');
    showToast(soundOn ? '輕柔音效已開啟' : '已切換為安靜模式');
  });
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-action').addEventListener('click', closeModal);
  $('#modal-backdrop').addEventListener('click', (event) => { if (event.target === $('#modal-backdrop')) closeModal(); });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
}

function updateClock() {
  const now = new Date();
  const hour = now.getHours();
  const period = hour < 11 ? '上午' : hour < 17 ? '午后' : '夜晚';
  $('#clock').textContent = `${period} ${String(hour % 12 || 12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function start() {
  resetDailyIfNeeded();
  setupEvents();
  renderSeedCards();
  window.__mosslightScene = null;
  window.gardenActions = { onPlot: handlePlotClick };
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#cfe8dc',
    scale: { mode: Phaser.Scale.RESIZE, width: 1100, height: 650, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false, roundPixels: false },
    input: { mouse: { preventDefaultWheel: true }, touch: { capture: true } },
    scene: [GardenScene],
  });
  const attachScene = (readyScene) => {
    scene = readyScene;
    render();
  };
  if (window.__mosslightScene) attachScene(window.__mosslightScene);
  else game.events.once('garden-ready', attachScene);
  advanceIdle();
  render();
  updateClock();
  window.setInterval(() => {
    resetDailyIfNeeded();
    advanceIdle();
    render();
    if (++saveTimer >= 5) { persist(); saveTimer = 0; }
    updateClock();
  }, 1000);
  window.addEventListener('beforeunload', persist);
}

start();
