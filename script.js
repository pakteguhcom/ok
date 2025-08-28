// Quiz Sweeper - Core Game Logic + Quiz System

// Konfigurasi kesulitan
const DIFFICULTIES = {
  easy: { width: 8, height: 8, mines: 10, lives: 4 },
  medium: { width: 10, height: 10, mines: 15, lives: 3 },
  hard: { width: 12, height: 12, mines: 28, lives: 2 },
};

let BOARD_WIDTH = DIFFICULTIES.medium.width;
let BOARD_HEIGHT = DIFFICULTIES.medium.height;
let NUM_MINES = DIFFICULTIES.medium.mines;
let STARTING_LIVES = DIFFICULTIES.medium.lives;

// State global
let boardData = [];
let gameOver = false;
let lives = STARTING_LIVES;
let flagsPlaced = 0;
let tilesRevealed = 0;
let totalSafeTiles = BOARD_WIDTH * BOARD_HEIGHT - NUM_MINES;
let quizOpen = false;
let currentClick = null; // { row, col }

// DOM elements
let minesEl, livesEl, boardEl,
  quizModalEl, questionTextEl, answerOptionsEl, submitAnswerBtn,
  resultOverlayEl, resultMessageEl, restartBtnEl, difficultySelectEl,
  timeElapsedEl, resultDifficultyEl, resultTimeEl, scorePointsEl, resultScoreEl, leaderboardListEl;

// Audio engine (WebAudio)
let audioCtx = null;
let bgmOsc = null; // primary osc
let bgmOsc2 = null; // companion osc
let bgmLfo = null; // slow LFO for gentle variation
let bgmGain = null; // BGM volume
let sfxGain = null; // SFX volume
let musicEnabled = false;

// Bank pertanyaan (SMP level)
const QUESTIONS = [
  {
    question: "Siapakah presiden pertama Indonesia?",
    options: ["Soeharto", "Soekarno", "B.J. Habibie", "Megawati"],
    answer: "Soekarno",
  },
  {
    question: "Tahun berapa Indonesia memproklamasikan kemerdekaan?",
    options: ["1945", "1950", "1939", "1965"],
    answer: "1945",
  },
  {
    question: "Ibu kota Indonesia saat ini adalah?",
    options: ["Bandung", "Surabaya", "Jakarta", "Yogyakarta"],
    answer: "Jakarta",
  },
  {
    question: "Rumus luas persegi adalah?",
    options: ["p × l", "2 × (p + l)", "s × s", "π × r × r"],
    answer: "s × s",
  },
  {
    question: "1 kilometer sama dengan berapa meter?",
    options: ["10", "100", "1000", "10.000"],
    answer: "1000",
  },
  {
    question: "Planet terdekat dari Matahari adalah?",
    options: ["Venus", "Bumi", "Mars", "Merkurius"],
    answer: "Merkurius",
  },
  {
    question: "Lambang kimia untuk air adalah?",
    options: ["CO2", "O2", "H2O", "NaCl"],
    answer: "H2O",
  },
  {
    question: "Gunung tertinggi di Indonesia adalah?",
    options: ["Semeru", "Rinjani", "Puncak Jaya", "Kerinci"],
    answer: "Puncak Jaya",
  },
  {
    question: "Sungai terpanjang di dunia adalah?",
    options: ["Sungai Amazon", "Sungai Nil", "Sungai Kongo", "Sungai Yangtze"],
    answer: "Sungai Nil",
  },
  {
    question: "Benua terbesar di dunia adalah?",
    options: ["Afrika", "Asia", "Eropa", "Amerika"],
    answer: "Asia",
  },
  {
    question: "Organ yang memompa darah ke seluruh tubuh adalah?",
    options: ["Paru-paru", "Ginjal", "Jantung", "Hati"],
    answer: "Jantung",
  },
  {
    question: "Proses tumbuhan membuat makanan disebut?",
    options: ["Respirasi", "Fotosintesis", "Fermentasi", "Transpirasi"],
    answer: "Fotosintesis",
  },
  {
    question: "Alat pernapasan pada ikan adalah?",
    options: ["Paru-paru", "Trakea", "Insang", "Spirakel"],
    answer: "Insang",
  },
  {
    question: "Bilangan prima terkecil adalah?",
    options: ["1", "2", "3", "5"],
    answer: "2",
  },
  {
    question: "Simbol kimia untuk natrium adalah?",
    options: ["Na", "N", "S", "K"],
    answer: "Na",
  },
  {
    question: "Warna primer cahaya adalah...",
    options: ["Merah, kuning, biru", "Merah, hijau, biru", "Cyan, magenta, kuning", "Hitam, putih, abu-abu"],
    answer: "Merah, hijau, biru",
  },
  {
    question: "Sila pertama Pancasila berbunyi?",
    options: ["Kemanusiaan yang adil dan beradab", "Persatuan Indonesia", "Ketuhanan Yang Maha Esa", "Kerakyatan yang dipimpin oleh hikmat kebijaksanaan"],
    answer: "Ketuhanan Yang Maha Esa",
  },
  {
    question: "Ibu kota Jepang adalah?",
    options: ["Osaka", "Kyoto", "Tokyo", "Nagoya"],
    answer: "Tokyo",
  },
  {
    question: "Laut yang memisahkan Afrika dan Asia Barat adalah?",
    options: ["Laut Hitam", "Laut Kaspia", "Laut Merah", "Laut Tengah"],
    answer: "Laut Merah",
  },
  {
    question: "Hasil dari 3 × 4 + 2 adalah?",
    options: ["10", "12", "14", "20"],
    answer: "14",
  },
  {
    question: "Ibu kota Provinsi Jawa Barat adalah?",
    options: ["Bandung", "Bogor", "Bekasi", "Cirebon"],
    answer: "Bandung",
  },
];

