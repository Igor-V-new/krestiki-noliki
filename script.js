const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');
const modeRadios = document.querySelectorAll('input[name="mode"]');

let currentPlayer = 'X';
let state = Array(9).fill('');
let gameOver = false;
let mode = 'pvp'; // 'pvp' | 'pve'

const HUMAN = 'X';
const BOT = 'O';

const winLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function handleClick(e) {
  const cell = e.target;
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

  if (checkWin(currentPlayer)) {
    statusEl.textContent = `Победил ${currentPlayer}! 🎉`;
    gameOver = true;
    highlightWin(currentPlayer);
    return;
  }

  if (state.every(v => v !== '')) {
    statusEl.textContent = 'Ничья 🤝';
    gameOver = true;
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus();
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

function botMove() {
  if (gameOver) return;
  const best = bestMove(state, BOT);
  if (best !== -1) makeMove(best);
}

// Minimax: бот непобедим
function bestMove(board, player) {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      board[i] = player;
      const score = minimax(board, 0, false);
      board[i] = '';
      if (score > bestScore) {
        bestScore = score;
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

function restart() {
  state = Array(9).fill('');
  currentPlayer = 'X';
  gameOver = false;
  statusEl.textContent = 'Ход: X';
  cells.forEach(c => {
    c.textContent = '';
    c.classList.remove('x', 'o', 'win');
  });
  updateStatus();

  if (mode === 'pve' && currentPlayer === BOT) {
    setTimeout(botMove, 300);
  }
}

modeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    mode = radio.value;
    restart();
  });
});

boardEl.addEventListener('click', handleClick);
restartBtn.addEventListener('click', restart);
