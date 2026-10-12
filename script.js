/**
 * BFS Pathfinding Game Edition
 * Muallif: Asadbek Qulboyev
 * Haqiqiy o'yin tovushlari, silliq harakatlanuvchi qahramon va to'liq BFS vizualizatori
 */

// --- Boshlang'ich Foydalanuvchi Gridi ---
const USER_PRESET = [
  ['S', '|', '.', 'X', '.'],
  ['.', '|', '.', 'X', '.'],
  ['.', '|', '.', 'X', '.'],
  ['.', '|', '.', 'X', '.'],
  ['.', '|', '.', 'X', '.'],
  ['.', '|', '.', 'X', '.'],
  ['.', 'X', '.', 'X', '.'],
  ['.', '.', 'G', '.', '.'],
  ['.', 'X', 'X', 'X', '.'],
  ['.', ',', '0', '.', '.']
];

// Grid holati
let rows = 10;
let cols = 5;
let grid = [];
let start = [0, 0];
let goal = [7, 2];
const CELL_SIZE = 44;
const CELL_GAP = 4;

// Foydalanuvchi rejimi
let currentDrawMode = 'wall';
let isMouseDown = false;
let isDraggingStart = false;
let isDraggingGoal = false;

// BFS va Qahramon holati
let isRunning = false;
let isPaused = false;
let animationSpeedMs = 35;
let bfsGenerator = null;
let currentTimerId = null;
let exploredCount = 0;
let startTime = 0;
let lastFoundPath = null;
let selectedHero = 'bot';

// Tovush va Musiqa tizimi (Web Audio API)
let sfxEnabled = true;
let bgmEnabled = false;
let audioCtx = null;
let bgmOsc = null;
let bgmGain = null;
let bgmIntervalId = null;

// DOM Elementlari
const gridBoard = document.getElementById('gridBoard');
const gridBoardContainer = document.getElementById('gridBoardContainer');
const fxCanvas = document.getElementById('fxCanvas');
const heroRunner = document.getElementById('heroRunner');
const heroAvatar = document.getElementById('heroAvatar');
const victoryBanner = document.getElementById('victoryBanner');
const victoryTitle = document.getElementById('victoryTitle');
const victoryDesc = document.getElementById('victoryDesc');

const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const stepBtn = document.getElementById('stepBtn');
const pauseBtn = document.getElementById('pauseBtn');
const replayHeroBtn = document.getElementById('replayHeroBtn');
const clearPathBtn = document.getElementById('clearPathBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

const heroSelect = document.getElementById('heroSelect');
const presetSelect = document.getElementById('presetSelect');
const gridSizeSelect = document.getElementById('gridSizeSelect');
const speedSlider = document.getElementById('speedSlider');
const speedValueText = document.getElementById('speedValueText');

const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundText = document.getElementById('soundText');
const bgmToggleBtn = document.getElementById('bgmToggleBtn');
const bgmText = document.getElementById('bgmText');

const statPathLength = document.getElementById('statPathLength');
const statVisited = document.getElementById('statVisited');
const statQueueSize = document.getElementById('statQueueSize');
const statTime = document.getElementById('statTime');

const currentNodeCoord = document.getElementById('currentNodeCoord');
const currentNodeDesc = document.getElementById('currentNodeDesc');
const queueChips = document.getElementById('queueChips');
const queueCountBadge = document.getElementById('queueCountBadge');

const modeButtons = document.querySelectorAll('.segment-btn');

// ================= AUDIO TIZIMI (Web Audio API) =================
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, type = 'sine', duration = 0.05, gainValue = 0.04) {
  if (!sfxEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainValue, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

// Skaner ping ovozi (radar)
function playScanPing(r, c) {
  if (!sfxEnabled) return;
  const baseFreq = 260 + (r * 22 + c * 16);
  playTone(baseFreq, 'sine', 0.035, 0.025);
}

// Navbatga qo'shilganda qisqa laser chirp
function playEnqueueChirp() {
  if (!sfxEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.035);
  } catch (e) {}
}

// Qahramon qadam tovushi (Pentaonik ko'tariluvchi akkordlar)
function playHeroStepSound(index, total) {
  if (!sfxEnabled) return;
  const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
  const noteIdx = Math.min(pentatonic.length - 1, Math.floor((index / Math.max(1, total)) * pentatonic.length));
  const freq = pentatonic[noteIdx] || 440;
  playTone(freq, 'triangle', 0.12, 0.07);
}

// G'alaba tantanasi (Arcade Fanfare)
function playVictoryFanfare() {
  if (!sfxEnabled) return;
  const chords = [
    { freq: 523.25, time: 0 },    // C5
    { freq: 659.25, time: 80 },   // E5
    { freq: 783.99, time: 160 },  // G5
    { freq: 1046.50, time: 240 }, // C6
    { freq: 1318.51, time: 380 }  // E6
  ];
  chords.forEach(note => {
    setTimeout(() => {
      playTone(note.freq, 'square', 0.22, 0.06);
    }, note.time);
  });
}

// Yo'l topilmaganda buzz
function playDefeatSound() {
  if (!sfxEnabled) return;
  playTone(130, 'sawtooth', 0.35, 0.08);
}

// Kiber Fon Musiqasi (Arpeggiated Cyber Synth)
function toggleBGM() {
  bgmEnabled = !bgmEnabled;
  if (bgmEnabled) {
    bgmToggleBtn.classList.add('active');
    bgmText.textContent = 'Fon Musiqa: Yoqilgan';
    startCyberBgm();
  } else {
    bgmToggleBtn.classList.remove('active');
    bgmText.textContent = 'Fon Musiqa: O\'chiq';
    stopCyberBgm();
  }
}

function startCyberBgm() {
  initAudio();
  if (!audioCtx) return;
  stopCyberBgm();

  const bassNotes = [130.81, 146.83, 164.81, 196.00, 174.61]; // C3, D3, E3, G3, F3
  let noteIdx = 0;

  bgmIntervalId = setInterval(() => {
    if (!bgmEnabled) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassNotes[noteIdx % bassNotes.length], audioCtx.currentTime);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
      noteIdx++;
    } catch (e) {}
  }, 220);
}