let questionOrder = [];
let questionIndex = 0;
let timerInterval = null;
let startTimeMs = 0;
let scorePoints = 0;

function shuffleQuestions() {
  questionOrder = [...Array(QUESTIONS.length).keys()]
    .sort(() => Math.random() - 0.5);
  questionIndex = 0;
}

function getNextQuestion() {
  if (questionOrder.length === 0 || questionIndex >= questionOrder.length) {
    shuffleQuestions();
  }
  const idx = questionOrder[questionIndex++];
  return QUESTIONS[idx];
}

// Inisialisasi game
function initGame() {
  // Init DOM refs (idempotent)
  minesEl = document.getElementById('mines-remaining');
  livesEl = document.getElementById('lives-remaining');
  boardEl = document.getElementById('game-board');
  quizModalEl = document.getElementById('quiz-modal');
  questionTextEl = document.getElementById('question-text');
  answerOptionsEl = document.getElementById('answer-options');
  submitAnswerBtn = document.getElementById('submit-answer');
  resultOverlayEl = document.getElementById('result-overlay');
  resultMessageEl = document.getElementById('result-message');
  restartBtnEl = document.getElementById('restart-btn');
  const resetLbBtn = document.getElementById('reset-lb-btn');
  const closeResultBtn = document.getElementById('close-result-btn');
  difficultySelectEl = document.getElementById('difficulty-select');
  timeElapsedEl = document.getElementById('time-elapsed');
  resultDifficultyEl = document.getElementById('result-difficulty');
  resultTimeEl = document.getElementById('result-time');
  scorePointsEl = document.getElementById('score-points');
  resultScoreEl = document.getElementById('result-score');
  leaderboardListEl = document.getElementById('leaderboard-list');
  const musicToggleBtn = document.getElementById('music-toggle');
  const musicVolume = document.getElementById('music-volume');
  const sfxVolume = document.getElementById('sfx-volume');

  // Reset state
  gameOver = false;
  lives = STARTING_LIVES;
  flagsPlaced = 0;
  tilesRevealed = 0;
  totalSafeTiles = BOARD_WIDTH * BOARD_HEIGHT - NUM_MINES;
  quizOpen = false;
  currentClick = null;
  scorePoints = 0;

  // Siapkan papan
  buildEmptyBoard();
  placeMinesRandomly(NUM_MINES);
  computeAdjacencyCounts();
  renderBoard();
  updateUI();

  // Grid size variable for CSS
  boardEl.style.setProperty('--board-width', BOARD_WIDTH);
  boardEl.style.setProperty('--board-height', BOARD_HEIGHT);

  // Timer
  stopTimer();
  startTimer();

  // Cross-browser fallback: explicitly set grid templates
  try {
    const rootStyles = getComputedStyle(document.documentElement);
    const tileSize = rootStyles.getPropertyValue('--tile-size').trim() || '44px';
    boardEl.style.gridTemplateColumns = `repeat(${BOARD_WIDTH}, ${tileSize})`;
    boardEl.style.gridTemplateRows = `repeat(${BOARD_HEIGHT}, ${tileSize})`;
  } catch (err) {
    // ignore
  }

  // Set music toggle button state
  if (musicToggleBtn) {
    musicToggleBtn.setAttribute('aria-pressed', musicEnabled ? 'true' : 'false');
  }
}

