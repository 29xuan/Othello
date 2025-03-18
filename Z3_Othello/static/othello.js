async function updateBoard(lastMove = null, flippedDiscs = [], verification = null, player = null) {
    let response = await fetch("/board");
    let data = await response.json();
    let board = data.board;
    let currentPlayer = data.current_player;
    let blackCount = data.black_count; // Number of black chess
    let whiteCount = data.white_count; // Number of white chess
    let winner = data.winner;  // Get winner information

    let boardDiv = document.getElementById("board");
    boardDiv.innerHTML = ""; // Clear the old chessboard

    // Update black and white chess piece count
    document.getElementById("black-count").innerText = blackCount;
    document.getElementById("white-count").innerText = whiteCount;

    // Update the current round display
    let turnIndicator = document.getElementById("turn-indicator");
    // turnIndicator.innerText = currentPlayer === 1 ? "Your turn" : "Computer's turn";
    if (winner) {
        if (winner === "Black") {
            turnIndicator.innerText = "You Win";  // Black player wins
        } else if (winner === "White") {
            turnIndicator.innerText = "Computer Wins";  // White player wins
        } else {
            turnIndicator.innerText = "Draw";  // tie
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
                // The chess piece I just set up (red dot)
                if (lastMove && lastMove[0] === row && lastMove[1] === col) {
                    piece.classList.add("ai-move");
                }

                // Flipped chess pieces (red frame)
                if (flippedDiscs.some(([r, c]) => r === row && c === col)) {
                    piece.classList.add("highlight");
                }

                cell.appendChild(piece);
            }

            // Show legal placement
            if (currentPlayer === 1 && await isValidMove(row, col)) {
                cell.classList.add("valid-move");
            }

            cell.onclick = () => playerMove(row, col);
            boardDiv.appendChild(cell);
        }
    }

    // If there are verification results, update the verification panel
    if (verification) {
        updateVerificationPanel(verification, player);
    }
}

// Start the game again
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
        updateBoard();  // Reload the board
        clearVerificationPanel(); // Clear the verification panel
    }
}


// Check whether it is legal
async function isValidMove(row, col) {
    let response = await fetch("/valid_moves");
    let data = await response.json();
    return data.valid_moves.some(([r, c]) => r === row && c === col);
}

// After the user makes a move, AI will make a move immediately
async function playerMove(row, col) {
    let response = await fetch("/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, col })
    });

    let result = await response.json();
    if (result.success) {
        updateBoard(result.lastMove, result.flippedDiscs, result.verification, result.player);
        setTimeout(aiMove, 1000); // AI plays chess automatically after 1 second
    } else {
        // Even if the move fails, update the verification report
        if (result.verification) {
            updateVerificationPanel(result.verification, "black");
        }
        alert("Invalid move! Try again.");
    }
}

// AI automatically takes
async function aiMove() {
    let response = await fetch("/ai_move");
    let result = await response.json();
    if (result.success) {
        updateBoard(result.lastMove, result.flippedDiscs, result.verification, result.player);
    } else if (result.verification) {
        // If the AI ​​cannot make a move but there are verification results, update the verification panel
        updateVerificationPanel(result.verification, "white");
    }
}

// Manually trigger verification
async function manualVerify() {
    let response = await fetch("/verify");
    let result = await response.json();
    if (result.verification) {
        updateVerificationPanel(result.verification);
    }
}

// Toggle the display/hide of the verification result panel
function toggleVerificationResults() {
    let resultsDiv = document.getElementById("verification-results");
    if (resultsDiv.style.display === "none") {
        resultsDiv.style.display = "block";
        // Set height to trigger transition animation
        resultsDiv.style.maxHeight = resultsDiv.scrollHeight + "px";
    } else {
        resultsDiv.style.maxHeight = "0";
        // Wait for the transition animation to hide
        setTimeout(() => {
            resultsDiv.style.display = "none";
        }, 300);
    }
}

// Save the verification results
let savedVerificationResults = {
    board_consistency: null,
    fairness: null,
    legal_moves_black: null,
    legal_moves_white: null,
    termination: null,
    winner_determination: null
};

// Format flipped chess coordinates
function formatFlippedCoordinates(coordinates) {
    if (!coordinates || coordinates.length === 0) {
        return "None";
    }
    
    // Format coordinates into more readable forms, such as: (3,4), (5,6)
    return coordinates.map(coord => `(${coord[0]}, ${coord[1]})`).join(", ");
}