function stopCyberBgm() {
  if (bgmIntervalId) {
    clearInterval(bgmIntervalId);
    bgmIntervalId = null;
  }
}

// ================= ZARRALAR TIZIMI (Canvas FX) =================
let particles = [];
let ctx = null;

function initFXCanvas() {
  ctx = fxCanvas.getContext('2d');
  resizeFXCanvas();
}

function resizeFXCanvas() {
  if (!fxCanvas) return;
  fxCanvas.width = cols * (CELL_SIZE + CELL_GAP);
  fxCanvas.height = rows * (CELL_SIZE + CELL_GAP);
}

class Particle {
  constructor(x, y, color, size = 3, vx = 0, vy = 0, life = 1) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.decay = 0.02 + Math.random() * 0.03;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }
  draw(c) {
    c.save();
    c.globalAlpha = Math.max(0, this.life / this.maxLife);
    c.fillStyle = this.color;
    c.beginPath();
    c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

function emitSparks(x, y, color = '#fbbf24', count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    particles.push(new Particle(
      x,
      y,
      color,
      2 + Math.random() * 2.5,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      1
    ));
  }
}

function emitVictoryFireworks(cx, cy) {
  const colors = ['#fbbf24', '#38bdf8', '#f43f5e', '#34d399', '#a855f7'];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(
      cx,
      cy,
      color,
      3 + Math.random() * 3.5,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 1.2,
      1.5
    ));
  }
}

function renderFXLoop() {
  if (ctx) {
    ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }
  requestAnimationFrame(renderFXLoop);
}

// ================= GRID VA DOM BOSHQARUVI =================
function createEmptyGrid(r, c) {
  rows = r;
  cols = c;
  grid = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) row.push('.');
    grid.push(row);
  }
  start = [0, 0];
  goal = [Math.min(rows - 1, 7), Math.min(cols - 1, 2)];
  grid[start[0]][start[1]] = 'S';
  grid[goal[0]][goal[1]] = 'G';
}

function loadUserPreset() {
  rows = USER_PRESET.length;
  cols = USER_PRESET[0].length;
  grid = [];
  start = null;
  goal = null;

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const char = USER_PRESET[r][c];
      if (char === 'S') {
        start = [r, c];
        row.push('S');
      } else if (char === 'G') {
        goal = [r, c];
        row.push('G');
      } else if (char === 'X') {
        row.push('X');
      } else {
        row.push('.');
      }
    }
    grid.push(row);
  }

  if (!start) start = [0, 0];
  if (!goal) goal = [rows - 1, cols - 1];
  grid[start[0]][start[1]] = 'S';
  grid[goal[0]][goal[1]] = 'G';
}

