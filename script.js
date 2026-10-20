const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

let currentPlayer = 'X';
let state = Array(9).fill('');
let gameOver = false;

const winLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function handleClick(e) {
  const cell = e.target;
  const index = Number(cell.dataset.index);

  if (gameOver || state[index] !== '') return;

  state[index] = currentPlayer;
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());

  if (checkWin(currentPlayer)) {
    statusEl.textContent = `Победил ${currentPlayer}! 🎉`;
    gameOver = true;
    highlightWin();
    return;
  }

  if (state.every(v => v !== '')) {
    statusEl.textContent = 'Ничья 🤝';
    gameOver = true;
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  statusEl.textContent = `Ход: ${currentPlayer}`;
}

function checkWin(player) {
  return winLines.some(line =>
    line.every(i => state[i] === player)
  );
}

function highlightWin() {
  winLines.forEach(line => {
    if (line.every(i => state[i] === currentPlayer)) {
      line.forEach(i => cells[i].classList.add('win'));
    }
  });
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
}

boardEl.addEventListener('click', handleClick);
restartBtn.addEventListener('click', restart);
