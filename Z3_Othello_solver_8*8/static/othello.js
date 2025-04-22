async function updateBoard(lastMove = null, flippedDiscs = [], verification = null, player = null, showVerification = false, updateButtons = true, showFlippedDiscs = true, showValidMoves = true) {
    let response = await fetch("/board");
    let data = await response.json();
    let board = data.board;
    let currentPlayer = data.current_player;
    let blackCount = data.black_count;
    let whiteCount = data.white_count;
    let winner = data.winner; 
    
    // Calculate the current round number
    let totalPieces = blackCount + whiteCount;
    let currentTurn = totalPieces - 4 + 1; // +1 because the first round places the 5th piece

    // Update progress bar
    updateProgressBar(totalPieces);

    // Update black and white chess piece count
    document.getElementById("black-count").innerText = blackCount;
    document.getElementById("white-count").innerText = whiteCount;

    // Update the current round display
    let turnIndicator = document.getElementById("turn-indicator");
    
    // Track if we need to check for skipping turn
    let needToCheckSkipTurn = false;

    // If there is a winner, display that and disable buttons
    if (winner) {
        if (winner === "Black") {
            turnIndicator.innerText = "You Win";  
        } else if (winner === "White") {
            turnIndicator.innerText = "AI Wins";  
        } else {
            turnIndicator.innerText = "Draw"; 
        }
        // Disable control buttons when game is over
        document.getElementById("verify-human-button").disabled = true;
        document.getElementById("ai-move-button").disabled = true;
        document.getElementById("z3-helps-human-button").disabled = true;
        
        // Update game hint with consistent HTML format
        document.getElementById("game-hint").innerHTML = `<p><strong>Game Over!</strong> Click 'Restart' to play again.</p>`;
        highlightActiveButton(null);
    } else {
        turnIndicator.innerText = currentPlayer === 1 ? 
            `Your Turn - Round ${currentTurn}` : 
            `AI's Turn - Round ${currentTurn}`;
        
        // Enable/disable buttons based on current player 
        if (updateButtons) {
            updateButtonState(currentPlayer);
        }
        
        // Update game hint 
        if (!lastVerificationResult || player !== "black") {
            const hasHumanVerification = lastVerificationResult && lastVerificationPlayer === "black";
            updateGameHint(currentPlayer, hasHumanVerification);
        }
        
        // Check if we need to check for skipping turn
        needToCheckSkipTurn = (currentPlayer === 1 && !player);
    }

    // Check if the chessboard has been created
    let boardDiv = document.getElementById("board");
    let boardExists = boardDiv.querySelector('.coordinate-row');
    
    // If the chessboard hasn't been created
    if (!boardExists) {
        boardDiv.innerHTML = ""; // Clear the old chessboard
        
        // Create the chessboard coordinate system 
        let topRow = document.createElement("div");
        topRow.classList.add("coordinate-row");
        
        // Add an empty cell as the top left corner
        let emptyCell = document.createElement("div");
        emptyCell.classList.add("coordinate-cell");
        emptyCell.style.width = "25px"; 
        topRow.appendChild(emptyCell);
        
        // Add the 1-8 column numbers
        for (let col = 0; col < 8; col++) {
            let colHeader = document.createElement("div");
            colHeader.classList.add("coordinate-cell");
            colHeader.textContent = col + 1;
            topRow.appendChild(colHeader);
        }
        boardDiv.appendChild(topRow);

        // Create the chessboard body
        for (let row = 0; row < 8; row++) {
            // Create each row
            let boardRow = document.createElement("div");
            boardRow.classList.add("board-row");
            boardRow.dataset.row = row;
            
            // Add the row number cell
            let rowHeader = document.createElement("div");
            rowHeader.classList.add("coordinate-cell");
            rowHeader.textContent = row + 1; 
            boardRow.appendChild(rowHeader);
            
            for (let col = 0; col < 8; col++) {
                let cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.onclick = () => playerMove(row, col);
                boardRow.appendChild(cell);
            }
            boardDiv.appendChild(boardRow);
        }
    }
    
    // Update the existing chessboard state
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            // Find the corresponding cell
            const cell = boardDiv.querySelector(`.board-row[data-row="${row}"] .cell[data-row="${row}"][data-col="${col}"]`);
            
            // First save 
            const hadPiece = cell.querySelector('.black, .white') !== null;
            const wasBlack = cell.querySelector('.black') !== null;
            
            // Save whether there is a valid-move class
            const wasValidMove = cell.classList.contains("valid-move");
            
            // Clear the existing content and style classes 
            cell.innerHTML = "";
            if (!showValidMoves || !wasValidMove) {
                cell.classList.remove("valid-move");
            }
            
            // If it is in the phase of displaying the flipping effect
            if (showFlippedDiscs) {
                // Add new content
                if (board[row][col] === 1 || board[row][col] === -1) {
                    let piece = document.createElement("div");
                    piece.classList.add(board[row][col] === 1 ? "black" : "white");
                    
                    // Mark the last move
                    if (lastMove && lastMove[0] === row && lastMove[1] === col) {
                        piece.classList.add("ai-move");
                    }
                    
                    // Mark the flipped chess piece
                    if (flippedDiscs.some(([r, c]) => r === row && c === col)) {
                        piece.classList.add("highlight");
                        
                        // Add the flipping class
                        if (hadPiece && (
                            // Black to white (AI white chess flips human black chess)
                            (player === "white" && wasBlack && board[row][col] === -1) || 
                            // White to black (human black chess flips AI white chess)
                            (player === "black" && !wasBlack && board[row][col] === 1)
                        )) {
                            piece.classList.add("flipping");
                        }
                    }
                    
                    cell.appendChild(piece);
                }
            } else {
                // Initial placement phase
                if (board[row][col] === 1 || board[row][col] === -1) {
                    // If this position is a piece that needs to be flipped, keep it not flipped
                    if (flippedDiscs.some(([r, c]) => r === row && c === col)) {
                        // This is a piece that needs to be flipped
                        let piece = document.createElement("div");
                        
                        // Determine the original color 
                        const originalColor = (player === "black") ? "white" : "black";
                        piece.classList.add(originalColor);
                        
                        cell.appendChild(piece);
                    } else {
                        // A normal piece or the newly placed piece
                        let piece = document.createElement("div");
                        piece.classList.add(board[row][col] === 1 ? "black" : "white");
                        
                        // Mark the last move
                        if (lastMove && lastMove[0] === row && lastMove[1] === col) {
                            piece.classList.add("ai-move");
                        }
                        
                        cell.appendChild(piece);
                    }
                }
            }
        }
    }
    
        // When it is the player's turn
    if (currentPlayer === 1 && showValidMoves) { 
        // First check if there is already a valid-move mark
        let hasValidMoves = document.querySelectorAll('.valid-move').length > 0;
        
        if (!hasValidMoves) {
            const validMoves = await getValidMoves();
            for (const [row, col] of validMoves) {
                const cell = boardDiv.querySelector(`.board-row[data-row="${row}"] .cell[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.classList.add("valid-move");
                }
            }
        }
    }

    // If showVerification is true and we have verification results
    if (showVerification && verification) {
        updateVerificationPanel(verification, player);
        
        // Show verification results
        let resultsDiv = document.getElementById("verification-results");
        if (resultsDiv.style.display === "none") {
            toggleVerificationResults();
        }
    }

    // Check if we need to check for skip turn logic
    if (needToCheckSkipTurn) {
        checkForSkipTurn();
    }
}

// Get valid placement positions
async function getValidMoves() {
    let response = await fetch("/valid_moves");
    let data = await response.json();
    
    // Check if the current player should skip turn
    if (data.should_skip_turn) {
        // Display message about skipping turn
        const currentPlayer = data.current_player;
        const message = currentPlayer === "black" ? 
            "You have no valid moves. Your turn will be skipped." : 
            "AI has no valid moves. Its turn will be skipped.";
        
        // Show alert to inform the user
        setTimeout(() => {
            alert(message);
            
            // If it's black's turn and should be skipped
            if (currentPlayer === "black") {
                setTimeout(() => {
                    triggerAIMove();
                }, 500);
            }
        }, 500);
    }
    
    return data.valid_moves;
}

// Update button states 
function updateButtonState(currentPlayer) {
    const verifyHumanButton = document.getElementById("verify-human-button");
    const aiMoveButton = document.getElementById("ai-move-button");
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    // Check if there is a verification result for the human player
    const hasHumanVerification = lastVerificationResult && lastVerificationPlayer === "black";
    
    if (currentPlayer === 1) { // Black's turn (human)
        // When it is the human's turn
        z3HelpsHumanButton.disabled = false;
        
        if (hasHumanVerification) {
            // The human just made a move and verified
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = false;
            
            // The Z3 helps human button should be disabled 
            z3HelpsHumanButton.disabled = true;
        } else if (lastVerificationResult) {
            // The human just made a move, should be able to verify
            verifyHumanButton.disabled = false;
            aiMoveButton.disabled = false;
            
            // The Z3 helps human button should be disabled
            z3HelpsHumanButton.disabled = true;
        } else {
            // Initial state or AI made a move
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = true;
        }
        
        // Update the game hint and button highlight
        updateGameHint(currentPlayer, hasHumanVerification);
    } else { // White's turn (AI)
        // AI turn disables all operable buttons
        verifyHumanButton.disabled = true;
        aiMoveButton.disabled = true;
        z3HelpsHumanButton.disabled = true;
        
        // Update the game hint and button highlight
        updateGameHint(currentPlayer, false);
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
    // Clear the Z3 recommended position highlight
    clearZ3Recommendation();
    
    // Close and clear the Z3 hint panel content
    const z3HintPanel = document.getElementById("z3-hint-panel");
    const z3HintContent = document.getElementById("z3-hint-content");
    z3HintPanel.style.display = "none";
    document.getElementById("modal-overlay").style.display = "none";
    z3HintContent.innerHTML = "<p>Analyzing best move...</p>";
    
    // Clear the verification state 
    localStorage.removeItem("verificationCompleted");
    
    // Clear all valid-move highlights
    document.querySelectorAll('.valid-move').forEach(cell => {
        cell.classList.remove('valid-move');
    });
    
    // Clear the chessboard DOM
    document.getElementById("board").innerHTML = "";
    
    let response = await fetch("/restart", { method: "POST" });
    let result = await response.json();
    if (result.success) {
        // Reset verification results
        lastVerificationResult = null;
        lastVerificationPlayer = null;
        
        // Load the board but do not show valid move highlights
        updateBoard(null, [], null, null, false, true, false, false);
        
        // Recreate the chessboard DOM structure
        document.getElementById("board").innerHTML = "";
        
        // Then load the board normally
        updateBoard(null, [], null, null, false, true, true, true);
        
        // Reset button states explicitly
        const verifyHumanButton = document.getElementById("verify-human-button");
        const aiMoveButton = document.getElementById("ai-move-button");
        const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
        
        verifyHumanButton.disabled = true;
        aiMoveButton.disabled = true;
        z3HelpsHumanButton.disabled = false; 
        
        // Clear the verification panel
        clearVerificationPanel();
        
        // maintain the current difficulty setting
        const currentDifficulty = localStorage.getItem("aiDifficulty") || "easy";
        setDifficultyOnServer(currentDifficulty, false);
        
        // When restarting the game
        showDifficultyCallout();
    }
}

// Check whether it is legal
async function isValidMove(row, col) {
    const validMoves = await getValidMoves();
    return validMoves.some(([r, c]) => r === row && c === col);
}

// After the user makes a move
async function playerMove(row, col) {
    // Clear the Z3 recommended position highlight
    clearZ3Recommendation();
    
    // First hide the verification results panel
    let resultsDiv = document.getElementById("verification-results");
    if (resultsDiv.style.display !== "none") {
        toggleVerificationResults();
    }

    // Close the Z3 hint panel
    let z3HintPanel = document.getElementById("z3-hint-panel");
    if (z3HintPanel.style.display !== "none") {
        z3HintPanel.style.display = "none";
        document.getElementById("modal-overlay").style.display = "none";
    }

    // Get the game hint element
    const gameHintElement = document.getElementById("game-hint");
    // Save the original game hint content
    const originalGameHint = gameHintElement.innerHTML;
    
    // Check if the current hint content is already the move prompt
    const isAfterMoveHint = gameHintElement.innerHTML.includes("<strong>After Your Move</strong>");
    
    // If it is not the move prompt
    if (!isAfterMoveHint) {
        // Update the game hint immediately
        gameHintElement.innerHTML = `
            <p><strong>After Your Move</strong>: Please select one of the following options:</p>
            <ul>
                <li>Click <strong>Verify Human Move</strong> to verify whether your move satisfies the specifications.</li>
                <li>Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</li>
            </ul>
        `;
    }

    let response = await fetch("/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, col })
    });

    let result = await response.json();
    if (result.success) {
        // Hide the difficulty callout
        hideDifficultyCallout();
        
        // Store the verification result
        lastVerificationResult = result.verification;
        lastVerificationPlayer = "black"; 
        
        // Calculate and update the progress right away
        const blackCount = parseInt(document.getElementById("black-count").innerText) + 1; 
        const whiteCount = parseInt(document.getElementById("white-count").innerText);
        const totalPieces = blackCount + whiteCount;
        updateProgressBar(totalPieces);
        
        // Pass in the actual black chess position and the flipped list
        updateBoard(result.lastMove, result.flippedDiscs, null, "black", false, false, false, true);
        
        // Wait for the animation to complete, then display the flipped chessboard
        setTimeout(() => {
            // Now display all flipped chess pieces, but remove the valid position highlight
            updateBoard(result.lastMove, result.flippedDiscs, null, "black", false, false, true, false);
            
            // Manually set the button state, override the updateButtonState call in updateBoard
            const verifyHumanButton = document.getElementById("verify-human-button");
            const aiMoveButton = document.getElementById("ai-move-button");
            const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
            
            // The human just made a move, allow the verify button and AI button to be clicked
            verifyHumanButton.disabled = false;
            aiMoveButton.disabled = false;
            // The human has made a move, disable the Z3 helps human button
            z3HelpsHumanButton.disabled = true;
            
            // 更新回合指示器，确保正确显示
            document.getElementById("turn-indicator").innerText = `Your Turn - Round ${totalPieces - 4 + 1}`;
            
            highlightActiveButton(null); // Do not highlight any button, because both are optional
        }, 600); // 0.6秒后显示翻转效果, (白翻黑)
    } else {
        // For invalid moves, just show an alert and restore original hint
        alert("Invalid move! Try again.");
        gameHintElement.innerHTML = originalGameHint;
    }
}

// Store the last verification result
let lastVerificationResult = null;
let lastVerificationPlayer = null;

// Human verification button click handler
async function verifyHumanMove() {
    if (lastVerificationResult && lastVerificationPlayer === "black") {
        updateVerificationPanel(lastVerificationResult, lastVerificationPlayer);
        
        // Show verification results
        let resultsDiv = document.getElementById("verification-results");
        if (resultsDiv.style.display === "none") {
            toggleVerificationResults();
        }
        
        // After verification, enable the AI move button, disable other buttons
        document.getElementById("ai-move-button").disabled = false;
        document.getElementById("verify-human-button").disabled = true;
        document.getElementById("z3-helps-human-button").disabled = true;
        
        // Update the game hint text to a concise AI turn prompt
        document.getElementById("game-hint").innerHTML = `
            <p><strong>AI's Turn</strong>: Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</p>
        `;
        highlightActiveButton("ai-move-button");
        
        // Store verification state in localStorage to maintain state even after page refresh
        try {
            localStorage.setItem("verificationCompleted", "true");
        } catch (e) {
            console.error("Failed to store verification state:", e);
        }
    } else {
        // If no verification result is available, run manual verification
        await manualVerify();
    }
}

// AI move button click handler
async function triggerAIMove() {
    // Disable all buttons during AI processing
    const verifyHumanButton = document.getElementById("verify-human-button");
    const aiMoveButton = document.getElementById("ai-move-button");
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    // Save the original text
    const originalText = aiMoveButton.textContent;
    
    verifyHumanButton.disabled = true;
    aiMoveButton.disabled = true;
    z3HelpsHumanButton.disabled = true;
    aiMoveButton.textContent = "Processing...";
    
    // Update the game hint with consistent HTML format
    document.getElementById("game-hint").innerHTML = `<p><strong>AI's Turn</strong>: AI is thinking...</p>`;
    highlightActiveButton(null);
    
    // Call AI move
    await aiMove();
    
    // Restore button text
    aiMoveButton.textContent = originalText;
}

// AI automatically takes
async function aiMove() {
    // Clear the Z3 recommended position highlight
    clearZ3Recommendation();
    
    // Close the Z3 hint panel
    let z3HintPanel = document.getElementById("z3-hint-panel");
    if (z3HintPanel.style.display !== "none") {
        z3HintPanel.style.display = "none";
        document.getElementById("modal-overlay").style.display = "none";
    }
    
    // Store the original game hint to restore later if needed
    const gameHintElement = document.getElementById("game-hint");
    const originalGameHint = gameHintElement.innerHTML;
    
    // Set the AI thinking hint only once at the beginning
    gameHintElement.innerHTML = `<p><strong>AI's Turn</strong>: AI is thinking...</p>`;
    
    // Clear verification state as AI is making a move
    localStorage.removeItem("verificationCompleted");
    
    let response = await fetch("/ai_move");
    let result = await response.json();
    if (result.success) {
        // First update the placement position, without displaying the flipped chess piece
        // Key: Pass in the actual white chess position, but set showFlippedDiscs to false, so only the new placement is displayed without the flipping effect
        updateBoard(result.lastMove, result.flippedDiscs, null, result.player, false, false, false, false);
        
        // Wait 1 second, then display the flipped chessboard and verification results
        setTimeout(() => {
            // Now display all flipped chess pieces and verification results, but still do not display the valid position
            updateBoard(result.lastMove, result.flippedDiscs, result.verification, result.player, true, false, true, false);
            
            // Reset verification results for human player to ensure proper button state
            lastVerificationResult = null;
            lastVerificationPlayer = null;
            
            // Update button state - Disable all buttons until the active position is displayed
            const verifyHumanButton = document.getElementById("verify-human-button");
            const aiMoveButton = document.getElementById("ai-move-button");
            const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
            
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = true;
            z3HelpsHumanButton.disabled = true; // Temporarily disable all buttons until the active position is displayed
            
            // Don't update the game hint here - keep the AI thinking message until we're done
            
            // Wait 1.2 seconds, then display the valid position and enable the related buttons
            setTimeout(async () => {
                // Now display the valid position - Here, do not directly manipulate the DOM, but call updateBoard again and enable showValidMoves
                updateBoard(result.lastMove, result.flippedDiscs, result.verification, result.player, false, false, true, true);
                
                // Enable the Z3 helps button
                z3HelpsHumanButton.disabled = false;
                
                // Update the game hint with formatted HTML for the human player's turn
                gameHintElement.innerHTML = `
                    <p><strong>Your Turn</strong>: Please choose one of the following options:</p>
                    <ul>
                        <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                        <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                        <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
                    </ul>
                `;
            }, 1200); // Display the valid position after 1.2 seconds
        }, 1000); // Flip effect is displayed after 1 second (black and white)
    } else if (result.verification) {
        // If AI cannot make a move, check if black has moves
        let validMovesResponse = await fetch("/valid_moves");
        let validMovesData = await validMovesResponse.json();
        
        // Show verification results
        updateVerificationPanel(result.verification, "white");
        
        // Show verification results
        let resultsDiv = document.getElementById("verification-results");
        if (resultsDiv.style.display === "none") {
            toggleVerificationResults();
        }
        
        // If AI couldn't move, but game didn't end, it means black has valid moves
        if (!validMovesData.should_skip_turn && validMovesData.valid_moves.length > 0) {
            // Show alert about AI skipping turn
            alert("AI has no valid moves. Your turn continues.");
            
            // Update the UI to show it's black's turn
            let response = await fetch("/board");
            let boardData = await response.json();
            
            // If no winner, it means black can continue
            if (!boardData.winner) {
                // Reset the current player to BLACK
                // This is only necessary for the UI as the server already knows whose turn it is
                gameHintElement.innerHTML = `
                    <p><strong>Your Turn</strong>: AI had no valid moves. Please choose one of the following options:</p>
                    <ul>
                        <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                        <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                        <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
                    </ul>
                `;
                
                // Enable the Z3 helps button and update the board to show valid moves for black
                const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
                z3HelpsHumanButton.disabled = false;
                
                // Update the board to show it's black's turn with valid moves
                updateBoard(null, [], result.verification, "black", false, true, false, true);
            }
        } else {
            // Either black should also skip (which means game is over) or game ended
            // We just show the current game state
            gameHintElement.innerHTML = originalGameHint;
        }
    }
}

// Manually trigger verification
async function manualVerify() {
    // Disable all buttons to prevent repeated operations
    const verifyHumanButton = document.getElementById("verify-human-button");
    const aiMoveButton = document.getElementById("ai-move-button");
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    verifyHumanButton.disabled = true;
    aiMoveButton.disabled = true;
    z3HelpsHumanButton.disabled = true;
    
    let response = await fetch("/verify");
    let result = await response.json();
    if (result.verification) {
        // Update verification state for page refresh consistency
        lastVerificationResult = result.verification;
        lastVerificationPlayer = "black";
        
        // Store verification state in localStorage
        try {
            localStorage.setItem("verificationCompleted", "true");
        } catch (e) {
            console.error("Failed to store verification state:", e);
        }
        
        // When manually verifying, we should see all verification results
        // Create a special function to display the full results
        showFullVerificationResults(result.verification);
        
        // After verification, determine the button state based on whose turn it is
        let boardResponse = await fetch("/board");
        let boardData = await boardResponse.json();
        
        if (boardData.current_player === 1) { // Human's turn
            // After manual verification, enable the AI button
            aiMoveButton.disabled = false;
            verifyHumanButton.disabled = true;
            z3HelpsHumanButton.disabled = true;
            
            // Update the prompt text to a concise AI turn prompt
            document.getElementById("game-hint").innerHTML = `
                <p><strong>AI's Turn</strong>: Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</p>
            `;
            highlightActiveButton("ai-move-button");
        } else { // AI's turn
            // Keep all buttons disabled
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = true;
            z3HelpsHumanButton.disabled = true;
        }
    }
}

// Display full verification results (including Legal Moves of both black and white)
function showFullVerificationResults(verification) {
    // Update the saved verification results
    for (let key in verification) {
        savedVerificationResults[key] = verification[key];
    }
    
    let resultsDiv = document.getElementById("verification-results");
    resultsDiv.innerHTML = ""; // 清空旧结果

    // Add Board Consistency Verification
    if (savedVerificationResults.board_consistency) {
        addVerificationItem(resultsDiv, "Spec 1-Board Consistency", savedVerificationResults.board_consistency);
    }

    // Add Fairness Verification
    if (savedVerificationResults.fairness) {
        addVerificationItem(resultsDiv, "Spec 2-Fairness", savedVerificationResults.fairness, true);
    }

    // Add Legal Moves Title
    let legalMovesTitle = document.createElement("div");
    legalMovesTitle.classList.add("verification-item");
    legalMovesTitle.style.marginTop = "-3px";  // Reduce the top spacing
    legalMovesTitle.style.marginBottom = "0px"; // Reduce the bottom spacing
    legalMovesTitle.innerHTML = "<strong>Spec 3-Legal Moves:</strong>";
    resultsDiv.appendChild(legalMovesTitle);

    // When manually verifying, display the verification results of both black and white
    
    // Add Black Chess Legal Moves Verification
    let blackMovesItem = document.createElement("div");
    blackMovesItem.classList.add("verification-item");
    blackMovesItem.style.marginLeft = "20px";
    blackMovesItem.style.marginTop = "0px"; // Reduce the spacing with the title

    if (savedVerificationResults.legal_moves_black) {
        let status = savedVerificationResults.legal_moves_black.status;
        blackMovesItem.classList.add(`verification-${status}`);
        let blackMoveDetails = `<strong>Black:</strong> ${savedVerificationResults.legal_moves_black.details}`;
        
        // Add flipped chess position information
        const formattedCoords = formatFlippedCoordinates(savedVerificationResults.legal_moves_black.flipped_discs);
        blackMoveDetails += `<br><span style="padding-left: 42px;">flipped white discs at: ${formattedCoords}.</span>`;
        
        blackMovesItem.innerHTML = blackMoveDetails;
    } else {
        blackMovesItem.innerHTML = "<strong>Black:</strong> No move yet.";
    }
    resultsDiv.appendChild(blackMovesItem);

    // Add White Chess Legal Moves Verification
    let whiteMovesItem = document.createElement("div");
    whiteMovesItem.classList.add("verification-item");
    whiteMovesItem.style.marginLeft = "20px";
    whiteMovesItem.style.marginTop = "5px"; // Keep consistent spacing

    if (savedVerificationResults.legal_moves_white) {
        let status = savedVerificationResults.legal_moves_white.status;
        whiteMovesItem.classList.add(`verification-${status}`);
        let whiteMoveDetails = `<strong>White:</strong> ${savedVerificationResults.legal_moves_white.details}`;
        
        // Add flipped chess position information
        const formattedCoords = formatFlippedCoordinates(savedVerificationResults.legal_moves_white.flipped_discs);
        whiteMoveDetails += `<br><span style="padding-left: 45px;">flipped black discs at: ${formattedCoords}.</span>`;
        
        whiteMovesItem.innerHTML = whiteMoveDetails;
    } else {
        whiteMovesItem.innerHTML = "<strong>White:</strong> No move yet.";
    }
    resultsDiv.appendChild(whiteMovesItem);

    // Add extra interval
    let spaceDiv = document.createElement("div");
    spaceDiv.style.marginBottom = "15px";  // Set a larger interval
    resultsDiv.appendChild(spaceDiv);

    // Add Termination Verification
    if (savedVerificationResults.termination) {
        addVerificationItem(resultsDiv, "Spec 4-Termination", savedVerificationResults.termination);
    }

    // Add Winner Determination Verification
    if (savedVerificationResults.winner_determination) {
        addVerificationItem(resultsDiv, "Spec 5-Winner Determination", savedVerificationResults.winner_determination);
    }

    // Display the verification result panel
    if (resultsDiv.style.display === "none") {
        toggleVerificationResults();
    } else {
        // Already shown, update the maximum height to accommodate new content
        resultsDiv.style.maxHeight = resultsDiv.scrollHeight + "px";
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
        addVerificationItem(resultsDiv, "Spec 1-Board Consistency", savedVerificationResults.board_consistency);
    }

    // Add Fairness
    if (savedVerificationResults.fairness) {
        addVerificationItem(resultsDiv, "Spec 2-Fairness", savedVerificationResults.fairness, true);
    }

    // Add Legal Moves section titles to reduce spacing below using special styles
    let legalMovesTitle = document.createElement("div");
    legalMovesTitle.classList.add("verification-item");
    legalMovesTitle.style.marginTop = "-3px";  // Reduce spacing from above
    legalMovesTitle.style.marginBottom = "0px"; // Reduce the spacing below
    legalMovesTitle.innerHTML = "<strong>Spec 3-Legal Moves:</strong>";
    resultsDiv.appendChild(legalMovesTitle);

    // The Legal Moves verification result of which chess piece is displayed according to the current player
    if (player === "black") {
        // Display Black Chess Legal Moves Verification
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
    } else if (player === "white") {
        // Display White Chess Legal Moves Verification
        let whiteMovesItem = document.createElement("div");
        whiteMovesItem.classList.add("verification-item");
        whiteMovesItem.style.marginLeft = "20px";
        whiteMovesItem.style.marginTop = "0px"; // Maintain consistent spacing

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
    }

    // Add extra interval between Legal Moves and Termination
    let spaceDiv = document.createElement("div");
    spaceDiv.style.marginBottom = "15px";  // Set larger intervals
    resultsDiv.appendChild(spaceDiv);

    // Add Termination
    if (savedVerificationResults.termination) {
        addVerificationItem(resultsDiv, "Spec 4-Termination", savedVerificationResults.termination);
    }

    // Add Winner Determination
    if (savedVerificationResults.winner_determination) {
        addVerificationItem(resultsDiv, "Spec 5-Winner Determination", savedVerificationResults.winner_determination);
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

// Update game hint
function updateGameHint(currentPlayer, hasHumanVerification = false) {
    const hintElement = document.getElementById("game-hint");
    
    if (currentPlayer === 1) { // Black Chess - Human player's turn
        hintElement.innerHTML = `
            <p><strong>Your Turn</strong>: Please choose one of the following options:</p>
            <ul>
                <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
            </ul>
        `;
        highlightActiveButton(null); // Do not highlight any button
    } else if (currentPlayer === -1) { // White Chess - AI's turn
        if (hasHumanVerification) {
            hintElement.innerHTML = `<p><strong>AI's Turn</strong>: AI is thinking...</p>`;
            highlightActiveButton("ai-move-button"); // Highlight the AI move button
        } else {
            hintElement.innerHTML = `
                <p><strong>After Your Move</strong>: Please select one of the following options:</p>
                <ul>
                    <li>Click <strong>Verify Human Move</strong> to verify whether your move satisfies the specifications.</li>
                    <li>Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</li>
                </ul>
            `;
            highlightActiveButton(null); // Do not highlight any button, because both are optional
        }
    } else {
        // Game over or other cases
        hintElement.innerHTML = `<p><strong>Game Over!</strong> Click 'Restart' to play again.</p>`;
        highlightActiveButton(null); // Do not highlight any button
    }
}

// Highlight active button
function highlightActiveButton(buttonId) {
    // First remove all highlights
    document.querySelectorAll(".control-button").forEach(btn => {
        btn.classList.remove("active");
    });
    
    // If a button ID is specified, add a highlight
    if (buttonId) {
        const button = document.getElementById(buttonId);
        if (button) button.classList.add("active");
    }
}

// Display/hide game instructions
function toggleInstructions() {
    let panel = document.getElementById("instructions-panel");
    let overlay = document.getElementById("modal-overlay");
    
    if (panel.style.display === "none") {
        // Close Z3 hint panel if open
        document.getElementById("z3-hint-panel").style.display = "none";
        
        // Open instructions panel
        panel.style.display = "block";
        overlay.style.display = "block";
    } else {
        panel.style.display = "none";
        overlay.style.display = "none";
    }
}

// Toggle Z3 hint panel display/hide
function toggleZ3Hint() {
    const z3HintPanel = document.getElementById("z3-hint-panel");
    const modalOverlay = document.getElementById("modal-overlay");
    
    if (z3HintPanel.style.display === "block") {
        z3HintPanel.style.display = "none";
        modalOverlay.style.display = "none";
    } else {
        showZ3Hint();
    }
}

// Highlight the best move recommended by Z3
function highlightRecommendedMove(row, col) {
    // First clear the previous highlight
    clearZ3Recommendation();
    
    // Find the corresponding cell and add the highlight class
    const boardRows = document.querySelectorAll('.board-row');
    if (boardRows && boardRows.length > row) {
        const cells = boardRows[row].querySelectorAll('.cell');
        if (cells && cells.length > col) {
            // +1 because the first element of each row is the row number
            cells[col].classList.add('z3-recommended');
        }
    }
}

// Clear the highlight of the Z3 recommended position
function clearZ3Recommendation() {
    const highlightedCells = document.querySelectorAll('.z3-recommended');
    highlightedCells.forEach(cell => {
        cell.classList.remove('z3-recommended');
    });
}

function closeAllPanels() {
    // Close all panels when clicking on overlay
    document.getElementById("instructions-panel").style.display = "none";
    document.getElementById("z3-hint-panel").style.display = "none";
    document.getElementById("modal-overlay").style.display = "none";
    
    // Do not clear the Z3 recommended highlight, keep the effect until the user selects a move
}

// Display/hide game hint
function toggleGameHint() {
    const hintElement = document.getElementById("game-hint");
    const hintToggle = document.getElementById("hint-toggle");
    
    // Toggle visibility
    if (hintElement.classList.contains("hidden")) {
        // If hint is hidden, show it and hide the question mark
        hintElement.classList.remove("hidden");
        hintToggle.style.display = "none";
    } else {
        // If hint is visible, hide it and show the question mark
        hintElement.classList.add("hidden");
        hintToggle.style.display = "flex";
    }
    
    // Save the state in localStorage so it persists across page refresh
    const isHidden = hintElement.classList.contains("hidden");
    localStorage.setItem("gameHintHidden", isHidden);
}

// Initialize the board when the page is loading
window.onload = function() {
    // Initialize the board, but do not automatically update the button state, wait for later manual setting
    updateBoard(null, [], null, null, false, false, true, true);
    
    // Get the button elements
    const verifyHumanButton = document.getElementById("verify-human-button");
    const aiMoveButton = document.getElementById("ai-move-button");
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    // Add event listeners
    verifyHumanButton.addEventListener("click", verifyHumanMove);
    aiMoveButton.addEventListener("click", triggerAIMove);
    z3HelpsHumanButton.addEventListener("click", z3HelpsHumanMove);
    
    // Add the verification button to the verification panel
    let verifyButton = document.createElement("button");
    verifyButton.id = "verify-button";
    verifyButton.innerText = "Run Verification";
    verifyButton.onclick = manualVerify;
    
    let verificationPanel = document.getElementById("verification-panel");
    verificationPanel.appendChild(verifyButton);
    
    // Check the hidden state of the game hint
    const hintElement = document.getElementById("game-hint");
    const hintToggle = document.getElementById("hint-toggle");
    const isHintHidden = localStorage.getItem("gameHintHidden") === "true";
    
    if (isHintHidden) {
        hintElement.classList.add("hidden");
        hintToggle.style.display = "flex";
    } else {
        hintElement.classList.remove("hidden");
        hintToggle.style.display = "none";
    }
    
    // Initialize difficulty buttons
    initializeDifficulty();
    
    // Check the current game status and set buttons and prompts accordingly
    checkGameStateAfterRefresh();
};

// Initialize difficulty settings and UI
function initializeDifficulty() {
    // Load saved difficulty from localStorage, default to "easy"
    const savedDifficulty = localStorage.getItem("aiDifficulty") || "easy";
    
    // Update UI to reflect the current difficulty
    updateDifficultyUI(savedDifficulty);
    
    // Set the difficulty on the server
    setDifficultyOnServer(savedDifficulty, false);
    
    // When the game just started, show the difficulty callout
    showDifficultyCallout();
    
    // Check the board state, if there are already pieces on the board, hide the callout
    checkBoardStateForCallout();
}

// Show the difficulty callout
function showDifficultyCallout() {
    const callout = document.getElementById("difficulty-callout");
    callout.style.display = "block";
}

// Hide the difficulty callout
function hideDifficultyCallout() {
    const callout = document.getElementById("difficulty-callout");
    callout.style.display = "none";
}

// Check the board state, determine if the callout should be shown
async function checkBoardStateForCallout() {
    let response = await fetch("/board");
    let data = await response.json();
    
    // Get the number of black and white discs on the board
    let blackCount = 0;
    let whiteCount = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (data.board[i][j] === 1) blackCount++;
            else if (data.board[i][j] === -1) whiteCount++;
        }
    }
    
    // If the number of black discs is greater than the initial number (2), it means the player has already played, hide the callout
    if (blackCount > 2) {
        hideDifficultyCallout();
    }
}

// Update difficulty UI to reflect current selection
function updateDifficultyUI(difficulty) {
    const easyButton = document.getElementById("easy-mode");
    const hardButton = document.getElementById("hard-mode");
    
    // Remove active class from all buttons
    easyButton.classList.remove("active");
    hardButton.classList.remove("active");
    
    // Add active class to selected button
    if (difficulty === "easy") {
        easyButton.classList.add("active");
    } else {
        hardButton.classList.add("active");
    }
}

// Function to set the AI difficulty
async function setDifficulty(difficulty) {
    // Get current difficulty from localStorage
    const currentDifficulty = localStorage.getItem("aiDifficulty") || "easy";
    
    // If same difficulty, do nothing
    if (currentDifficulty === difficulty) {
        return;
    }
    
    // Check if game has started (pieces are on the board)
    const blackCount = parseInt(document.getElementById("black-count").innerText);
    const whiteCount = parseInt(document.getElementById("white-count").innerText);
    const totalPieces = blackCount + whiteCount;
    
    // If game has already started (more than initial 4 pieces)
    let shouldRestart = totalPieces > 4;
    
    if (shouldRestart) {
        // Confirm with user that the game will restart
        const confirmRestart = confirm(
            "Changing difficulty level will restart the game. Continue?"
        );
        
        if (!confirmRestart) {
            return; // User canceled
        }
    }
    
    // Save new difficulty to localStorage
    localStorage.setItem("aiDifficulty", difficulty);
    
    // Update UI
    updateDifficultyUI(difficulty);
    
    // Set difficulty on server
    await setDifficultyOnServer(difficulty, shouldRestart);
    
    // If restarting, refresh the board
    if (shouldRestart) {
        // Reset verification results
        lastVerificationResult = null;
        lastVerificationPlayer = null;
        
        // Clear all valid-move highlights on the board
        document.querySelectorAll('.valid-move').forEach(cell => {
            cell.classList.remove('valid-move');
        });
        
        // Reload the board, but ensure not to show valid move highlights (set showValidMoves=false)
        updateBoard(null, [], null, null, false, true, false, false);
        
        // Force re-create the board DOM structure, to ensure no old state remains
        document.getElementById("board").innerHTML = "";
        updateBoard(null, [], null, null, false, true, true, true);
        
        // Clear the verification panel
        clearVerificationPanel();
        
        // Show the difficulty callout
        showDifficultyCallout();
    }
}

// Send difficulty setting to server
async function setDifficultyOnServer(difficulty, restartNeeded) {
    try {
        const response = await fetch("/set_difficulty", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                difficulty: difficulty,
                restart_needed: restartNeeded
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            console.error("Failed to set difficulty:", result);
        }
    } catch (error) {
        console.error("Error setting difficulty:", error);
    }
}

// Check the game status after page refresh and restore the correct UI state
async function checkGameStateAfterRefresh() {
    // Get the current game state
    let response = await fetch("/board");
    let data = await response.json();
    let currentPlayer = data.current_player;
    let board = data.board;
    let winner = data.winner;
    
    // Get the last move and flipped disc information
    let lastMoveResponse = await fetch("/last_move_info");
    let lastMoveData = await lastMoveResponse.json();
    let lastMove = lastMoveData.last_move;
    let flippedDiscs = lastMoveData.flipped_discs;
    let lastPlayer = lastMoveData.last_player;
    
    // Get the verification results
    let verifyResponse = await fetch("/verify");
    let verifyResult = await verifyResponse.json();
    
    // If there is last move and flipped disc information, display the highlight
    if (lastMove && flippedDiscs && flippedDiscs.length > 0) {
        updateBoard(lastMove, flippedDiscs, null, lastPlayer, false, false, true, true);
    }
    
    // Calculate the number of black and white discs
    let blackCount = 0;
    let whiteCount = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (board[i][j] === 1) blackCount++;
            else if (board[i][j] === -1) whiteCount++;
        }
    }
    
    // Get the button elements
    const verifyHumanButton = document.getElementById("verify-human-button");
    const aiMoveButton = document.getElementById("ai-move-button");
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    // If the game is over, display the final result and disable all buttons
    if (winner) {
        verifyHumanButton.disabled = true;
        aiMoveButton.disabled = true;
        z3HelpsHumanButton.disabled = true;
        document.getElementById("game-hint").innerHTML = `<p><strong>Game Over!</strong> Click 'Restart' to play again.</p>`;
        return;
    }
    
    // Key change: Check if lastPlayer is "black", it means the human just played
    if (lastPlayer === "black" && currentPlayer === -1) {
        // Set verification state for consistency
        lastVerificationResult = verifyResult.verification || null;
        lastVerificationPlayer = "black";
        
        // Read verification state from localStorage, this persists through page refreshes
        const verificationCompleted = localStorage.getItem("verificationCompleted") === "true";
        
        // Check if the verification was actually completed (only happens after clicking "Verify Human Move")
        // Multiple checks to determine if verification was performed
        let resultsDiv = document.getElementById("verification-results");
        const wasVerified = 
            // Check localStorage first (most reliable)
            verificationCompleted ||
            // Or check if the verify button was clicked (server-side evidence)
            (verifyResult.verification && 
             verifyResult.verification.legal_moves_black && 
             verifyResult.verification.legal_moves_black.details && 
             verifyResult.verification.legal_moves_black.details.includes("move verified")) ||
            // Or the verification results are already displayed (client-side evidence)
            resultsDiv.style.display !== "none";
                                 
        if (wasVerified) {
            // Human has verified, only enable AI move
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = false;
            z3HelpsHumanButton.disabled = true;
            
            // Display verification results
            updateVerificationPanel(verifyResult.verification, "black");
            if (resultsDiv.style.display === "none") {
                toggleVerificationResults();
            }
            
            // Update game hint
            document.getElementById("game-hint").innerHTML = `
                <p><strong>AI's Turn</strong>: Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</p>
            `;
            highlightActiveButton("ai-move-button");
        } else {
            // Human has played but not verified, enable both buttons
            verifyHumanButton.disabled = false;
            aiMoveButton.disabled = false;
            z3HelpsHumanButton.disabled = true; // Human has moved, disable Z3 helps
            
            // Update the game hint
            document.getElementById("game-hint").innerHTML = `
                <p><strong>After Your Move</strong>: Please select one of the following options:</p>
                <ul>
                    <li>Click <strong>Verify Human Move</strong> to verify whether your move satisfies the specifications.</li>
                    <li>Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</li>
                </ul>
            `;
            highlightActiveButton(null);
        }
        return;
    }
    
    // Other cases
    if (currentPlayer === 1) {
        // Normal human turn, waiting for a move
        if (blackCount === whiteCount) {
            // The game just started or the AI has moved
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = true;
            z3HelpsHumanButton.disabled = false; // Enable the Z3 helps button, allow automatic move
            
            // Clear the verification completed flag when starting a new turn
            localStorage.removeItem("verificationCompleted");
            
            // Update the game hint with the detailed instructions for the start of the game
            document.getElementById("game-hint").innerHTML = `
                <p><strong>Your Turn</strong>: Please choose one of the following options:</p>
                <ul>
                    <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                    <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                    <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
                </ul>
            `;
            highlightActiveButton(null);
        } else {
            // Other cases, use standard update
            updateButtonState(currentPlayer);
            updateGameHint(currentPlayer, false);
            
            // Clear the verification completed flag when starting a new turn
            localStorage.removeItem("verificationCompleted");
        }
    } else {
        // Other cases, use standard update
        updateButtonState(currentPlayer);
        updateGameHint(currentPlayer, false);
    }
}

// Function to update the progress bar based on total pieces
function updateProgressBar(totalPieces) {
    // Calculate the current round number (starting from 0)
    const currentRound = totalPieces - 4; // There are 4 discs initially, subtract them to get the number of rounds played
    const totalRounds = 60; // Total 60 rounds
    
    // Calculate the progress bar width percentage
    const percentage = Math.round((currentRound / totalRounds) * 100);
    
    // Update the progress bar width
    const progressBar = document.getElementById("progress-bar");
    progressBar.style.setProperty('--progress-width', `${percentage}%`);
    
    // Update the text to "Completed rounds/Total rounds" format
    document.getElementById("progress-text").innerText = `Progressed: ${currentRound}/${totalRounds}`;
    
    // Apply CSS variables to set the progress bar width
    document.documentElement.style.setProperty('--progress-width', `${percentage}%`);
}

// Z3 helps human move function - Automatically get and execute the best move position recommended by Z3
async function z3HelpsHumanMove() {
    // Disable the Z3 helps human button, but do not change its size
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    // Save the original text
    const originalText = z3HelpsHumanButton.textContent;
    
    // Disable the button but do not change the size
    z3HelpsHumanButton.disabled = true;
    z3HelpsHumanButton.textContent = "Processing...";
    
    try {
        console.log("Requesting Z3 hint for human move...");
        // Get the best move position recommended by Z3, add a random parameter to prevent caching
        const timestamp = new Date().getTime();
        let response = await fetch(`/z3_hint?_t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, text: ${await response.text()}`);
        }
        
        let data = await response.json();
        console.log("Z3 hint response received:", data);
        
        if (data.has_move) {
            // Get the recommended position
            const bestMoveRow = data.best_move[0];
            const bestMoveCol = data.best_move[1];
            
            console.log(`Z3 recommends move at (${bestMoveRow+1}, ${bestMoveCol+1})`);
            
            // Highlight the recommended position - Use the same highlight method as toggleZ3Hint
            highlightRecommendedMove(bestMoveRow, bestMoveCol);
            
            // Pre-update the game hint, ensure it is synchronized with the move
            const gameHintElement = document.getElementById("game-hint");
            gameHintElement.innerHTML = `
                <p><strong>After Your Move</strong>: Please select one of the following options:</p>
                <ul>
                    <li>Click <strong>Verify Human Move</strong> to verify whether your move satisfies the specifications.</li>
                    <li>Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</li>
                </ul>
            `;
            
            // Wait for 1 second and then automatically place a disc in that position
            setTimeout(async () => {
                // When using Z3 to help place a disc, also hide the difficulty callout
                hideDifficultyCallout();
                
                // Execute the player's move
                await playerMove(bestMoveRow, bestMoveCol);
                
                // Restore the button text, but keep the disabled state
                z3HelpsHumanButton.textContent = originalText;
                // z3HelpsHumanButton.disabled is set to true in playerMove
            }, 1500); // Here we control the time the Z3 recommended position is displayed, currently 1.5 seconds
        } else {
            // If there are no valid moves, display a prompt and restore the button status
            console.log("No valid moves available from Z3:", data.message);
            alert(data.message || "No valid moves available");
            z3HelpsHumanButton.textContent = originalText;
            z3HelpsHumanButton.disabled = false;
        }
    } catch (error) {
        console.error("Error in Z3 helps human move:", error);
        alert("Error getting Z3 recommendation: " + error.message);
        z3HelpsHumanButton.textContent = originalText;
        z3HelpsHumanButton.disabled = false;
    }
}