function renderGridDOM() {
  gridBoard.innerHTML = '';
  gridBoard.style.gridTemplateColumns = `repeat(${cols}, ${CELL_SIZE}px)`;
  gridBoard.style.gridTemplateRows = `repeat(${rows}, ${CELL_SIZE}px)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellEl = document.createElement('div');
      cellEl.classList.add('cell');
      cellEl.dataset.r = r;
      cellEl.dataset.c = c;
      cellEl.dataset.coord = `${r},${c}`;

      const cellType = grid[r][c];
      if (cellType === 'S') {
        cellEl.classList.add('start');
        cellEl.textContent = 'S';
      } else if (cellType === 'G') {
        cellEl.classList.add('goal');
        cellEl.textContent = 'G';
      } else if (cellType === 'X') {
        cellEl.classList.add('wall');
        cellEl.textContent = 'X';
      }

      cellEl.addEventListener('mousedown', (e) => handleCellMouseDown(r, c, e));
      cellEl.addEventListener('mouseenter', () => handleCellMouseEnter(r, c));
      gridBoard.appendChild(cellEl);
    }
  }

  resizeFXCanvas();
  positionHeroAt(start[0], start[1], false);
}

function getCellElement(r, c) {
  return gridBoard.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}

function getCellPixelCenter(r, c) {
  const x = c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  const y = r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  return { x, y };
}

// Qahramonni koordinataga siljitish
function positionHeroAt(r, c, animate = true) {
  if (!heroRunner) return;
  const x = c * (CELL_SIZE + CELL_GAP);
  const y = r * (CELL_SIZE + CELL_GAP);

  if (!animate) {
    heroRunner.style.transition = 'none';
  } else {
    heroRunner.style.transition = `transform var(--hero-speed) cubic-bezier(0.2, 0.8, 0.2, 1)`;
  }

  heroRunner.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

// ================= INTERAKSIYA =================
function handleCellMouseDown(r, c, e) {
  e.preventDefault();
  if (isRunning) return;

  isMouseDown = true;
  const isStart = (r === start[0] && c === start[1]);
  const isGoal = (r === goal[0] && c === goal[1]);

  if (isStart) {
    isDraggingStart = true;
    return;
  }
  if (isGoal) {
    isDraggingGoal = true;
    return;
  }

  applyTool(r, c);
}

function handleCellMouseEnter(r, c) {
  if (!isMouseDown || isRunning) return;
  if (isDraggingStart) {
    moveStartTo(r, c);
    return;
  }
  if (isDraggingGoal) {
    moveGoalTo(r, c);
    return;
  }
  applyTool(r, c);
}

function applyTool(r, c) {
  if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) return;

  const cellEl = getCellElement(r, c);
  if (!cellEl) return;

  clearVisualsOnly();

  if (currentDrawMode === 'wall') {
    grid[r][c] = 'X';
    cellEl.className = 'cell wall';
    cellEl.textContent = 'X';
    playTone(190, 'square', 0.035, 0.03);
    const { x, y } = getCellPixelCenter(r, c);
    emitSparks(x, y, '#64748b', 6);
  } else if (currentDrawMode === 'erase') {
    grid[r][c] = '.';
    cellEl.className = 'cell';
    cellEl.textContent = '';
    playTone(280, 'sine', 0.035, 0.03);
  } else if (currentDrawMode === 'start') {
    moveStartTo(r, c);
  } else if (currentDrawMode === 'goal') {
    moveGoalTo(r, c);
  }
}

function moveStartTo(r, c) {
  if (r === goal[0] && c === goal[1]) return;
  clearVisualsOnly();

  const oldEl = getCellElement(start[0], start[1]);
  if (oldEl) {
    oldEl.className = 'cell';
    oldEl.textContent = '';
    grid[start[0]][start[1]] = '.';
  }

  start = [r, c];
  grid[r][c] = 'S';
  const newEl = getCellElement(r, c);
  if (newEl) {
    newEl.className = 'cell start';
    newEl.textContent = 'S';
  }
  positionHeroAt(r, c, false);
  playTone(480, 'triangle', 0.05, 0.05);
}

function moveGoalTo(r, c) {
  if (r === start[0] && c === start[1]) return;
  clearVisualsOnly();

  const oldEl = getCellElement(goal[0], goal[1]);
  if (oldEl) {
    oldEl.className = 'cell';
    oldEl.textContent = '';
    grid[goal[0]][goal[1]] = '.';
  }

  goal = [r, c];
  grid[r][c] = 'G';
  const newEl = getCellElement(r, c);
  if (newEl) {
    newEl.className = 'cell goal';
    newEl.textContent = 'G';
  }
  playTone(580, 'triangle', 0.05, 0.05);
}

window.addEventListener('mouseup', () => {
  isMouseDown = false;
  isDraggingStart = false;
  isDraggingGoal = false;
});

// Rejim tanlash
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDrawMode = btn.dataset.mode;
  });
});

// Qahramon tanlash
heroSelect.addEventListener('change', (e) => {
  selectedHero = e.target.value;
  heroAvatar.className = `hero-avatar ${selectedHero}`;
  playTone(520, 'sine', 0.08, 0.05);
});

// Tezlik slaydri
speedSlider.addEventListener('input', (e) => {
  const val = Number(e.target.value);
  animationSpeedMs = Math.round(350 - (val / 100) * 345);
  let text = 'O\'rtacha';
  if (animationSpeedMs <= 10) text = 'Juda Tez (' + animationSpeedMs + 'ms)';
  else if (animationSpeedMs <= 50) text = 'Tez (' + animationSpeedMs + 'ms)';
  else if (animationSpeedMs <= 150) text = 'O\'rtacha (' + animationSpeedMs + 'ms)';
  else text = 'Sekin (' + animationSpeedMs + 'ms)';
  speedValueText.textContent = text;

  // Qahramon tezligi CSS o'zgaruvchisida
  document.documentElement.style.setProperty('--hero-speed', `${Math.max(0.08, animationSpeedMs / 1000)}s`);
});

// Audio tugmalari
soundToggleBtn.addEventListener('click', () => {
  sfxEnabled = !sfxEnabled;
  if (sfxEnabled) {
    soundToggleBtn.classList.add('active');
    soundText.textContent = 'SFX: Yoqilgan';
    playTone(660, 'sine', 0.06, 0.05);
  } else {
    soundToggleBtn.classList.remove('active');
    soundText.textContent = 'SFX: O\'chiq';
  }
});

bgmToggleBtn.addEventListener('click', toggleBGM);

// Tab almashtirish
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.dataset.tab === 'steps' ? 'tabSteps' : 'tabCode';
    document.getElementById(tabId).classList.add('active');
  });
});

// ================= BFS GENERATOR =================
function* bfsStepGenerator(grid, start, goal) {
  const queue = [start];
  const visited = new Set();
  visited.add(`${start[0]},${start[1]}`);
  const parent = {};
  const rows = grid.length;
  const cols = grid[0].length;
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  let prevHead = null;

  while (queue.length > 0) {
    const current = queue.shift();
    const [r, c] = current;

    yield {
      type: 'explore',
      current,
      prevHead,
      queue: [...queue],
      visitedSize: visited.size,
      status: `Skanerlanmoqda: [${r}, ${c}]`
    };
    prevHead = current;

    if (r === goal[0] && c === goal[1]) {
      const path = reconstructPath(parent, start, goal);
      yield {
        type: 'found',
        path,
        current,
        queue: [...queue],
        visitedSize: visited.size,
        status: `Maqsad topildi! Qadamlar: ${path.length - 1}`
      };
      return;
    }

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === 'X') continue;

      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;

      visited.add(key);
      parent[key] = `${r},${c}`;
      queue.push([nr, nc]);

      yield {
        type: 'queued',
        cell: [nr, nc],
        queue: [...queue],
        visitedSize: visited.size,
        status: `Navbatga olindi: [${nr}, ${nc}]`
      };
    }
  }

  yield {
    type: 'not_found',
    queue: [],
    visitedSize: visited.size,
    status: `Yo'l topilmadi! Barcha mumkin bo'lgan kataklar tekshirildi.`
  };
}

function reconstructPath(parent, start, goal) {
  const path = [];
  let current = `${goal[0]},${goal[1]}`;
  const startKey = `${start[0]},${start[1]}`;

  while (current !== startKey) {
    const [r, c] = current.split(',').map(Number);
    path.push([r, c]);
    current = parent[current];
  }
  path.push(start);
  return path.reverse();
}

// ================= BFS VIZUALLASHTIRISH VA QAHRAMON =================
function startBFS() {
  if (isRunning) return;

  clearVisualsOnly();
  initAudio();

  isRunning = true;
  isPaused = false;
  exploredCount = 0;
  startTime = performance.now();

  setStatus('running', 'Qidiruv boshlandi...');
  startBtn.style.display = 'none';
  pauseBtn.style.display = 'inline-flex';
  pauseBtn.querySelector('span').textContent = "To'xtatish";
  replayHeroBtn.style.display = 'none';

  positionHeroAt(start[0], start[1], false);

  bfsGenerator = bfsStepGenerator(grid, start, goal);
  runNextStepLoop();
}

function runNextStepLoop() {
  if (!isRunning || isPaused) return;

  const result = executeOneStep();

  if (result.done) {
    finishBFS(result.value);
  } else {
    currentTimerId = setTimeout(runNextStepLoop, animationSpeedMs);
  }
}

function executeOneStep() {
  if (!bfsGenerator) {
    clearVisualsOnly();
    bfsGenerator = bfsStepGenerator(grid, start, goal);
  }

  const next = bfsGenerator.next();
  if (next.done) {
    return { done: true, value: next.value };
  }

  const step = next.value;
  updateInspectorAndStats(step);

  if (step.type === 'explore') {
    const [r, c] = step.current;
    exploredCount++;

    if (step.prevHead) {
      const prevEl = getCellElement(step.prevHead[0], step.prevHead[1]);
      if (prevEl) prevEl.classList.remove('current-head');
    }

    const cellEl = getCellElement(r, c);
    if (cellEl) {
      cellEl.classList.add('current-head');
      if (!isCellStartOrGoal(r, c)) {
        cellEl.classList.add('visited');
        cellEl.classList.remove('queued');
      }
    }

    playScanPing(r, c);

  } else if (step.type === 'queued') {
    const [nr, nc] = step.cell;
    const cellEl = getCellElement(nr, nc);
    if (cellEl && !isCellStartOrGoal(nr, nc)) {
      cellEl.classList.add('queued');
    }
    playEnqueueChirp();
  } else if (step.type === 'found') {
    return { done: true, value: step };
  } else if (step.type === 'not_found') {
    return { done: true, value: step };
  }

  return { done: false };
}

function finishBFS(result) {
  isRunning = false;
  isPaused = false;
  startBtn.style.display = 'inline-flex';
  pauseBtn.style.display = 'none';

  document.querySelectorAll('.cell.current-head').forEach(el => el.classList.remove('current-head'));

  const elapsed = Math.round(performance.now() - startTime);
  statTime.textContent = `${elapsed} ms`;

  if (result && result.type === 'found') {
    lastFoundPath = result.path;
    setStatus('found', `Yo'l topildi! (${result.path.length - 1} qadam)`);
    statPathLength.textContent = `${result.path.length - 1} ta qadam`;
    replayHeroBtn.style.display = 'inline-flex';

    // Qahramonni silliq yo'l bo'ylab yugurtirish
    runHeroAlongPath(result.path);
  } else {
    lastFoundPath = null;
    setStatus('not-found', "Yo'l topilmadi!");
    statPathLength.textContent = 'Mavjud emas';
    playDefeatSound();
  }
}

