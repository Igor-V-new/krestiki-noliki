const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');
const resetScoreBtn = document.getElementById('reset-score');
const soundToggleBtn = document.getElementById('sound-toggle');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const nameXInput = document.getElementById('name-x');
const nameOInput = document.getElementById('name-o');
const nameOField = document.getElementById('name-o-field');
const scoreXNameEl = document.getElementById('score-x-name');
const scoreONameEl = document.getElementById('score-o-name');
const historyListEl = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
const firstRadios = document.querySelectorAll('input[name="first"]');
const seriesRadios = document.querySelectorAll('input[name="series"]');
const difficultySelect = document.getElementById('difficulty-select');
const firstSelect = document.getElementById('first-select');
const seriesScoreBox = document.getElementById('series-score');
const seriesXEl = document.getElementById('series-x');
const seriesOEl = document.getElementById('series-o');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');

const HUMAN = 'X';
const BOT = 'O';
const WIN_TARGET = 3;
const HISTORY_LIMIT = 10;

const DEFAULT_NAMES = { x: 'Игрок X', o: 'Игрок O' };
const BOT_NAME = 'Бот';

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
let seriesMode = 'single';
let seriesScore = { x: 0, o: 0 };
let seriesOver = false;

let score = { x: 0, o: 0, draw: 0 };
let soundOn = true;
let theme = 'dark';
let names = { x: DEFAULT_NAMES.x, o: DEFAULT_NAMES.o };
let history = [];

let roundTimer = null;
let roundStartTime = Date.now();

// ---------- Склонения ----------

// Известные женские имена (для точного определения рода)
const FEMALE_NAMES = new Set([
  'аня', 'анна', 'маша', 'мария', 'оля', 'ольга', 'катя', 'екатерина',
  'наташа', 'наталья', 'наталия', 'ира', 'ирина', 'лена', 'елена',
  'света', 'светлана', 'таня', 'татьяна', 'юля', 'юлия', 'вера',
  'надя', 'надежда', 'люба', 'любовь', 'даша', 'дарья', 'соня',
  'софья', 'софия', 'лиза', 'елизавета', 'полина', 'алиса', 'ксюша',
  'ксения', 'вика', 'виктория', 'мила', 'милана', 'варя', 'варвара',
  'ангелина', 'кристина', 'дина', 'зара', 'лариса', 'нина', 'рая',
  'раиса', 'рита', 'маргарита', 'эля', 'элина', 'эмма', 'яна'
]);

// Мужские имена, оканчивающиеся на -а/-я (исключения из эвристики)
const MALE_EXCEPTIONS = new Set([
  'никита', 'илья', 'кузьма', 'фома', 'лука', 'савва', 'данила',
  'гаврила', 'михайла', 'саша' // Саша — унисекс, по умолчанию мужской
]);

function detectGender(name) {
  if (!name) return 'male';
  if (name === BOT_NAME) return 'male';

  const lower = name.trim().toLowerCase();
  const firstWord = lower.split(/\s+/)[0];

  if (FEMALE_NAMES.has(firstWord)) return 'female';
  if (MALE_EXCEPTIONS.has(firstWord)) return 'male';

  if (/(а|я)$/.test(firstWord)) return 'female';
  return 'male';
}

function wonVerb(name) {
  return detectGender(name) === 'female' ? 'победила' : 'победил';
}

function wonPhrase(name) {
  return `${name} ${wonVerb(name)}`;
}

// ---------- Имена ----------

function nameOf(symbol) {
  if (symbol === 'X') return names.x || DEFAULT_NAMES.x;
  if (symbol === 'O') {
    return mode === 'pve' ? BOT_NAME : (names.o || DEFAULT_NAMES.o);
  }
  return symbol;
}

function updateNamesUI() {
  scoreXNameEl.textContent = nameOf('X');
  scoreONameEl.textContent = nameOf('O');

  if (mode === 'pve') {
    nameOField.classList.add('hidden');
  } else {
    nameOField.classList.remove('hidden');
  }
}