function buildEmptyBoard() {
  boardData = [];
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    const row = [];
    for (let c = 0; c < BOARD_WIDTH; c++) {
      row.push({
        row: r,
        col: c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacent: 0,
      });
    }
    boardData.push(row);
  }
}

function placeMinesRandomly(numMines) {
  const positions = new Set();
  const max = BOARD_WIDTH * BOARD_HEIGHT;
  while (positions.size < numMines) {
    const pick = Math.floor(Math.random() * max);
    positions.add(pick);
  }
  positions.forEach((index) => {
    const r = Math.floor(index / BOARD_WIDTH);
    const c = index % BOARD_WIDTH;
    boardData[r][c].isMine = true;
  });
}

function forEachNeighbor(row, col, fn) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < BOARD_HEIGHT && nc >= 0 && nc < BOARD_WIDTH) {
        fn(boardData[nr][nc], nr, nc);
      }
    }
  }
}

function computeAdjacencyCounts() {
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    for (let c = 0; c < BOARD_WIDTH; c++) {
      if (boardData[r][c].isMine) {
        boardData[r][c].adjacent = -1;
        continue;
      }
      let count = 0;
      forEachNeighbor(r, c, (n) => {
        if (n.isMine) count++;
      });
      boardData[r][c].adjacent = count;
    }
  }
}

function renderBoard() {
  boardEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    for (let c = 0; c < BOARD_WIDTH; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile tile-hidden';
      tile.setAttribute('data-row', String(r));
      tile.setAttribute('data-col', String(c));
      tile.setAttribute('aria-label', `Kotak ${r + 1}, ${c + 1}`);
      frag.appendChild(tile);
    }
  }
  boardEl.appendChild(frag);
}

function updateUI() {
  const minesRemaining = NUM_MINES - flagsPlaced;
  minesEl.textContent = String(minesRemaining);
  livesEl.textContent = String(lives);
  if (scorePointsEl) scorePointsEl.textContent = String(scorePoints);
}

// Event Handlers
function onBoardClick(e) {
  if (gameOver || quizOpen) return;
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains('tile')) return;

  const row = Number(target.getAttribute('data-row'));
  const col = Number(target.getAttribute('data-col'));
  const cell = boardData[row][col];
  if (cell.isRevealed || cell.isFlagged) return;

  currentClick = { row, col };
  openQuizModal();
}

function onBoardContextMenu(e) {
  e.preventDefault();
  if (gameOver || quizOpen) return;
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains('tile')) return;

  const row = Number(target.getAttribute('data-row'));
  const col = Number(target.getAttribute('data-col'));
  const cell = boardData[row][col];
  if (cell.isRevealed) return;

  // Toggle flag
  cell.isFlagged = !cell.isFlagged;
  if (cell.isFlagged) {
    flagsPlaced++;
    target.classList.add('tile-flagged');
    playSfx('switch');
  } else {
    flagsPlaced--;
    target.classList.remove('tile-flagged');
    playSfx('switch');
  }
  updateUI();
}

// Quiz Modal
let selectedOption = null;
let currentQuestion = null;

function openQuizModal() {
  selectedOption = null;
  currentQuestion = getNextQuestion();

  // Render question
  questionTextEl.textContent = currentQuestion.question;
  answerOptionsEl.innerHTML = '';
  currentQuestion.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-btn';
    btn.textContent = opt;
    btn.setAttribute('data-value', opt);
    btn.addEventListener('click', () => selectAnswer(btn, opt));
    answerOptionsEl.appendChild(btn);
  });

  submitAnswerBtn.disabled = true;
  submitAnswerBtn.onclick = onSubmitAnswer;

  quizModalEl.classList.add('show');
  quizModalEl.setAttribute('aria-hidden', 'false');
  quizOpen = true;
}

function closeQuizModal() {
  quizModalEl.classList.remove('show');
  quizModalEl.setAttribute('aria-hidden', 'true');
  quizOpen = false;
}