// QAHRAMONNING SILIQ HARAKATI VA OVOZLARI
function runHeroAlongPath(path) {
  if (!path || path.length === 0) return;

  victoryBanner.classList.remove('show');
  positionHeroAt(path[0][0], path[0][1], false);

  let idx = 0;
  const stepDelay = Math.max(90, Math.min(220, animationSpeedMs * 2.2));

  function stepNext() {
    if (idx >= path.length) {
      // Maqsadga yetdi!
      const goalCoord = path[path.length - 1];
      const { x, y } = getCellPixelCenter(goalCoord[0], goalCoord[1]);
      emitVictoryFireworks(x, y);
      playVictoryFanfare();

      victoryTitle.textContent = 'MAQSAD FATH ETILDI!';
      victoryDesc.textContent = `Eng qisqa masofa: ${path.length - 1} qadam`;
      victoryBanner.classList.add('show');
      setTimeout(() => victoryBanner.classList.remove('show'), 3800);
      return;
    }

    const [r, c] = path[idx];
    positionHeroAt(r, c, true);

    const cellEl = getCellElement(r, c);
    if (cellEl && !isCellStartOrGoal(r, c)) {
      cellEl.classList.remove('visited', 'queued');
      cellEl.classList.add('path');
      cellEl.textContent = '*';
    }

    // Har bir qadamda uchqunlar va musiqiy tovush
    const { x, y } = getCellPixelCenter(r, c);
    emitSparks(x, y, '#fbbf24', 10);
    playHeroStepSound(idx, path.length);

    idx++;
    setTimeout(stepNext, stepDelay);
  }

  stepNext();
}