// Update verification panel
function updateVerificationPanel(verification, player) {
    // Selectively update verification results, only the current player's Legal Moves and general results
    if (verification) {
        for (let key in verification) {
            // The Legal Moves of Black Chess will be updated only when the current player is Black Chess
            if (key === "legal_moves_black" && player !== "black") {
                continue;
            }
            
            // Only when the current player is a white chess player, will the Legal Moves of White chess player be updated
            if (key === "legal_moves_white" && player !== "white") {
                continue;
            }
            
            // Update other shared verification results
            savedVerificationResults[key] = verification[key];
        }
    }

    let resultsDiv = document.getElementById("verification-results");
    resultsDiv.innerHTML = ""; // Clear old results

    // Add Board Consistency
    if (savedVerificationResults.board_consistency) {
        addVerificationItem(resultsDiv, "Board Consistency", savedVerificationResults.board_consistency);
    }

    // Add Fairness
    if (savedVerificationResults.fairness) {
        addVerificationItem(resultsDiv, "Fairness", savedVerificationResults.fairness, true);
    }

    // Add Legal Moves section titles to reduce spacing below using special styles
    let legalMovesTitle = document.createElement("div");
    legalMovesTitle.classList.add("verification-item");
    legalMovesTitle.style.marginTop = "-3px";  // Reduce spacing from above
    legalMovesTitle.style.marginBottom = "0px"; // Reduce the spacing below
    legalMovesTitle.innerHTML = "<strong>Legal Moves:</strong>";
    resultsDiv.appendChild(legalMovesTitle);

    // Add Black's Legal Moves
    let blackMovesItem = document.createElement("div");
    blackMovesItem.classList.add("verification-item");
    blackMovesItem.style.marginLeft = "20px";
    blackMovesItem.style.marginTop = "0px"; // Reduce spacing with title

    if (savedVerificationResults.legal_moves_black) {
        let status = savedVerificationResults.legal_moves_black.status;
        blackMovesItem.classList.add(`verification-${status}`);
        let blackMoveDetails = `<strong>Black:</strong> ${savedVerificationResults.legal_moves_black.details}`;
        
        // Add flipped chess position information and use formatting function
        const formattedCoords = formatFlippedCoordinates(savedVerificationResults.legal_moves_black.flipped_discs);
        blackMoveDetails += `<br><span style="padding-left: 42px;">flipped white discs at: ${formattedCoords}.</span>`;
        
        blackMovesItem.innerHTML = blackMoveDetails;
    } else {
        blackMovesItem.innerHTML = "<strong>Black:</strong> No move yet.";
    }
    resultsDiv.appendChild(blackMovesItem);

    // Add White's Legal Moves
    let whiteMovesItem = document.createElement("div");
    whiteMovesItem.classList.add("verification-item");
    whiteMovesItem.style.marginLeft = "20px";
    whiteMovesItem.style.marginTop = "-5px"; // Maintain consistent spacing

    if (savedVerificationResults.legal_moves_white) {
        let status = savedVerificationResults.legal_moves_white.status;
        whiteMovesItem.classList.add(`verification-${status}`);
        let whiteMoveDetails = `<strong>White:</strong> ${savedVerificationResults.legal_moves_white.details}`;
        
        // Add flipped chess position information and use formatting function
        const formattedCoords = formatFlippedCoordinates(savedVerificationResults.legal_moves_white.flipped_discs);
        whiteMoveDetails += `<br><span style="padding-left: 45px;">flipped black discs at: ${formattedCoords}.</span>`;
        
        whiteMovesItem.innerHTML = whiteMoveDetails;
    } else {
        whiteMovesItem.innerHTML = "<strong>White:</strong> No move yet.";
    }
    resultsDiv.appendChild(whiteMovesItem);

    // Add extra interval between Legal Moves and Termination
    let spaceDiv = document.createElement("div");
    spaceDiv.style.marginBottom = "15px";  // Set larger intervals
    resultsDiv.appendChild(spaceDiv);

    // Add Termination
    if (savedVerificationResults.termination) {
        addVerificationItem(resultsDiv, "Termination", savedVerificationResults.termination);
    }

    // Add Winner Determination
    if (savedVerificationResults.winner_determination) {
        addVerificationItem(resultsDiv, "Winner Determination", savedVerificationResults.winner_determination);
    }

    // If the verification panel is hidden, show it
    if (resultsDiv.style.display === "none") {
        toggleVerificationResults();
    } else {
        // Already shown, update the maximum height to accommodate new content
        resultsDiv.style.maxHeight = resultsDiv.scrollHeight + "px";
    }
}

// Add a verification project
function addVerificationItem(container, title, verificationData, allowHTML = false) {
    let item = document.createElement("div");
    item.classList.add("verification-item");
    
    if (verificationData) {
        // Add corresponding classes according to the verification status
        item.classList.add(`verification-${verificationData.status}`);
        
        // If HTML is allowed (such as bold tags in the Fairness section), use innerHTML
        if (allowHTML) {
            item.innerHTML = `<strong>${title}:</strong> ${verificationData.details}`;
        } else {
            // Otherwise use textContent to avoid injection of HTML
            const details = document.createElement("span");
            details.textContent = verificationData.details;
            item.innerHTML = `<strong>${title}:</strong> `;
            item.appendChild(details);
        }
    } else {
        item.innerHTML = `<strong>${title}:</strong> No data available.`;
    }
    
    container.appendChild(item);
}

// Clear the verification panel
function clearVerificationPanel() {
    let resultsDiv = document.getElementById("verification-results");
    resultsDiv.innerHTML = "";
    resultsDiv.style.display = "none";
    
    // Reset saved verification results
    savedVerificationResults = {
        board_consistency: null,
        fairness: null,
        legal_moves_black: null,
        legal_moves_white: null,
        termination: null,
        winner_determination: null
    };
}

// Initialize the board when the page is loading
window.onload = function() {
    updateBoard();
    
    // Add click event to the verification button
    let verifyButton = document.createElement("button");
    verifyButton.id = "verify-button";
    verifyButton.innerText = "Run Verification";
    verifyButton.onclick = manualVerify;
    
    // Add verification button to the panel
    let verificationPanel = document.getElementById("verification-panel");
    verificationPanel.appendChild(verifyButton);
};