function saveNames() {
  names.x = nameXInput.value.trim() || DEFAULT_NAMES.x;
  names.o = nameOInput.value.trim() || DEFAULT_NAMES.o;
  saveState();
  updateNamesUI();
}

// ---------- Звуки ----------

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

// ---------- Тема ----------

function applyTheme() {
  document.body.classList.toggle('light', theme === 'light');
  themeToggleBtn.textContent = theme === 'dark'
    ? '🌙 Тема: тёмная'
    : '☀️ Тема: светлая';

  if (themeColorMeta) {
    themeColorMeta.setAttribute(
      'content',
      theme === 'dark' ? '#1e1e2e' : '#f4f4f8'
    );
  }
}

// ---------- localStorage ----------

function loadState() {
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

    const tRaw = localStorage.getItem('ttt-theme');
    if (tRaw === 'light' || tRaw === 'dark') theme = tRaw;

    const ssRaw = localStorage.getItem('ttt-series-score');
    if (ssRaw) {
      const parsedSS = JSON.parse(ssRaw);
      if (
        typeof parsedSS.x === 'number' &&
        typeof parsedSS.o === 'number'
      ) {
        seriesScore = parsedSS;
      }
    }

    const nRaw = localStorage.getItem('ttt-names');
    if (nRaw) {
      const parsedN = JSON.parse(nRaw);
      if (parsedN && typeof parsedN.x === 'string' && typeof parsedN.o === 'string') {
        names = parsedN;
      }
    }

    const hRaw = localStorage.getItem('ttt-history');
    if (hRaw) {
      const parsedH = JSON.parse(hRaw);
      if (Array.isArray(parsedH)) {
        history = parsedH.slice(0, HISTORY_LIMIT);
      }
    }
  } catch (e) {
    console.warn('Не удалось загрузить данные:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem('ttt-score', JSON.stringify(score));
    localStorage.setItem('ttt-sound', soundOn ? 'on' : 'off');
    localStorage.setItem('ttt-theme', theme);
    localStorage.setItem('ttt-series-score', JSON.stringify(seriesScore));
    localStorage.setItem('ttt-names', JSON.stringify(names));
    localStorage.setItem('ttt-history', JSON.stringify(history));
  } catch (e) {
    console.warn('Не удалось сохранить данные:', e);
  }
}

function renderScore() {
  scoreXEl.textContent = score.x;
  scoreOEl.textContent = score.o;
  scoreDrawEl.textContent = score.draw;
}

function renderSeries() {
  seriesXEl.textContent = seriesScore.x;
  seriesOEl.textContent = seriesScore.o;
}

// ---------- История ----------

function addHistory(winner, durationMs) {
  const entry = {
    winner,
    mode,
    seriesMode,
    date: new Date().toISOString(),
    durationMs
  };
  history.unshift(entry);
  if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;
  saveState();
  renderHistory();
}

function renderHistory() {
  historyListEl.innerHTML = '';

  if (history.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = 'Пока нет сыгранных партий';
    historyListEl.appendChild(li);
    return;
  }

  history.forEach(entry => {
    const li = document.createElement('li');

    const result = document.createElement('div');
    result.className = 'history-result';
    if (entry.winner === 'draw') {
      result.textContent = 'Ничья';
    } else {
      const winnerName = entry.winner === 'O' && entry.mode === 'pve'
        ? BOT_NAME
        : entry.winner === 'X'
          ? (names.x || DEFAULT_NAMES.x)
          : (names.o || DEFAULT_NAMES.o);
      result.textContent = wonPhrase(winnerName);
    }

    const meta = document.createElement('div');
    meta.className = 'history-meta';
    const modeLabel = entry.mode === 'pve'
      ? `Против бота (${entry.winner === 'O' ? 'бот' : 'ты'})`
      : 'Два игрока';
    const seriesLabel = entry.seriesMode === 'bo3' ? ' · серия' : '';
    const date = new Date(entry.date);
    const timeStr = date.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const seconds = Math.max(1, Math.round(entry.durationMs / 1000));
    meta.textContent = `${modeLabel}${seriesLabel} · ${timeStr} · ${seconds}с`;

    li.appendChild(result);
    li.appendChild(meta);
    historyListEl.appendChild(li);
  });
}