replayHeroBtn.addEventListener('click', () => {
  if (lastFoundPath) {
    runHeroAlongPath(lastFoundPath);
  }
});

function updateInspectorAndStats(step) {
  if (step.current) {
    currentNodeCoord.textContent = `[${step.current[0]}, ${step.current[1]}]`;
  }
  if (step.status) {
    currentNodeDesc.textContent = step.status;
  }

  statVisited.textContent = `${step.visitedSize || exploredCount} ta`;
  statQueueSize.textContent = `${step.queue.length} ta`;
  queueCountBadge.textContent = `${step.queue.length} element`;

  renderQueueChips(step.queue);
}

function renderQueueChips(queue) {
  if (!queue || queue.length === 0) {
    queueChips.innerHTML = '<span class="queue-empty-text">Navbat bo\'sh</span>';
    return;
  }

  queueChips.innerHTML = '';
  const maxDisplay = 12;
  const slice = queue.slice(0, maxDisplay);

  slice.forEach(([r, c], idx) => {
    const chip = document.createElement('span');
    chip.classList.add('queue-chip');
    if (idx === 0) chip.classList.add('first-out');
    chip.textContent = `[${r},${c}]`;
    queueChips.appendChild(chip);
  });

  if (queue.length > maxDisplay) {
    const more = document.createElement('span');
    more.classList.add('queue-chip');
    more.textContent = `+${queue.length - maxDisplay} ta`;
    queueChips.appendChild(more);
  }
}

