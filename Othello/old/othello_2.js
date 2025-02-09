async function updateBoard(lastMove = null, flippedDiscs = []) {
    let response = await fetch("/board");
    let data = await response.json();
    let board = data.board;
    let currentPlayer = data.current_player;

    let boardDiv = document.getElementById("board");
    boardDiv.innerHTML = ""; // 清空旧棋盘

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            let cell = document.createElement("div");
            cell.classList.add("cell");

            // 设置黑白棋子
            if (board[row][col] === 1) {
                let piece = document.createElement("div");
                piece.classList.add("black");
                cell.appendChild(piece);
            } else if (board[row][col] === -1) {
                let piece = document.createElement("div");
                piece.classList.add("white");
                cell.appendChild(piece);
            }

            // 标记新落子和翻转的棋子
            if (
                (lastMove && lastMove[0] === row && lastMove[1] === col) ||
                flippedDiscs.some(([r, c]) => r === row && c === col)
            ) {
                cell.classList.add("highlight");
            }

            // 显示合法落子位置
            if (currentPlayer === 1 && await isValidMove(row, col)) {
                cell.classList.add("valid-move");
            }

            cell.onclick = () => playerMove(row, col);
            boardDiv.appendChild(cell);
        }
    }
}

// 检查是否合法落子
async function isValidMove(row, col) {
    let response = await fetch("/valid_moves");
    let data = await response.json();
    return data.valid_moves.some(([r, c]) => r === row && c === col);
}

// 用户落子后，AI 立即落子
async function playerMove(row, col) {
    let response = await fetch("/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, col })
    });

    let result = await response.json();
    if (result.success) {
        updateBoard(result.lastMove, result.flippedDiscs);
        setTimeout(aiMove, 500); // AI 在 0.5 秒后自动下棋
    } else {
        alert("Invalid move! Try again.");
    }
}

// AI 自动落子
async function aiMove() {
    let response = await fetch("/ai_move");
    let result = await response.json();
    if (result.success) {
        updateBoard(result.lastMove, result.flippedDiscs);
    }
}

// 页面加载时初始化棋盘
window.onload = updateBoard;