// Add content to the Z3 hint panel
async function showZ3Hint() {
    const z3HintContent = document.getElementById("z3-hint-content");
    z3HintContent.innerHTML = "<p>Analyzing best move with Z3 constraint solver...</p>";
    
    // Update the title of the Z3 hint panel
    const panelHeading = document.querySelector("#z3-hint-panel .centered-heading");
    if (panelHeading) {
        panelHeading.textContent = "Z3 Suggests Human Move";
    }
    
    // Display the Z3 hint panel and the overlay
    document.getElementById("z3-hint-panel").style.display = "block";
    document.getElementById("modal-overlay").style.display = "block";
    
    // Close other possibly opened panels
    document.getElementById("instructions-panel").style.display = "none";
    
    // Clear the previous Z3 recommendation highlight
    clearZ3Recommendation();
    
    // Get Z3 hint from the server
    try {
        console.log("Requesting Z3 hint for suggestion panel...");
        // Add a random parameter to prevent browser caching results
        const timestamp = new Date().getTime();
        let response = await fetch(`/z3_hint?_t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, text: ${await response.text()}`);
        }
        
        let data = await response.json();
        console.log("Z3 hint data received:", data);
        
        let content = "";
        
        if (data.has_move) {
            // Format the hint content
            let bestMove = data.best_move_display;
            let explanation = data.explanation;
            let allMoves = data.all_moves || [];
            let boardAnalysis = data.board_analysis;
            let opponentIntent = data.opponent_intent;
            let isHeuristic = data.is_heuristic || false;
            
            console.log(`Z3 suggests best move at (${bestMove[0]}, ${bestMove[1]})`);
            
            // Highlight the recommended move on the board
            highlightRecommendedMove(data.best_move[0], data.best_move[1]);
            
            // Remove the [Advanced Analysis] prefix from explanation if present
            explanation = explanation.replace(/\[Advanced Analysis\]\s*/, '');
            
            content = `
                <div class="z3-hint-result">
                    <h4 class="z3-best-move">Best Move: (${bestMove[0]}, ${bestMove[1]})</h4>
            `;
            
            // Check for analysis model type from explanation
            let modelType = "";
            if (explanation.includes("Simplified Z3 model")) {
                modelType = "Simplified Z3 model";
                content += `<p class="z3-model-notice" style="color: #3498db; font-weight: bold;">Note: Using simplified Z3 constraint solving model</p>`;
            } else if (explanation.includes("Minimal Z3 model")) {
                modelType = "Minimal Z3 model";
                content += `<p class="z3-model-notice" style="color: #f39c12; font-weight: bold;">Note: Using minimal Z3 constraint solving model</p>`;
            } else if (isHeuristic) {
                modelType = "Heuristic evaluation";
                content += `<p class="z3-heuristic-notice" style="color: #e74c3c; font-weight: bold;">Note: Using advanced heuristic evaluation (Z3 constraint solving was unsuccessful)</p>`;
            } else {
                modelType = "Full Z3 model";
                content += `<p class="z3-model-notice" style="color: #2ecc71; font-weight: bold;">Note: Using complete Z3 constraint solving model</p>`;
            }
            
            console.log(`Analysis using ${modelType}`);
            
            content += `<p class="z3-explanation">${explanation}</p>`;
            
            // Add the board analysis content
            content += `
                <h4 class="z3-section-title">Board Analysis:</h4>
                <div class="z3-board-analysis">
            `;
            
            if (boardAnalysis) {
                let gameStage = "";
                switch(boardAnalysis.game_stage) {
                    case "early": gameStage = "Early"; break;
                    case "mid": gameStage = "Middle"; break;
                    case "late": gameStage = "Late"; break;
                }
                
                content += `
                    <p>Game Stage: <strong>${gameStage}</strong></p>
                    <p>Current Disc Count: You (Black) <strong>${boardAnalysis.black_count}</strong> vs Opponent (White) <strong>${boardAnalysis.white_count}</strong></p>
                    <p>Corner Control: You (Black) <strong>${boardAnalysis.corners_black}</strong> vs Opponent (White) <strong>${boardAnalysis.corners_white}</strong></p>
                    <p>Edge Control: You (Black) <strong>${boardAnalysis.edges_black}</strong> vs Opponent (White) <strong>${boardAnalysis.edges_white}</strong></p>
                    <p>Stable Discs: You (Black) <strong>${boardAnalysis.stable_black}</strong> vs Opponent (White) <strong>${boardAnalysis.stable_white}</strong></p>
                    <p>Mobility: You (Black) <strong>${boardAnalysis.black_mobility}</strong> vs Opponent (White) <strong>${boardAnalysis.white_mobility}</strong></p>
                `;
            }
            
            content += `</div>`;
            
            // Add opponent intent analysis
            if (opponentIntent && opponentIntent.has_last_move) {
                content += `
                    <h4 class="z3-section-title">Opponent's Last Move Analysis:</h4>
                    <div class="z3-opponent-intent">
                        <p>Last Move Position: (${opponentIntent.last_move_display[0]}, ${opponentIntent.last_move_display[1]})</p>
                        <p>Move Type: <strong>${opponentIntent.move_type}</strong></p>
                        <p>Potential Intent: ${opponentIntent.intent}</p>
                        <p>Flipped <strong>${opponentIntent.flipped_count}</strong> of your discs</p>
                `;
                
                // Add trap analysis
                if (opponentIntent.traps && opponentIntent.traps.length > 0) {
                    content += `<h5 class="z3-trap-title">Potential Trap Warning:</h5>`;
                    
                    // Add explanation of severity levels
                    content += `<p class="z3-severity-explanation"><span class="high-severity">[High]</span>: Critical threat that could give opponent significant advantage. <br><span class="medium-severity">[Medium]</span>: Moderate threat worth considering.</p>`;
                    
                    opponentIntent.traps.forEach(trap => {
                        content += `
                            <div class="z3-trap-item">
                                If you place your disc at (${trap.black_move_display[0]}, ${trap.black_move_display[1]}), your opponent might:
                        `;
                        
                        trap.threats.forEach(threat => {
                            let severityClass = "";
                            let severityText = "";
                            
                            // Fix the severity judgment and display
                            if (threat.severity === "High" || threat.severity === "High Risk") {
                                severityClass = "high-severity";
                                severityText = "High";
                            } else if (threat.severity === "Medium Risk" || threat.severity.includes("Medium")) {
                                severityClass = "medium-severity";
                                severityText = "Medium";
                            } else {
                                severityText = threat.severity;
                            }
                            
                            content += `
                                <div class="z3-threat ${severityClass}">
                                    • ${threat.threat} - at position (${threat.move_display[0]}, ${threat.move_display[1]})
                                    <span class="z3-severity">[${severityText}]</span>
                                </div>
                            `;
                        });
                        
                        content += `</div>`;
                    });
                } else {
                    content += `<p>No obvious traps detected.</p>`;
                }
                
                content += `</div>`;
            }
            
            // Add alternative move options
            if (allMoves && allMoves.length > 1) {
                content += `
                    <h4 class="z3-section-title">Alternative Moves:</h4>
                    <div class="z3-alternatives">
                `;
                
                // Skip the first move (best move) as it's already displayed above
                for (let i = 1; i < allMoves.length; i++) {
                    let move = allMoves[i];
                    // Remove the possible prefixes and model type indications from the description
                    let moveExplanation = move.explanation
                        .replace(/\[Advanced Analysis\]\s*/, '')
                        .replace(/\[Heuristic Evaluation\]\s*/, '')
                        .replace(/Simplified Z3 model analysis indicates/g, 'Analysis indicates')
                        .replace(/Minimal Z3 model analysis indicates/g, 'Analysis indicates')
                        .replace(/Full Z3 model analysis indicates/g, 'Analysis indicates')
                        .replace(/Z3 model analysis indicates/g, 'Analysis indicates');
                    
                    // Add model type indicator for alternative moves
                    let altMovePrefix = "";
                    // if (move.is_heuristic) {
                    //     altMovePrefix = '<span style="color: #e74c3c; font-size: 0.9em;">[Heuristic]</span> ';
                    // } else if (moveExplanation.includes("Simplified Z3 model")) {
                    //     altMovePrefix = '<span style="color: #3498db; font-size: 0.9em;">[Simplified]</span> ';
                    // } else if (moveExplanation.includes("Minimal Z3 model")) {
                    //     altMovePrefix = '<span style="color: #f39c12; font-size: 0.9em;">[Minimal]</span> ';
                    // }
                    
                    content += `
                        <div>
                            <strong>Position (${move.move_display[0]}, ${move.move_display[1]})</strong>: 
                            ${altMovePrefix}${moveExplanation}
                        </div>
                    `;
                }
                
                content += `</div>`;
            }
            
            // Close the z3-hint-result div
            content += `</div>`;
        } else {
            // No valid moves or not the player's turn
            content = `<p class="z3-no-moves">${data.message || "No valid moves available at this moment."}</p>`;
        }
        
        // Update the Z3 hint content - DO NOT add another close button
        z3HintContent.innerHTML = content;
        
        // Find the existing Close button from HTML and replace its event handler
        const existingCloseButton = document.querySelector("#z3-hint-panel .close-button");
        if (existingCloseButton) {
            // Remove the existing onclick attribute if present
            existingCloseButton.removeAttribute("onclick");
            
            // Add our event listener - do NOT clear the Z3 recommendation highlight when closing the panel
            existingCloseButton.addEventListener("click", () => {
                document.getElementById("z3-hint-panel").style.display = "none";
                document.getElementById("modal-overlay").style.display = "none";
                // Do NOT call clearZ3Recommendation() here to keep the highlight
            });
        }
        
    } catch (error) {
        console.error("Error fetching Z3 hint:", error);
        // For error cases, just show a simple message - NO close button, use the existing one
        z3HintContent.innerHTML = `<p class="error">Error fetching Z3 hint: ${error.message}. Please try again.</p>`;
        
        // Find the existing Close button and replace its event handler
        const existingCloseButton = document.querySelector("#z3-hint-panel .close-button");
        if (existingCloseButton) {
            // Remove the existing onclick attribute if present
            existingCloseButton.removeAttribute("onclick");
            
            // Add our event listener - do NOT clear the Z3 recommendation highlight when closing the panel
            existingCloseButton.addEventListener("click", () => {
                document.getElementById("z3-hint-panel").style.display = "none";
                document.getElementById("modal-overlay").style.display = "none";
                // Do NOT call clearZ3Recommendation() here to keep the highlight
            });
        }
    }
}

// New function to specifically check if the current player needs to skip their turn
async function checkForSkipTurn() {
    let response = await fetch("/valid_moves");
    let data = await response.json();
    
    if (data.should_skip_turn) {
        const currentPlayer = data.current_player;
        const message = currentPlayer === "black" ? 
            "You have no valid moves. Your turn will be skipped." : 
            "AI has no valid moves. Its turn will be skipped.";
        
        // Show alert to inform the user
        setTimeout(() => {
            alert(message);
            
            // If it's black's turn and should be skipped, automatically trigger AI's move
            if (currentPlayer === "black") {
                setTimeout(() => {
                    triggerAIMove();
                }, 500);
            }
        }, 500);
    }
}