function isCellStartOrGoal(r, c) {
  return (r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1]);
}

function setStatus(state, message) {
  statusBadge.className = 'status-indicator ' + state;
  statusText.textContent = message;
}

// Qadamma-qadam
stepBtn.addEventListener('click', () => {
  if (isRunning && !isPaused) togglePause();
  initAudio();
  const res = executeOneStep();
  if (res.done) finishBFS(res.value);
});

// Pauza
pauseBtn.addEventListener('click', togglePause);

function togglePause() {
  if (!isRunning) return;
  isPaused = !isPaused;
  if (isPaused) {
    clearTimeout(currentTimerId);
    pauseBtn.querySelector('span').textContent = 'Davom ettirish';
    setStatus('running', 'Pauzada');
  } else {
    pauseBtn.querySelector('span').textContent = "To'xtatish";
    setStatus('running', 'Qidirilmoqda...');
    runNextStepLoop();
  }
}

// Vizual tozalash
function clearVisualsOnly() {
  clearTimeout(currentTimerId);
  isRunning = false;
  isPaused = false;
  bfsGenerator = null;

  startBtn.style.display = 'inline-flex';
  pauseBtn.style.display = 'none';
  victoryBanner.classList.remove('show');
  setStatus('ready', 'Tayyor');

  statPathLength.textContent = '—';
  statVisited.textContent = '—';
  statQueueSize.textContent = '—';
  statTime.textContent = '—';
  currentNodeCoord.textContent = '[—, —]';
  currentNodeDesc.textContent = 'Kutilmoqda';
  queueChips.innerHTML = '<span class="queue-empty-text">Navbat bo\'sh</span>';
  queueCountBadge.textContent = '0 element';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellEl = getCellElement(r, c);
      if (!cellEl) continue;

      cellEl.classList.remove('visited', 'queued', 'path', 'current-head');
      if (grid[r][c] === 'S') {
        cellEl.className = 'cell start';
        cellEl.textContent = 'S';
      } else if (grid[r][c] === 'G') {
        cellEl.className = 'cell goal';
        cellEl.textContent = 'G';
      } else if (grid[r][c] === 'X') {
        cellEl.className = 'cell wall';
        cellEl.textContent = 'X';
      } else {
        cellEl.className = 'cell';
        cellEl.textContent = '';
      }
    }
  }

  positionHeroAt(start[0], start[1], false);
}