function selectAnswer(btn, value) {
  selectedOption = value;
  // Visually mark selection
  Array.from(answerOptionsEl.children).forEach((el) => {
    el.classList.remove('selected');
  });
  btn.classList.add('selected');
  submitAnswerBtn.disabled = false;
}

function onSubmitAnswer() {
  if (!currentClick || !currentQuestion || selectedOption == null) return;
  const isCorrect = selectedOption === currentQuestion.answer;
  closeQuizModal();
  const { row, col } = currentClick;
  currentClick = null;

  if (isCorrect) {
    scorePoints = Math.max(0, scorePoints + 10);
    playSfx('correct');
    revealTile(row, col);
    checkWinCondition();
  } else {
    scorePoints = Math.max(0, scorePoints - 5);
    lives -= 1;
    playSfx('wrong');
    const tile = getTileElement(row, col);
    if (tile) {
      tile.classList.add('tile-wrong');
      setTimeout(() => tile.classList.remove('tile-wrong'), 350);
    }
    updateUI();
    if (lives <= 0) {
      endGame(false);
    }
  }
}

// Reveal logic
function revealTile(row, col) {
  if (gameOver) return;
  const cell = boardData[row][col];
  if (cell.isRevealed || cell.isFlagged) return;

  const tileEl = getTileElement(row, col);

  if (cell.isMine) {
    // Kena ranjau -> kalah
    tileEl.classList.remove('tile-hidden');
    tileEl.classList.add('tile-revealed', 'tile-mine');
    cell.isRevealed = true;
    playSfx('mine');
    endGame(false);
    return;
  }

  // Flood-fill (BFS) untuk 0
  const queue = [];
  queue.push(cell);
  while (queue.length) {
    const cur = queue.shift();
    if (cur.isRevealed || cur.isFlagged) continue;
    cur.isRevealed = true;
    tilesRevealed++;
    const curEl = getTileElement(cur.row, cur.col);
    curEl.classList.remove('tile-hidden');
    curEl.classList.add('tile-revealed');

    if (cur.adjacent > 0) {
      curEl.textContent = String(cur.adjacent);
      curEl.classList.add(`num-${cur.adjacent}`);
      curEl.classList.add('tile-number-glow');
      setTimeout(() => curEl.classList.remove('tile-number-glow'), 650);
    } else {
      // 0: periksa tetangga
      forEachNeighbor(cur.row, cur.col, (n) => {
        if (!n.isRevealed && !n.isFlagged && !n.isMine) {
          // Masukkan tetangga untuk dibuka
          if (n.adjacent === 0) {
            // Pastikan tidak didorong berkali-kali: tandai sementara dengan revealed=false tapi gunakan class hidden
            // Untuk kesederhanaan, dorong saja; akan difilter oleh isRevealed
          }
          queue.push(n);
        }
      });
    }
    curEl.classList.add('tile-correct');
    setTimeout(() => curEl.classList.remove('tile-correct'), 450);
  }
  updateUI();
}

function getTileElement(row, col) {
  return boardEl.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
}

function checkWinCondition() {
  if (tilesRevealed >= totalSafeTiles && !gameOver) {
    endGame(true);
  }
}

function endGame(isWin) {
  gameOver = true;
  stopTimer();
  // Tampilkan semua ranjau jika kalah
  if (!isWin) {
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const cell = boardData[r][c];
        if (cell.isMine) {
          const el = getTileElement(r, c);
          el.classList.remove('tile-hidden');
          el.classList.add('tile-revealed', 'tile-mine');
        }
      }
    }
  }

  resultMessageEl.textContent = isWin ? 'Selamat, Anda Menang!' : 'Yah, Anda Kalah!';
  const diffKey = getCurrentDifficultyKey();
  resultDifficultyEl.textContent = labelForDifficulty(diffKey);
  resultTimeEl.textContent = formatElapsed();
  resultScoreEl.textContent = String(scorePoints);
  updateLeaderboard({
    score: scorePoints,
    timeSec: getElapsedSeconds(),
    difficulty: diffKey,
    date: new Date().toISOString(),
  });
  renderLeaderboard();
  resultOverlayEl.classList.add('show');
  resultOverlayEl.setAttribute('aria-hidden', 'false');
  if (isWin) playSfx('win'); else playSfx('lose');
}

function hideResultOverlay() {
  resultOverlayEl.classList.remove('show');
  resultOverlayEl.setAttribute('aria-hidden', 'true');
}

