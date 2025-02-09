async function updateBoard(lastMove = null, flippedDiscs = []) {
    let response = await fetch("/board");
    let data = await response.json();
    let board = data.board;
    let currentPlayer = data.current_player;
    let blackCount = data.black_count; // 黑棋数量
    let whiteCount = data.white_count; // 白棋数量
    let winner = data.winner;  // 获取赢家信息

    let boardDiv = document.getElementById("board");
    boardDiv.innerHTML = ""; // 清空旧棋盘

    // 更新黑白棋子计数
    document.getElementById("black-count").innerText = blackCount;
    document.getElementById("white-count").innerText = whiteCount;

    // 更新当前回合显示
    let turnIndicator = document.getElementById("turn-indicator");
    // turnIndicator.innerText = currentPlayer === 1 ? "Your turn" : "Computer's turn";
    if (winner) {
        if (winner === "Black") {
            turnIndicator.innerText = "You Win";  // 黑棋赢
        } else if (winner === "White") {
            turnIndicator.innerText = "Computer Wins";  // 白棋赢
        } else {
            turnIndicator.innerText = "Draw";  // 平局
        }
    } else {
        turnIndicator.innerText = currentPlayer === 1 ? "Your Turn" : "Computer's Turn";
    }

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            let cell = document.createElement("div");
            cell.classList.add("cell");

            let piece = null;
            if (board[row][col] === 1) {
                piece = document.createElement("div");
                piece.classList.add("black");
            } else if (board[row][col] === -1) {
                piece = document.createElement("div");
                piece.classList.add("white");
            }

            if (piece) {
                // 刚下的棋子（红点）
                if (lastMove && lastMove[0] === row && lastMove[1] === col) {
                    piece.classList.add("ai-move");
                }

                // 翻转的棋子（红框）
                if (flippedDiscs.some(([r, c]) => r === row && c === col)) {
                    piece.classList.add("highlight");
                }

                cell.appendChild(piece);
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

// 重新开始游戏
function confirmRestart() {
    let confirmation = confirm("Are you sure you want to restart the game?");
    if (confirmation) {
        restartGame();
    }
}

async function restartGame() {
    let response = await fetch("/restart", { method: "POST" });
    let result = await response.json();
    if (result.success) {
        updateBoard();  // 重新加载棋盘
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
        setTimeout(aiMove, 1000); // AI 在 0.5 秒后自动下棋
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