function clearAll() {
  clearVisualsOnly();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 'X') {
        grid[r][c] = '.';
        const cellEl = getCellElement(r, c);
        if (cellEl) {
          cellEl.className = 'cell';
          cellEl.textContent = '';
        }
      }
    }
  }
}

// Andozalar
presetSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  clearVisualsOnly();

  if (val === 'user_code') {
    gridSizeSelect.value = '10x5';
    loadUserPreset();
    renderGridDOM();
  } else if (val === 'empty') {
    createEmptyGrid(rows, cols);
    renderGridDOM();
  } else if (val === 'random') {
    generateRandomWalls(0.28);
  } else if (val === 'maze') {
    generateMazePreset();
  } else if (val === 'chokepoint') {
    generateChokepointPreset();
  } else if (val === 'zigzag') {
    generateZigZagPreset();
  }
});

gridSizeSelect.addEventListener('change', (e) => {
  const [r, c] = e.target.value.split('x').map(Number);
  clearVisualsOnly();
  if (e.target.value === '10x5' && presetSelect.value === 'user_code') {
    loadUserPreset();
  } else {
    createEmptyGrid(r, c);
  }
  renderGridDOM();
});

function generateRandomWalls(density = 0.28) {
  clearAll();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) continue;
      if (Math.random() < density) {
        grid[r][c] = 'X';
        const cellEl = getCellElement(r, c);
        if (cellEl) {
          cellEl.className = 'cell wall';
          cellEl.textContent = 'X';
        }
      }
    }
  }
}

function generateChokepointPreset() {
  clearAll();
  const midCol = Math.floor(cols / 2);
  const gapRow = Math.floor(rows / 2);

  for (let r = 0; r < rows; r++) {
    if (r !== gapRow && r !== gapRow - 1) {
      if ((r === start[0] && midCol === start[1]) || (r === goal[0] && midCol === goal[1])) continue;
      grid[r][midCol] = 'X';
      const cellEl = getCellElement(r, midCol);
      if (cellEl) {
        cellEl.className = 'cell wall';
        cellEl.textContent = 'X';
      }
    }
  }
}

function generateZigZagPreset() {
  clearAll();
  const stepInterval = Math.max(2, Math.floor(rows / 4));
  for (let r = 1; r < rows; r += stepInterval) {
    const isLeftOpen = (r / stepInterval) % 2 === 0;
    for (let c = 0; c < cols; c++) {
      if (isLeftOpen && c < 2) continue;
      if (!isLeftOpen && c >= cols - 2) continue;
      if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) continue;
      grid[r][c] = 'X';
      const cellEl = getCellElement(r, c);
      if (cellEl) {
        cellEl.className = 'cell wall';
        cellEl.textContent = 'X';
      }
    }
  }
}

function generateMazePreset() {
  clearAll();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) continue;
      if (r % 2 === 1 && c % 2 === 1) {
        grid[r][c] = 'X';
        const cellEl = getCellElement(r, c);
        if (cellEl) {
          cellEl.className = 'cell wall';
          cellEl.textContent = 'X';
        }
      }
    }
  }
  for (let r = 1; r < rows - 1; r += 2) {
    for (let c = 1; c < cols - 1; c += 2) {
      const dirs = [[0, 1], [1, 0]];
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < rows && nc < cols) {
        if ((nr === start[0] && nc === start[1]) || (nr === goal[0] && nc === goal[1])) continue;
        grid[nr][nc] = 'X';
        const cellEl = getCellElement(nr, nc);
        if (cellEl) {
          cellEl.className = 'cell wall';
          cellEl.textContent = 'X';
        }
      }
    }
  }
}

// Boshlang'ich yuklash
startBtn.addEventListener('click', startBFS);
clearPathBtn.addEventListener('click', clearVisualsOnly);
clearAllBtn.addEventListener('click', clearAll);

loadUserPreset();
renderGridDOM();
initFXCanvas();
renderFXLoop();
setStatus('ready', 'Tayyor');