// Setup awal
document.addEventListener('DOMContentLoaded', () => {
  // Satu kali: pasang event listeners
  boardEl = document.getElementById('game-board');
  minesEl = document.getElementById('mines-remaining');
  livesEl = document.getElementById('lives-remaining');
  quizModalEl = document.getElementById('quiz-modal');
  questionTextEl = document.getElementById('question-text');
  answerOptionsEl = document.getElementById('answer-options');
  submitAnswerBtn = document.getElementById('submit-answer');
  resultOverlayEl = document.getElementById('result-overlay');
  resultMessageEl = document.getElementById('result-message');
  restartBtnEl = document.getElementById('restart-btn');
  difficultySelectEl = document.getElementById('difficulty-select');
  const resetLbBtn = document.getElementById('reset-lb-btn');
  const closeResultBtn = document.getElementById('close-result-btn');
  const musicToggleBtn = document.getElementById('music-toggle');
  const musicVolume = document.getElementById('music-volume');
  const sfxVolume = document.getElementById('sfx-volume');

  boardEl.addEventListener('click', onBoardClick);
  boardEl.addEventListener('contextmenu', onBoardContextMenu);
  restartBtnEl.addEventListener('click', () => {
    hideResultOverlay();
    initGame();
  });
  if (resetLbBtn) {
    resetLbBtn.addEventListener('click', () => {
      clearLeaderboard();
      renderLeaderboard();
    });
  }
  if (closeResultBtn) {
    closeResultBtn.addEventListener('click', () => {
      hideResultOverlay();
    });
  }

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', () => {
      toggleMusic();
      musicToggleBtn.setAttribute('aria-pressed', musicEnabled ? 'true' : 'false');
    });
  }

  if (musicVolume) {
    musicVolume.addEventListener('input', () => {
      const v = Number(musicVolume.value) / 100;
      setMusicVolume(v);
      persistVolumes();
    });
  }
  if (sfxVolume) {
    sfxVolume.addEventListener('input', () => {
      const v = Number(sfxVolume.value) / 100;
      setSfxVolume(v);
      persistVolumes();
    });
  }

  difficultySelectEl.addEventListener('change', () => {
    const value = difficultySelectEl.value;
    const cfg = DIFFICULTIES[value] || DIFFICULTIES.medium;
    BOARD_WIDTH = cfg.width;
    BOARD_HEIGHT = cfg.height;
    NUM_MINES = cfg.mines;
    STARTING_LIVES = cfg.lives;
    hideResultOverlay();
    initGame();
    playSfx('switch');
  });

  shuffleQuestions();
  initGame();
  // Apply persisted volumes if any
  restoreVolumes();
  if (musicVolume) musicVolume.value = String(Math.round(getMusicVolume() * 100));
  if (sfxVolume) sfxVolume.value = String(Math.round(getSfxVolume() * 100));
});

// Timer helpers
function startTimer() {
  startTimeMs = Date.now();
  timeElapsedEl.textContent = '0:00';
  timerInterval = setInterval(() => {
    timeElapsedEl.textContent = formatElapsed();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatElapsed() {
  const ms = Math.max(0, Date.now() - startTimeMs);
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function getElapsedSeconds() {
  const ms = Math.max(0, Date.now() - startTimeMs);
  return Math.floor(ms / 1000);
}

function getCurrentDifficultyKey() {
  const v = (difficultySelectEl && difficultySelectEl.value) ? difficultySelectEl.value : 'medium';
  return ['easy','medium','hard'].includes(v) ? v : 'medium';
}

function labelForDifficulty(key) {
  switch (key) {
    case 'easy': return 'Mudah';
    case 'medium': return 'Sedang';
    case 'hard': return 'Sulit';
    default: return '-';
  }
}

// Leaderboard (localStorage)
const LB_KEY = 'quiz-sweeper-leaderboard-v1';

function readLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

function writeLeaderboard(entries) {
  try {
    localStorage.setItem(LB_KEY, JSON.stringify(entries));
  } catch (e) {
    // ignore
  }
}

function updateLeaderboard(entry) {
  const entries = readLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // skor menurun
    return a.timeSec - b.timeSec; // waktu naik
  });
  writeLeaderboard(entries.slice(0, 5));
}

function renderLeaderboard() {
  if (!leaderboardListEl) return;
  const entries = readLeaderboard();
  leaderboardListEl.innerHTML = '';
  entries.forEach((e) => {
    const li = document.createElement('li');
    li.textContent = `${e.score} poin • ${formatSeconds(e.timeSec)} • ${labelForDifficulty(e.difficulty)}`;
    leaderboardListEl.appendChild(li);
  });
}

function formatSeconds(totalSec) {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function clearLeaderboard() {
  try {
    localStorage.removeItem(LB_KEY);
  } catch (e) {
    // ignore
  }
}

// Audio helpers
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const master = audioCtx.createGain();
    master.gain.value = 0.9;
    master.connect(audioCtx.destination);

    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.18;
    bgmGain.connect(master);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);
  }
}

