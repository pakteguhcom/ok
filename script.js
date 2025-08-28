// Quiz Sweeper - Core Game Logic + Quiz System

// Konstanta permainan
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 10;
const NUM_MINES = 15;
const STARTING_LIVES = 3;

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
  resultOverlayEl, resultMessageEl, restartBtnEl;

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

  // Reset state
  gameOver = false;
  lives = STARTING_LIVES;
  flagsPlaced = 0;
  tilesRevealed = 0;
  totalSafeTiles = BOARD_WIDTH * BOARD_HEIGHT - NUM_MINES;
  quizOpen = false;
  currentClick = null;

  // Siapkan papan
  buildEmptyBoard();
  placeMinesRandomly(NUM_MINES);
  computeAdjacencyCounts();
  renderBoard();
  updateUI();

  // Grid size variable for CSS
  boardEl.style.setProperty('--board-width', BOARD_WIDTH);
  boardEl.style.setProperty('--board-height', BOARD_HEIGHT);
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
  } else {
    flagsPlaced--;
    target.classList.remove('tile-flagged');
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
    revealTile(row, col);
    checkWinCondition();
  } else {
    lives -= 1;
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
  resultOverlayEl.classList.add('show');
  resultOverlayEl.setAttribute('aria-hidden', 'false');
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

  boardEl.addEventListener('click', onBoardClick);
  boardEl.addEventListener('contextmenu', onBoardContextMenu);
  restartBtnEl.addEventListener('click', () => {
    hideResultOverlay();
    initGame();
  });

  shuffleQuestions();
  initGame();
});


