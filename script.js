/**
 * BFS Pathfinding Game Edition — Ultra Smooth & Satisfying
 * Muallif: Asadbek Qulboyev
 * Haqiqiy o'yin tovushlari, silliq harakatlar va ASMR kristal akkordlar bilan
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

// Grid holati (Standart 12x12)
let rows = 12;
let cols = 12;
let grid = [];
let start = [1, 1];
let goal = [10, 10];
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
let selectedHero = 'drone';

// Yo'l bo'ylab chiziladigan neon nur nuqtalari
let animatedPathNodes = [];

// Tovush va Musiqa tizimi (Web Audio API)
let sfxEnabled = true;
let bgmEnabled = false;
let audioCtx = null;
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

let is3DView = true;
const view3dToggleBtn = document.getElementById('view3dToggleBtn');
const view3dText = document.getElementById('view3dText');
const gridWrapper = document.getElementById('gridWrapper');

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

// 1. Qidiruvni Boshlash (Start): Quvvatli reaktiv impuls tovushi
function playBtnStartSfx() {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.23);
}

// 2. Qadamma-qadam (Step): Tishli mexanik qadam
function playBtnStepSfx() {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(740, now);
  osc.frequency.setValueAtTime(1100, now + 0.03);
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

// 3. Pauza / Davom ettirish: Vaqt muzlashi xromatik ohangi
function playBtnPauseSfx(isPausing) {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  const startF = isPausing ? 700 : 380;
  const endF = isPausing ? 350 : 700;
  osc.frequency.setValueAtTime(startF, now);
  osc.frequency.exponentialRampToValueAtTime(endF, now + 0.12);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

// 4. Qahramonni Yugurtirish: Turbo Dvigatel parvozi
function playBtnReplaySfx() {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(950, now + 0.24);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.31);
}

// 5. Yo'lni tozalash: Raqamli qayta orqaga o'rash
function playBtnClearPathSfx() {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(980, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.17);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

// 6. Butunlay tozalash: Lazer bug'lantirish / reset portlashi
function playBtnClearAllSfx() {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(380, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.24);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.27);
}

// 7. Rejim tugmalari (Segmented control)
function playModeClickSfx(mode) {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const freqs = {
    wall: 220,     // To'q mexanik devor
    erase: 460,    // Shaffof o'chirg'ich
    start: 587.33, // D5 zumrad start
    goal: 880      // A5 neft-qizil maqsad
  };
  const type = mode === 'wall' ? 'square' : 'triangle';
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqs[mode] || 440, now);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

// 8. Qahramon almashtirish: Transformatsiya sintezi
function playHeroChangeSfx() {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const chords = [523.25, 659.25, 1046.50];
  chords.forEach((f, i) => {
    setTimeout(() => {
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }, i * 35);
  });
}

// 9. Dropdown tanlovlar (Andoza va Grid o'lchami)
function playDropdownSelectSfx() {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

// 10. Tezlik slayderi tovushi
function playSpeedSlideSfx(val) {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  const freq = 200 + (val * 7);
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.02, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.045);
}

// 11. O'ZBEKCHA "YUTDINGIZ!" DEB BAQIRIB AYTISH FUNKSIYASI
function shoutVictoryUzbek() {
  if (!sfxEnabled) return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Yutdingiz!");
      utterance.lang = 'uz-UZ';
      utterance.rate = 1.25;  // Jo'shqin, shiddatli
      utterance.pitch = 1.45; // Baland baqirib aytish
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const uzVoice = voices.find(v => v.lang.toLowerCase().includes('uz'));
      if (uzVoice) {
        utterance.voice = uzVoice;
      }
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {}

  playVictoryHorns();
}

// Tantana shox karnayi / fanfarasi
function playVictoryHorns() {
  if (!sfxEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const hornNotes = [
      { f: 523.25, time: 0 },
      { f: 659.25, time: 60 },
      { f: 783.99, time: 130 },
      { f: 1046.5, time: 220 }
    ];
    hornNotes.forEach(h => {
      setTimeout(() => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(h.f, now);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      }, h.time);
    });
  } catch (e) {}
}

// 12. 3D Rejim o'tish tovushi
function play3DToggleSfx(is3d) {
  if (!sfxEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  const startF = is3d ? 320 : 680;
  const endF = is3d ? 680 : 320;
  osc.frequency.setValueAtTime(startF, now);
  osc.frequency.exponentialRampToValueAtTime(endF, now + 0.14);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

// ASMR Kristal / Marimba Qadam Ovoz Sintizatori
function playCrystalChime(stepIndex, totalSteps) {
  if (!sfxEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const scale = [
      261.63, 293.66, 329.63, 392.00, 440.00,
      523.25, 587.33, 659.25, 783.99, 880.00, 1046.50
    ];

    const noteIdx = Math.min(scale.length - 1, Math.floor((stepIndex / Math.max(1, totalSteps - 1)) * scale.length));
    const baseFreq = scale[noteIdx] || 440;
    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2.01, now);

    gain2.gain.setValueAtTime(0.035, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now);
    osc2.stop(now + 0.18);

  } catch (e) {}
}

// Skanerlash davridagi mayin sonar pingi
function playScanSonar(r, c) {
  if (!sfxEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const freq = 320 + (r * 18 + c * 12);

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  } catch (e) {}
}

// Laser chirp navbatga kirganda
function playEnqueueLaser() {
  if (!sfxEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.03);

    gain.gain.setValueAtTime(0.012, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) {}
}

// Manzilga yetganda: Shaffof va Yuksak Tantanali Akkordlar (Major 9th)
function playLushArrivalChime() {
  if (!sfxEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;

    // C-Major 9 arpejio akkordlari
    const notes = [
      { f: 523.25, delay: 0 },    // C5
      { f: 659.25, delay: 70 },   // E5
      { f: 783.99, delay: 140 },  // G5
      { f: 987.77, delay: 210 },  // B5
      { f: 1046.50, delay: 290 }, // C6
      { f: 1318.51, delay: 380 }  // E6
    ];

    notes.forEach(item => {
      setTimeout(() => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(item.f, now);

        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      }, item.delay);
    });
  } catch (e) {}
}

// To'siq chizishda mayin mexanik klik
function playTactileClick(freq = 200) {
  if (!sfxEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {}
}

// To'siq topilmaganda buzz
function playDefeatBuzz() {
  if (!sfxEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {}
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

  const bassNotes = [130.81, 146.83, 164.81, 196.00, 174.61];
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

// ================= ZARRALAR VA NEON NUR TIZIMI (Canvas FX) =================
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
  constructor(x, y, color, size = 3, vx = 0, vy = 0, life = 1, isStar = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.isStar = isStar;
    this.decay = 0.02 + Math.random() * 0.03;
    this.gravity = 0.08;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.98;
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

// Qadam uchqunlari
function emitSparks(x, y, color = '#fbbf24', count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.8;
    particles.push(new Particle(
      x,
      y,
      color,
      2 + Math.random() * 2,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 0.8,
      0.9
    ));
  }
}

// Manzilga yetganda Tantanali Feyerverk
function emitVictoryFireworks(cx, cy) {
  const colors = ['#fbbf24', '#38bdf8', '#f43f5e', '#34d399', '#a855f7', '#ffffff'];
  for (let i = 0; i < 75; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6.5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(
      cx,
      cy,
      color,
      2.5 + Math.random() * 3.5,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 2.5,
      1.6,
      true
    ));
  }
}

// Animatsiya sikli (Particle va Neon Nur chizig'i)
function renderFXLoop() {
  if (ctx) {
    ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

    // 1. Bosib o'tilgan yo'l bo'ylab tilla neon nurni chizish
    if (animatedPathNodes.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#fbbf24';

      ctx.beginPath();
      const p0 = getCellPixelCenter(animatedPathNodes[0][0], animatedPathNodes[0][1]);
      ctx.moveTo(p0.x, p0.y);

      for (let i = 1; i < animatedPathNodes.length; i++) {
        const pt = getCellPixelCenter(animatedPathNodes[i][0], animatedPathNodes[i][1]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Uchqun zarralarini yangilash
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

function loadDefault12x12Preset() {
  rows = 12;
  cols = 12;
  if (gridSizeSelect) gridSizeSelect.value = '12x12';
  grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push('.');
    }
    grid.push(row);
  }

  start = [1, 1];
  goal = [10, 10];
  grid[start[0]][start[1]] = 'S';
  grid[goal[0]][goal[1]] = 'G';

  // Chiroyli, optimal labirintsimon to'siqlar
  const defaultWalls = [
    [1, 3], [2, 3], [3, 3], [4, 3],
    [4, 4], [4, 5], [4, 6], [4, 7],
    [2, 7], [3, 7], [5, 7], [6, 7],
    [7, 2], [7, 3], [7, 4], [7, 5],
    [9, 5], [9, 6], [9, 7], [9, 8],
    [6, 9], [7, 9], [8, 9]
  ];

  defaultWalls.forEach(([r, c]) => {
    if (r < rows && c < cols) {
      if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) return;
      grid[r][c] = 'X';
    }
  });

  selectedHero = 'drone';
  if (heroSelect) heroSelect.value = 'drone';
  if (heroAvatar) heroAvatar.className = 'hero-avatar drone';
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
  positionHeroAt(start[0], start[1], 0, false);
}

function getCellElement(r, c) {
  return gridBoard.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}

function getCellPixelCenter(r, c) {
  const x = c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  const y = r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  return { x, y };
}

// Qahramonni koordinata va yo'nalish burchagi bilan siljitish
function positionHeroAt(r, c, angle = 0, animate = true) {
  if (!heroRunner) return;
  const x = c * (CELL_SIZE + CELL_GAP);
  const y = r * (CELL_SIZE + CELL_GAP);

  if (!animate) {
    heroRunner.style.transition = 'none';
  } else {
    heroRunner.style.transition = `transform var(--hero-speed) cubic-bezier(0.34, 1.56, 0.64, 1)`;
  }

  heroRunner.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
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
    playTactileClick(190);
    const { x, y } = getCellPixelCenter(r, c);
    emitSparks(x, y, '#64748b', 6);
  } else if (currentDrawMode === 'erase') {
    grid[r][c] = '.';
    cellEl.className = 'cell';
    cellEl.textContent = '';
    playTactileClick(280);
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
  positionHeroAt(r, c, 0, false);
  playTactileClick(480);
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
  playTactileClick(580);
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
    playModeClickSfx(currentDrawMode);
  });
});

// Qahramon tanlash
heroSelect.addEventListener('change', (e) => {
  selectedHero = e.target.value;
  heroAvatar.className = `hero-avatar ${selectedHero}`;
  playHeroChangeSfx();
});

// Tezlik slaydri
speedSlider.addEventListener('input', (e) => {
  const val = Number(e.target.value);
  playSpeedSlideSfx(val);
  animationSpeedMs = Math.round(350 - (val / 100) * 345);
  let text = 'O\'rtacha';
  if (animationSpeedMs <= 10) text = 'Juda Tez (' + animationSpeedMs + 'ms)';
  else if (animationSpeedMs <= 50) text = 'Tez (' + animationSpeedMs + 'ms)';
  else if (animationSpeedMs <= 150) text = 'O\'rtacha (' + animationSpeedMs + 'ms)';
  else text = 'Sekin (' + animationSpeedMs + 'ms)';
  speedValueText.textContent = text;

  document.documentElement.style.setProperty('--hero-speed', `${Math.max(0.08, animationSpeedMs / 1000)}s`);
});

// Audio tugmalari
soundToggleBtn.addEventListener('click', () => {
  sfxEnabled = !sfxEnabled;
  if (sfxEnabled) {
    soundToggleBtn.classList.add('active');
    soundText.textContent = 'SFX: Yoqilgan';
    playTactileClick(660);
  } else {
    soundToggleBtn.classList.remove('active');
    soundText.textContent = 'SFX: O\'chiq';
  }
});

bgmToggleBtn.addEventListener('click', toggleBGM);

// 3D Rejim almashtirish
view3dToggleBtn.addEventListener('click', toggle3DView);

function toggle3DView() {
  is3DView = !is3DView;
  if (is3DView) {
    gridWrapper.classList.add('view-3d');
    view3dToggleBtn.classList.add('active');
    view3dText.textContent = "3D Rejim: Yoqilgan";
    play3DToggleSfx(true);
  } else {
    gridWrapper.classList.remove('view-3d');
    gridBoardContainer.style.transform = '';
    view3dToggleBtn.classList.remove('active');
    view3dText.textContent = "3D Rejim: O'chiq";
    play3DToggleSfx(false);
  }
}

// 3D Maydonni sichqoncha bilan mayin tebratish (Interactive Parallax)
gridWrapper.addEventListener('mousemove', (e) => {
  if (!is3DView || isMouseDown) return;
  const rect = gridWrapper.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / rect.width - 0.5;
  const my = (e.clientY - rect.top) / rect.height - 0.5;
  const tiltX = 44 - my * 10;
  const tiltZ = -18 + mx * 10;
  gridBoardContainer.style.transform = `rotateX(${tiltX}deg) rotateZ(${tiltZ}deg) scale(0.92)`;
});

gridWrapper.addEventListener('mouseleave', () => {
  if (!is3DView) return;
  gridBoardContainer.style.transform = 'rotateX(44deg) rotateZ(-18deg) scale(0.92)';
});

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

  positionHeroAt(start[0], start[1], 0, false);

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

    playScanSonar(r, c);

  } else if (step.type === 'queued') {
    const [nr, nc] = step.cell;
    const cellEl = getCellElement(nr, nc);
    if (cellEl && !isCellStartOrGoal(nr, nc)) {
      cellEl.classList.add('queued');
    }
    playEnqueueLaser();
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

    // Qahramonning manzilga eng optimal va yoqimli sayohati!
    runHeroDelightfulJourney(result.path);
  } else {
    lastFoundPath = null;
    setStatus('not-found', "Yo'l topilmadi!");
    statPathLength.textContent = 'Mavjud emas';
    playDefeatBuzz();
  }
}

// ================= MANZILGA ENG OPTIMAL VA YOQIMLI BORISH =================
function runHeroDelightfulJourney(path) {
  if (!path || path.length === 0) return;

  victoryBanner.classList.remove('show');
  heroRunner.classList.remove('victory');
  heroRunner.classList.add('dashing');

  animatedPathNodes = [];
  positionHeroAt(path[0][0], path[0][1], 0, false);
  animatedPathNodes.push(path[0]);

  let idx = 0;
  // Harakat vaqti (tezlikka moslashuvchan, silliq va maroqli)
  const stepDelay = Math.max(80, Math.min(190, animationSpeedMs * 2.1));

  function stepNext() {
    if (idx >= path.length) {
      // MANZILGA YETIB BORILDI (DELIGHT CLIMAX)
      heroRunner.classList.remove('dashing');
      heroRunner.classList.add('victory');

      const goalCoord = path[path.length - 1];
      const goalEl = getCellElement(goalCoord[0], goalCoord[1]);
      if (goalEl) goalEl.classList.add('goal-reached');

      const { x, y } = getCellPixelCenter(goalCoord[0], goalCoord[1]);
      emitVictoryFireworks(x, y);
      playLushArrivalChime();
      shoutVictoryUzbek(); // O'zbekcha "Yutdingiz!" deb baqirib aytadi!

      victoryTitle.textContent = '🎯 MANZIL FATH ETILDI!';
      victoryDesc.textContent = `Eng qisqa masofa: ${path.length - 1} qadam • Tabriklaymiz!`;
      victoryBanner.classList.add('show');

      setTimeout(() => {
        victoryBanner.classList.remove('show');
        heroRunner.classList.remove('victory');
        if (goalEl) goalEl.classList.remove('goal-reached');
      }, 4000);
      return;
    }

    const [r, c] = path[idx];

    // Yo'nalish burchagini hisoblash (burilishlar silliq ko'rinishi uchun)
    let headingAngle = 0;
    if (idx < path.length - 1) {
      const [nextR, nextC] = path[idx + 1];
      const dr = nextR - r;
      const dc = nextC - c;
      if (dc === 1) headingAngle = 0;      // O'ng
      else if (dr === 1) headingAngle = 90; // Past
      else if (dc === -1) headingAngle = 180; // Chap
      else if (dr === -1) headingAngle = 270; // Yuqori
    }

    positionHeroAt(r, c, headingAngle, true);
    animatedPathNodes.push([r, c]);

    const cellEl = getCellElement(r, c);
    if (cellEl && !isCellStartOrGoal(r, c)) {
      cellEl.classList.remove('visited', 'queued');
      cellEl.classList.add('path');
      cellEl.textContent = '*';
    }

    // Har bir qadamda oltin uchqunlar va kristal marimba musiqasi
    const { x, y } = getCellPixelCenter(r, c);
    emitSparks(x, y, '#fbbf24', 9);
    playCrystalChime(idx, path.length);

    idx++;
    setTimeout(stepNext, stepDelay);
  }

  stepNext();
}

replayHeroBtn.addEventListener('click', () => {
  playBtnReplaySfx();
  if (lastFoundPath) {
    runHeroDelightfulJourney(lastFoundPath);
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
  playBtnStepSfx();
  if (isRunning && !isPaused) togglePause();
  initAudio();
  const res = executeOneStep();
  if (res.done) finishBFS(res.value);
});

// Pauza
pauseBtn.addEventListener('click', () => {
  playBtnPauseSfx(!isPaused);
  togglePause();
});

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
  animatedPathNodes = [];

  startBtn.style.display = 'inline-flex';
  pauseBtn.style.display = 'none';
  victoryBanner.classList.remove('show');
  heroRunner.classList.remove('victory', 'dashing');
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

      cellEl.classList.remove('visited', 'queued', 'path', 'current-head', 'goal-reached');
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

  positionHeroAt(start[0], start[1], 0, false);
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
  playDropdownSelectSfx();
  const val = e.target.value;
  clearVisualsOnly();

  if (val === 'arena_12x12') {
    gridSizeSelect.value = '12x12';
    loadDefault12x12Preset();
    renderGridDOM();
  } else if (val === 'user_code') {
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
  playDropdownSelectSfx();
  const [r, c] = e.target.value.split('x').map(Number);
  clearVisualsOnly();
  if (e.target.value === '12x12' && presetSelect.value === 'arena_12x12') {
    loadDefault12x12Preset();
  } else if (e.target.value === '10x5' && presetSelect.value === 'user_code') {
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

// Boshlang'ich yuklash (Default 12x12 va Fazo Droni)
startBtn.addEventListener('click', () => {
  playBtnStartSfx();
  startBFS();
});

clearPathBtn.addEventListener('click', () => {
  playBtnClearPathSfx();
  clearVisualsOnly();
});

clearAllBtn.addEventListener('click', () => {
  playBtnClearAllSfx();
  clearAll();
});

loadDefault12x12Preset();
renderGridDOM();
initFXCanvas();
renderFXLoop();
setStatus('ready', 'Tayyor');