function startBgm() {
  ensureAudio();
  if (audioCtx.state === 'suspended') {
    try { audioCtx.resume(); } catch (e) {}
  }
  if (bgmOsc) return;
  bgmOsc = audioCtx.createOscillator();
  bgmOsc2 = audioCtx.createOscillator();
  bgmLfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  bgmLfo.frequency.value = 0.08;
  lfoGain.gain.value = 6;
  bgmLfo.connect(lfoGain);
  lfoGain.connect(bgmGain.gain);
  bgmLfo.start();

  bgmOsc.type = 'sine';
  bgmOsc2.type = 'triangle';
  bgmOsc.frequency.value = 220; // A3
  bgmOsc2.frequency.value = 277.18; // C#4
  const mix = audioCtx.createGain();
  mix.gain.value = 1.0;
  bgmOsc.connect(mix);
  bgmOsc2.connect(mix);
  mix.connect(bgmGain);
  bgmOsc.start();
  bgmOsc2.start();
}

function stopBgm() {
  if (bgmOsc) { try { bgmOsc.stop(); } catch(e) {} bgmOsc = null; }
  if (bgmOsc2) { try { bgmOsc2.stop(); } catch(e) {} bgmOsc2 = null; }
  if (bgmLfo) { try { bgmLfo.stop(); } catch(e) {} bgmLfo = null; }
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled) {
    startBgm();
  } else {
    stopBgm();
  }
}

function playSfx(kind) {
  ensureAudio();
  const now = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g);
  g.connect(sfxGain);
  switch (kind) {
    case 'correct':
      o.type = 'square';
      o.frequency.setValueAtTime(660, now);
      o.frequency.linearRampToValueAtTime(880, now + 0.08);
      g.gain.setValueAtTime(0.0, now);
      g.gain.linearRampToValueAtTime(0.5, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      break;
    case 'wrong':
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, now);
      o.frequency.linearRampToValueAtTime(120, now + 0.12);
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      break;
    case 'mine':
      o.type = 'triangle';
      o.frequency.setValueAtTime(120, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      g.gain.setValueAtTime(0.7, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      break;
    case 'win':
      o.type = 'square';
      o.frequency.setValueAtTime(523.25, now);
      o.frequency.linearRampToValueAtTime(659.25, now + 0.1);
      g.gain.setValueAtTime(0.0, now);
      g.gain.linearRampToValueAtTime(0.6, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      break;
    case 'lose':
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(180, now);
      o.frequency.linearRampToValueAtTime(90, now + 0.15);
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      break;
    case 'switch':
      o.type = 'sine';
      o.frequency.setValueAtTime(580, now);
      o.frequency.linearRampToValueAtTime(500, now + 0.08);
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      break;
    default:
      o.type = 'sine';
      o.frequency.setValueAtTime(600, now);
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  }
  o.start();
  o.stop(now + 0.6);
}

// Volume persistence and control
const VOL_KEY = 'quiz-sweeper-volumes-v1';
function persistVolumes() {
  try {
    const data = {
      music: getMusicVolume(),
      sfx: getSfxVolume(),
    };
    localStorage.setItem(VOL_KEY, JSON.stringify(data));
  } catch (e) {}
}
function restoreVolumes() {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.music === 'number') setMusicVolume(data.music);
    if (typeof data.sfx === 'number') setSfxVolume(data.sfx);
  } catch (e) {}
}
function setMusicVolume(v) {
  ensureAudio();
  if (bgmGain) bgmGain.gain.value = Math.max(0, Math.min(1, v));
}
function setSfxVolume(v) {
  ensureAudio();
  if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, v));
}
function getMusicVolume() { return bgmGain ? bgmGain.gain.value : 0.12; }
function getSfxVolume() { return sfxGain ? sfxGain.gain.value : 0.5; }


