const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');
const resetScoreBtn = document.getElementById('reset-score');
const soundToggleBtn = document.getElementById('sound-toggle');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
const firstRadios = document.querySelectorAll('input[name="first"]');
const difficultySelect = document.getElementById('difficulty-select');
const firstSelect = document.getElementById('first-select');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');

const HUMAN = 'X';
const BOT = 'O';

const winLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

let currentPlayer = 'X';
let state = Array(9).fill('');
let gameOver = false;
let mode = 'pvp';
let difficulty = 'hard';
let firstPlayer = 'human';

let score = { x: 0, o: 0, draw: 0 };
let soundOn = true;

// ---------- Звуки (Web Audio API) ----------

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function beep(freq, duration, type = 'sine', volume = 0.15) {
  if (!soundOn) return;
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioCtx.currentTime + duration
  );

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playMove() {
  beep(520, 0.08, 'square', 0.1);
}

function playWin() {
  beep(660, 0.12, 'sine', 0.15);
  setTimeout(() => beep(880, 0.12, 'sine', 0.15), 120);
  setTimeout(() => beep(1100, 0.2, 'sine', 0.15), 240);
}

function playDraw() {
  beep(330, 0.15, 'triangle', 0.12);
  setTimeout(() => beep(260, 0.2, 'triangle', 0.12), 150);
}

function updateSoundButton() {
  soundToggleBtn.textContent = soundOn ? '🔊 Звук: вкл' : '🔇 Звук: выкл';
  soundToggleBtn.classList.toggle('off', !soundOn);
}

// ---------- localStorage ----------

function loadScore() {
  try {
    const raw = localStorage.getItem('ttt-score');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.x === 'number' &&
        typeof parsed.o === 'number' &&
        typeof parsed.draw === 'number'
      ) {
        score = parsed;
      }
    }
    const sRaw = localStorage.getItem('ttt-sound');
    if (sRaw === 'off') soundOn = false;
  } catch (e) {
    console.warn('Не удалось загрузить данные:', e);
  }
}

function saveScore() {
  try {
    localStorage.setItem('ttt-score', JSON.stringify(score));
    localStorage.setItem('ttt-sound', soundOn ? 'on' : 'off');
  } catch (e) {
    console.warn('Не удалось сохранить данные:', e);
  }
}

function renderScore() {
  scoreXEl.textContent = score.x;
  scoreOEl.textContent = score.o;
  scoreDrawEl.textContent = score.draw;
}

// ---------- Игровой процесс ----------

function handleClick(e) {
  const cell = e.target;
  if (!cell.classList.contains('cell')) return;
  const index = Number(cell.dataset.index);

  if (gameOver || state[index] !== '') return;
  if (mode === 'pve' && currentPlayer !== HUMAN) return;

  makeMove(index);

  if (mode === 'pve' && !gameOver && currentPlayer === BOT) {
    setTimeout(botMove, 300);
  }
}

function makeMove(index) {
  state[index] = currentPlayer;
  const cell = cells[index];
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());

  playMove();

  if (checkWin(currentPlayer)) {
    statusEl.textContent = `Победил ${currentPlayer}! 🎉`;
    gameOver = true;
    highlightWin(currentPlayer);
    addScore(currentPlayer);
    playWin();
    return;
  }

  if (state.every(v => v !== '')) {
    statusEl.textContent = 'Ничья 🤝';
    gameOver = true;
    addScore('draw');
    playDraw();
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus();
}

function addScore(winner) {
  if (winner === 'X') score.x++;
  else if (winner === 'O') score.o++;
  else score.draw++;
  saveScore();
  renderScore();
}

function updateStatus() {
  if (mode === 'pve') {
    statusEl.textContent = currentPlayer === HUMAN
      ? 'Твой ход (X)'
      : 'Бот думает...';
  } else {
    statusEl.textContent = `Ход: ${currentPlayer}`;
  }
}

function checkWin(player) {
  return winLines.some(line =>
    line.every(i => state[i] === player)
  );
}

function highlightWin(player) {
  winLines.forEach(line => {
    if (line.every(i => state[i] === player)) {
      line.forEach(i => cells[i].classList.add('win'));
    }
  });
}

// ---------- Бот ----------

function botMove() {
  if (gameOver) return;
  let move;

  if (difficulty === 'easy') {
    move = randomMove(state);
  } else if (difficulty === 'medium') {
    move = Math.random() < 0.5 ? bestMove(state, BOT) : randomMove(state);
  } else {
    move = bestMove(state, BOT);
  }

  if (move !== -1) makeMove(move);
}

function randomMove(board) {
  const empty = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') empty.push(i);
  }
  if (empty.length === 0) return -1;
  return empty[Math.floor(Math.random() * empty.length)];
}

function bestMove(board, player) {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      board[i] = player;
      const scoreVal = minimax(board, 0, false);
      board[i] = '';
      if (scoreVal > bestScore) {
        bestScore = scoreVal;
        move = i;
      }
    }
  }
  return move;
}

function minimax(board, depth, isMaximizing) {
  if (checkWinOnBoard(board, BOT)) return 10 - depth;
  if (checkWinOnBoard(board, HUMAN)) return depth - 10;
  if (board.every(v => v !== '')) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = BOT;
        best = Math.max(best, minimax(board, depth + 1, false));
        board[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = HUMAN;
        best = Math.min(best, minimax(board, depth + 1, true));
        board[i] = '';
      }
    }
    return best;
  }
}

function checkWinOnBoard(board, player) {
  return winLines.some(line =>
    line.every(i => board[i] === player)
  );
}

// ---------- Рестарт и настройки ----------

function restart() {
  state = Array(9).fill('');
  gameOver = false;
  cells.forEach(c => {
    c.textContent = '';
    c.classList.remove('x', 'o', 'win');
  });

  if (mode === 'pve') {
    currentPlayer = firstPlayer === 'bot' ? BOT : HUMAN;
  } else {
    currentPlayer = 'X';
  }

  updateStatus();

  if (mode === 'pve' && currentPlayer === BOT) {
    setTimeout(botMove, 300);
  }
}

function updateVisibility() {
  if (mode === 'pve') {
    difficultySelect.classList.remove('hidden');
    firstSelect.classList.remove('hidden');
  } else {
    difficultySelect.classList.add('hidden');
    firstSelect.classList.add('hidden');
  }
}

// ---------- Слушатели ----------

modeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    mode = radio.value;
    updateVisibility();
    restart();
  });
});

difficultyRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    difficulty = radio.value;
    restart();
  });
});

firstRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    firstPlayer = radio.value;
    restart();
  });
});

soundToggleBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  updateSoundButton();
  saveScore();
  if (soundOn) playMove();
});

boardEl.addEventListener('click', handleClick);
restartBtn.addEventListener('click', restart);

resetScoreBtn.addEventListener('click', () => {
  score = { x: 0, o: 0, draw: 0 };
  saveScore();
  renderScore();
});

// ---------- Инициализация ----------

loadScore();
renderScore();
updateSoundButton();
updateVisibility();
updateStatus();