// ---------- Игровой процесс ----------

function handleClick(e) {
  const cell = e.target;
  if (!cell.classList.contains('cell')) return;
  const index = Number(cell.dataset.index);

  if (gameOver || seriesOver || state[index] !== '') return;
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
    const durationMs = Date.now() - roundStartTime;
    const winnerName = nameOf(currentPlayer);
    const phrase = wonPhrase(winnerName);
    statusEl.textContent = `${phrase}! 🎉`;
    gameOver = true;
    highlightWin(currentPlayer);
    addScore(currentPlayer);
    addHistory(currentPlayer, durationMs);
    playWin();

    if (seriesMode === 'bo3') {
      seriesScore[currentPlayer === 'X' ? 'x' : 'o']++;
      renderSeries();
      saveState();

      if (seriesScore[currentPlayer === 'X' ? 'x' : 'o'] >= WIN_TARGET) {
        seriesOver = true;
        statusEl.textContent = `🏆 ${phrase} серию ${WIN_TARGET}:${WIN_TARGET - 1}!`;
        setTimeout(() => {
          seriesScore = { x: 0, o: 0 };
          seriesOver = false;
          renderSeries();
          saveState();
          restart();
        }, 2500);
        return;
      }

      scheduleRoundRestart(`Матч за ${winnerName}. Следующий через мгновение...`);
    }
    return;
  }

  if (state.every(v => v !== '')) {
    const durationMs = Date.now() - roundStartTime;
    statusEl.textContent = 'Ничья 🤝';
    gameOver = true;
    addScore('draw');
    addHistory('draw', durationMs);
    playDraw();

    if (seriesMode === 'bo3') {
      scheduleRoundRestart('Ничья. Следующий матч через мгновение...');
    }
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus();
}

function scheduleRoundRestart(text) {
  statusEl.textContent = text;
  clearTimeout(roundTimer);
  roundTimer = setTimeout(() => {
    restart();
  }, 1500);
}

function addScore(winner) {
  if (winner === 'X') score.x++;
  else if (winner === 'O') score.o++;
  else score.draw++;
  saveState();
  renderScore();
}

function updateStatus() {
  if (mode === 'pve') {
    statusEl.textContent = currentPlayer === HUMAN
      ? `Твой ход (${nameOf(HUMAN)})`
      : `${BOT_NAME} думает...`;
  } else {
    statusEl.textContent = `Ход: ${nameOf(currentPlayer)}`;
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
  if (gameOver || seriesOver) return;
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
  clearTimeout(roundTimer);
  roundTimer = null;

  state = Array(9).fill('');
  gameOver = false;
  roundStartTime = Date.now();
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

  if (seriesMode === 'bo3') {
    seriesScoreBox.classList.remove('hidden');
  } else {
    seriesScoreBox.classList.add('hidden');
  }

  updateNamesUI();
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

seriesRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    seriesMode = radio.value;
    seriesScore = { x: 0, o: 0 };
    seriesOver = false;
    renderSeries();
    saveState();
    updateVisibility();
    restart();
  });
});

nameXInput.addEventListener('input', saveNames);
nameOInput.addEventListener('input', saveNames);

soundToggleBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  updateSoundButton();
  saveState();
  if (soundOn) playMove();
});

themeToggleBtn.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
});

boardEl.addEventListener('click', handleClick);
restartBtn.addEventListener('click', restart);

resetScoreBtn.addEventListener('click', () => {
  score = { x: 0, o: 0, draw: 0 };
  seriesScore = { x: 0, o: 0 };
  seriesOver = false;
  saveState();
  renderScore();
  renderSeries();
});

clearHistoryBtn.addEventListener('click', () => {
  history = [];
  saveState();
  renderHistory();
});

// ---------- Инициализация ----------

loadState();
nameXInput.value = names.x;
nameOInput.value = names.o;
renderScore();
renderSeries();
renderHistory();
updateSoundButton();
applyTheme();
updateVisibility();
updateStatus();
