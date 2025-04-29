// Add at the beginning of the file, with other global variables

// Game settings
let searchDepth = 6; // Fixed search depth for Z3 analysis - 6 steps

// Add global variables to record Z3 analysis start time
let z3AnalysisStartTime = null;

// Add this function to get Z3 hint
async function getZ3Hint() {
    try {
        // Record the start time of analysis
        z3AnalysisStartTime = Date.now();
        
        const timestamp = new Date().getTime(); // Add timestamp to prevent caching
        console.log(`Requesting Z3 hint with fixed depth ${searchDepth}...`);
        let response = await fetch(`/z3_hint?_t=${timestamp}`);
        let data = await response.json();
        
        // Processing analysis is over
        const analysisEndTime = Date.now();
        const totalAnalysisTime = analysisEndTime - z3AnalysisStartTime;
        
        // If there is no solving_time field in the data, add the front-end calculation time
        if (!data.solving_details) {
            data.solving_details = {};
        }
        
        // If the backend does not provide solving_time, use the front-end calculation time
        if (!data.solving_details.solving_time) {
            data.solving_details.solving_time = totalAnalysisTime;
            console.log(`Frontend calculated analysis time: ${totalAnalysisTime}ms`);
        }
        
        // Process and display the hint
        displayZ3Hint(data);
    } catch (error) {
        console.error('Error getting Z3 hint:', error);
        document.getElementById('z3-hint-content').innerHTML = 
            '<p class="error-text">Error getting Z3 analysis. Please try again.</p>';
    }
}

// Modify the toggleZ3Hint function to use getZ3Hint
function toggleZ3Hint() {
    let panel = document.getElementById('z3-hint-panel');
    let overlay = document.getElementById('modal-overlay');
    
    if (panel.style.display === 'none' || panel.style.display === '') {
        // Record the start time of analysis
        z3AnalysisStartTime = Date.now();
        
        // Clear any previous content
        document.getElementById('z3-hint-content').innerHTML = '<p>Analyzing best move with multi-step lookahead...</p>';
        
        // Show the panel and overlay
        panel.style.display = 'block';
        overlay.style.display = 'block';
        
        // Get Z3 hint
        getZ3Hint();
    } else {
        // Hide the panel and overlay
        panel.style.display = 'none';
        overlay.style.display = 'none';
        
        // Reset the analysis start time
        z3AnalysisStartTime = null;
    }
}

// Replace all existing fetch calls to z3_hint with getZ3Hint()
// Find all occurrences in the file and replace them
// Look for patterns like:
//   let response = await fetch(`/z3_hint?_t=${timestamp}`);

// You'll need to find these manually and replace them

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
            } else {
                // If it's AI's turn and should be skipped, enable the AI move button and update the hint
                const aiMoveButton = document.getElementById("ai-move-button");
                aiMoveButton.disabled = false;
                
                // Update the game hint
                document.getElementById("game-hint").innerHTML = `
                    <p><strong>AI's Turn</strong>: AI has no valid moves and needs to skip its turn.</p>
                    <p>Click <strong>AI Move & Verify</strong> to skip AI's turn and continue.</p>
                `;
                
                // Highlight the AI button
                highlightActiveButton("ai-move-button");
                
                // Update the round indicator
                const totalPieces = parseInt(document.getElementById("black-count").innerText) + 
                                   parseInt(document.getElementById("white-count").innerText);
                const currentTurn = totalPieces - 4 + 1;
                document.getElementById("turn-indicator").innerText = `AI's Turn - Round ${currentTurn}`;
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

// Function to handle player moves
async function playerMove(row, col, isZ3Move = false) {
    // Only clear recommendation if this is not a Z3-assisted move
    if (!isZ3Move) {
        clearZ3Recommendation();
    }
    
    // Save the original hint, so it can be restored when the move is invalid
    const originalHint = document.getElementById("game-hint").innerHTML;
    
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
            
            // Update the round indicator, ensure correct display
            document.getElementById("turn-indicator").innerText = `Your Turn - Round ${totalPieces - 4 + 1}`;
            
            highlightActiveButton(null); // Do not highlight any button, because both are optional
        }, 600); // The flip effect will be displayed after 0.6 seconds
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
    
    // Disable all buttons while AI is thinking
    const verifyHumanButton = document.getElementById("verify-human-button");
    const aiMoveButton = document.getElementById("ai-move-button");
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    verifyHumanButton.disabled = true;
    aiMoveButton.disabled = true;
    z3HelpsHumanButton.disabled = true;
    
    let response = await fetch("/ai_move");
    let result = await response.json();
    
    // Handle the case where AI has no valid moves
    if (result.skip_turn) {
        // AI's turn is skipped, it's human's turn now
        console.log("AI has no valid moves. Skipping AI turn.");
        
        // Update the game hint
        gameHintElement.innerHTML = `
            <p><strong>Your Turn</strong>: AI has no valid moves. Your turn now:</p>
            <ul>
                <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
            </ul>
        `;
        
        // Display the verification results (if any)
        if (result.verification) {
            updateVerificationPanel(result.verification, "white");
        }
        
        // Show the alert
        alert(result.message || "AI has no valid moves. Your turn.");
        
        // Update the board to display the current player's valid moves
        updateBoard(null, [], result.verification, "black", false, true, false, true);
        
        // Enable the related buttons
        z3HelpsHumanButton.disabled = false;
        verifyHumanButton.disabled = true;
        aiMoveButton.disabled = true;
        
        // Update the round indicator, display that it's human's turn
        const currentTurn = parseInt(document.getElementById("black-count").innerText) + 
                           parseInt(document.getElementById("white-count").innerText) - 4 + 1;
        document.getElementById("turn-indicator").innerText = `Your Turn - Round ${currentTurn}`;
        
        // Do not highlight any button
        highlightActiveButton(null);
        
        return;
    }
    // Handle the case where the game is over
    else if (result.game_over) {
        // Game over - neither player has valid moves
        console.log("Game over - neither player has valid moves");
        
        // Display the verification results
        if (result.verification) {
            updateVerificationPanel(result.verification, "white");
        }
        
        // Show the alert
        alert(result.message || "Game over. Neither player has valid moves.");
        
        // Update the game hint
        gameHintElement.innerHTML = `<p><strong>Game Over</strong>: ${result.winner ? result.winner + " wins!" : "It's a draw!"}</p>`;
        
        // Disable all buttons
        verifyHumanButton.disabled = true;
        aiMoveButton.disabled = true;
        z3HelpsHumanButton.disabled = true;
        
        return;
    }
    else if (result.success) {
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
    } else {
        // The original error handling logic
        console.log("AI move failed: ", result);
        
        if (result.verification) {
            // Show verification results
            updateVerificationPanel(result.verification, "white");
        }
        
        // Show the error message
        alert(result.message || "Error during AI move.");
        
        // Try to get valid moves
        let validMovesResponse = await fetch("/valid_moves");
        let validMovesData = await validMovesResponse.json();
        
        // Update the interface based on the current player
        if (validMovesData.current_player === "black") {
            // Human player's turn
            z3HelpsHumanButton.disabled = false;
            
            // Update the game hint
            gameHintElement.innerHTML = `
                <p><strong>Your Turn</strong>: Please choose one of the following options:</p>
                <ul>
                    <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                    <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                    <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
                </ul>
            `;
            
            // Update the board to display the valid moves
            updateBoard(null, [], null, "black", false, true, false, true);
        } else {
            // It's still AI's turn
            aiMoveButton.disabled = false;
            
            // Update the game hint
            gameHintElement.innerHTML = `
                <p><strong>AI's Turn</strong>: Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</p>
            `;
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

// Display full verification results (both black and white)
function showFullVerificationResults(verification) {
    // Update the saved verification results
    for (let key in verification) {
        savedVerificationResults[key] = verification[key];
    }
    
    let resultsDiv = document.getElementById("verification-results");
    resultsDiv.innerHTML = ""; // Clear old results

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
    let panel = document.getElementById('z3-hint-panel');
    let overlay = document.getElementById('modal-overlay');
    
    if (panel.style.display === 'none' || panel.style.display === '') {
        // Record the analysis start time
        z3AnalysisStartTime = Date.now();
        
        // Clear any previous content
        document.getElementById('z3-hint-content').innerHTML = '<p>Analyzing best move with multi-step lookahead...</p>';
        
        // Show the panel and overlay
        panel.style.display = 'block';
        overlay.style.display = 'block';
        
        // Get Z3 hint
        getZ3Hint();
    } else {
        // Hide the panel and overlay
        panel.style.display = 'none';
        overlay.style.display = 'none';
        
        // Reset the analysis start time
        z3AnalysisStartTime = null;
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
    console.log("Z3 helps human move - requesting best move...");
    
    try {
        // Show a message in the UI
        document.getElementById("turn-indicator").innerHTML = "Z3 is calculating the optimal move...";
        
        // Get Z3 hint with current search depth
        const timestamp = new Date().getTime();
        let response = await fetch(`/z3_hint?_t=${timestamp}`);
        let data = await response.json();
        
        if (data.has_move) {
            let row = data.best_move[0];
            let col = data.best_move[1];
            
            console.log(`Z3 suggests move at (${row}, ${col})`);
            
            // Highlight the recommended move position
            highlightRecommendedMove(row, col);
            
            // Update the UI
            document.getElementById("turn-indicator").innerHTML = "Z3 optimal move found, will play in 2 seconds...";
            
            // Wait for 2 seconds, so the user can see the recommended position
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Clear the highlight effect of the recommended position
            clearZ3Recommendation();
            
            // Set the flag, indicating this is a Z3 assisted move
            const isZ3Move = true;
            
            // Make the move using the player move function, pass in the isZ3Move flag
            await playerMove(row, col, isZ3Move);
            
            // Update the UI
            document.getElementById("turn-indicator").innerHTML = "Z3 optimal move placed";
        } else {
            console.log("Z3 could not find a move");
            document.getElementById("turn-indicator").innerHTML = "No valid move found";
        }
    } catch (error) {
        console.error("Error in Z3 helps human move:", error);
        document.getElementById("turn-indicator").innerHTML = "Error finding Z3 move";
    }
}

// Display Z3 hint content
function displayZ3Hint(data) {
    const z3HintContent = document.getElementById("z3-hint-content");
    
    // Calculate the total analysis time (if not yet ended)
    if (z3AnalysisStartTime) {
        const displayEndTime = Date.now();
        const totalDisplayTime = displayEndTime - z3AnalysisStartTime;
        console.log(`Total time from analysis start to display: ${totalDisplayTime}ms`);
        
        // Ensure solving_details and solving_time exist
        if (!data.solving_details) {
            data.solving_details = {};
        }
        
        // Only use the front-end calculated time if the backend does not provide it
        if (!data.solving_details.solving_time) {
            data.solving_details.solving_time = totalDisplayTime;
        }
        
        // Reset the start time
        z3AnalysisStartTime = null;
    }
    
    let content = "";
    
    if (data.has_move) {
        // Format the hint content
        let bestMove = data.best_move;
        let row = data.row || bestMove[0];  // Ensure row value exists
        let col = data.col || bestMove[1];  // Ensure col value exists
        let explanation = data.explanation || "";
        let allMoves = data.all_moves || [];
        let boardAnalysis = data.board_analysis || null;
        let opponentIntent = data.opponent_intent || null;
        let isHeuristic = data.is_heuristic || false;
        let solvingDetails = data.solving_details || {};
        
        console.log(`Z3 suggests best move at (${row}, ${col})`);
        console.log("Opponent intent data:", opponentIntent);
        console.log("Alternative moves data:", allMoves);
        
        // Highlight the recommended move on the board
        highlightRecommendedMove(bestMove[0], bestMove[1]);
        
        // Remove the [Advanced Analysis] prefix from explanation if present
        explanation = explanation.replace(/\[Advanced Analysis\]\s*/, '');
        
        content = `<div class="z3-hint-result">`;
        
        // Best move section - green background
        content += `
            <div class="z3-section best-move-section">
                <h4 class="z3-section-title">Best Move: (${row}, ${col})</h4>
                <p class="z3-explanation">${explanation}</p>
        `;
        
        // Check the analysis model type and add it to the best move section
        if (explanation.includes("[MULTI-STEP ANALYSIS]")) {
            explanation = explanation.replace(/\[MULTI-STEP ANALYSIS\]\s*/, '');
            content += `<p class="z3-model-notice" style="color: #1b5e20;">Using depth ${searchDepth} multi-step lookahead analysis</p>`;
        } else if (isHeuristic) {
            content += `<p class="z3-model-notice" style="color: #b71c1c;">Using advanced heuristic evaluation</p>`;
        } else {
            content += `<p class="z3-model-notice" style="color: #1b5e20;">Using Z3 constraint solving model</p>`;
        }
        content += `</div>`;
        
        // Strategic analysis section - blue background
        content += `
            <div class="z3-section strategic-section">
                <h4 class="z3-section-title">Strategic Analysis</h4>
        `;
        
        if (boardAnalysis) {
            let gameStage = "";
            switch(boardAnalysis.game_stage) {
                case "early": gameStage = "Early"; break;
                case "mid": gameStage = "Middle"; break;
                case "late": gameStage = "Late"; break;
                default: gameStage = "Current"; break;
            }
            
            content += `
                <div class="z3-item"><strong>Game Stage:</strong> ${gameStage}</div>
                <div class="z3-item"><strong>Position Strength:</strong> ${boardAnalysis.position_strength || "Moderate"}</div>
                <div class="z3-item"><strong>Disc Count:</strong> You ${boardAnalysis.black_count || "?"} vs AI ${boardAnalysis.white_count || "?"}</div>
                <div class="z3-item"><strong>Corner Control:</strong> You ${boardAnalysis.corners_black || "0"} vs AI ${boardAnalysis.corners_white || "0"}</div>
                <div class="z3-item"><strong>Edge Control:</strong> You ${boardAnalysis.edges_black || "0"} vs AI ${boardAnalysis.edges_white || "0"}</div>
                <div class="z3-item"><strong>Mobility:</strong> You ${boardAnalysis.black_mobility || "?"} vs AI ${boardAnalysis.white_mobility || "?"}</div>
            `;
        } else {
            // If there is no board analysis data, use the decision factors in the solving details
            if (solvingDetails && solvingDetails.decision_factors) {
                content += `<div class="z3-item"><strong>Key Strategic Considerations:</strong></div><ul class="z3-list">`;
                Object.entries(solvingDetails.decision_factors).forEach(([factor, value]) => {
                    content += `<li><strong>${factor}:</strong> ${value}</li>`;
                });
                content += `</ul>`;
            } else {
                content += `
                    <div class="z3-item">This move balances positional advantage with tactical flexibility.</div>
                    <div class="z3-item">Provides good mobility while limiting opponent's options.</div>
                `;
            }
        }
        content += `</div>`;
        
        // Z3 solving details section - yellow background
        content += `
            <div class="z3-section solving-section">
                <h4 class="z3-section-title">Z3 Solving Process</h4>
        `;
        
        // Ensure actual values are displayed, not N/A
        const solveMethod = solvingDetails.method || "Z3 Constraint Solving";
        const constraintsCount = solvingDetails.constraints_count || "Complex constraint set";
        const searchDepthVal = solvingDetails.depth || searchDepth;
        const positionsEval = solvingDetails.positions_evaluated || "Multiple board positions";
        
        // Process time display - use the recorded total analysis time
        let solveTime = "Processing...";
        if (solvingDetails.solving_time) {
            // If solving_time exists and is a numeric type, add "ms" unit
            if (!isNaN(solvingDetails.solving_time)) {
                // Process time display, ensure the unit is correct
                const timeValue = parseInt(solvingDetails.solving_time);
                
                if (timeValue < 1000) {
                    solveTime = `${timeValue} ms`;
                } else {
                    const seconds = (timeValue / 1000).toFixed(2);
                    solveTime = `${timeValue} ms (${seconds} s)`;
                }
            } else {
                // If not a numeric type, display the original value
                solveTime = solvingDetails.solving_time.toString();
            }
        }
        
        content += `
            <div class="z3-item"><strong>Strategy:</strong> ${solveMethod}</div>
            <div class="z3-item"><strong>Constraints:</strong> ${constraintsCount}</div>
            <div class="z3-item"><strong>Search Depth:</strong> ${searchDepthVal}</div>
            <div class="z3-item"><strong>Positions Analyzed:</strong> ${positionsEval}</div>
            <div class="z3-item"><strong>Processing Time:</strong> ${solveTime}</div>
        `;
        
        if (solvingDetails.key_constraints && solvingDetails.key_constraints.length > 0) {
            content += `<div class="z3-item"><strong>Key Strategic Constraints:</strong></div><ul class="z3-list">`;
            solvingDetails.key_constraints.forEach(constraint => {
                content += `<li>${constraint}</li>`;
            });
            content += `</ul>`;
        }
        
        content += `</div>`;
        
        // Opponent analysis section - red background
        // Modify the condition check to be more lenient, ensuring the opponent intent section is displayed
        if (opponentIntent) {
            content += `
                <div class="z3-section opponent-section">
                    <h4 class="z3-section-title">Opponent Analysis</h4>
            `;
            
            // If there is last_move information, display it
            if (opponentIntent.last_move) {
                content += `<div class="z3-item"><strong>Last Move:</strong> (${opponentIntent.last_move[0]}, ${opponentIntent.last_move[1]})</div>`;
            }
            
            // Display other available information
            if (opponentIntent.move_type) {
                content += `<div class="z3-item"><strong>Move Type:</strong> ${opponentIntent.move_type}</div>`;
            }
            
            if (opponentIntent.intent) {
                content += `<div class="z3-item"><strong>Likely Intent:</strong> ${opponentIntent.intent}</div>`;
            }
            
            if (opponentIntent.flipped_count !== undefined) {
                content += `<div class="z3-item"><strong>Flipped Discs:</strong> ${opponentIntent.flipped_count}</div>`;
            }
            
            // Add trap analysis
            if (opponentIntent.traps && opponentIntent.traps.length > 0) {
                content += `<div class="z3-item"><strong>Trap Warning:</strong></div>`;
                content += `<p class="z3-severity-explanation"><span class="high-severity">[High]</span>: Critical threat &nbsp;|&nbsp; <span class="medium-severity">[Medium]</span>: Moderate threat</p>`;
                
                opponentIntent.traps.forEach(trap => {
                    content += `<div class="z3-trap-item">`;
                    
                    if (trap.black_move) {
                        content += `If you play at (${trap.black_move[0]}, ${trap.black_move[1]}), opponent might:`;
                    }
                    
                    if (trap.threats && trap.threats.length > 0) {
                        trap.threats.forEach(threat => {
                            let severityClass = (threat.severity === "High" || threat.severity === "High Risk") ? 
                                "high-severity" : "medium-severity";
                            
                            content += `
                                <div class="z3-threat">
                                    • ${threat.threat || "Gain advantage"} at (${threat.move ? threat.move[0] : '?'}, ${threat.move ? threat.move[1] : '?'})
                                    <span class="${severityClass}">[${threat.severity || "Medium"}]</span>
                                </div>
                            `;
                        });
                    }
                    
                    content += `</div>`;
                });
            } else {
                content += `<div class="z3-item"><strong>Threats:</strong> No obvious traps detected</div>`;
            }
            
            content += `</div>`;
        }
        
        // Alternatives section - purple background
        if (allMoves && allMoves.length > 1) {
            content += `
                <div class="z3-section alternatives-section">
                    <h4 class="z3-section-title">Alternative Moves</h4>
                    <div class="z3-alternatives">
            `;
            
            // Skip the first move (best move), because it is already displayed above
            let altCount = 0;
            for (let i = 0; i < allMoves.length && altCount < 3; i++) {
                let move = allMoves[i];
                
                // Ensure not to display the same position as the best move
                let moveRow = move.row !== undefined ? move.row : (move.best_move ? move.best_move[0] : null);
                let moveCol = move.col !== undefined ? move.col : (move.best_move ? move.best_move[1] : null);
                
                if (moveRow === row && moveCol === col) {
                    continue;
                }
                
                // Need to ensure the move has an explanation and valid position
                if (!move.explanation || moveRow === null || moveCol === null) {
                    continue;
                }
                
                altCount++;
                
                // Remove possible prefixes and model type indicators
                let moveExplanation = move.explanation
                    .replace(/\[Advanced Analysis\]\s*/, '')
                    .replace(/\[Heuristic Evaluation\]\s*/, '')
                    .replace(/\[MULTI-STEP ANALYSIS\]\s*/, '')
                    .replace(/Simplified Z3 model analysis indicates/g, 'Analysis indicates')
                    .replace(/Minimal Z3 model analysis indicates/g, 'Analysis indicates')
                    .replace(/Full Z3 model analysis indicates/g, 'Analysis indicates')
                    .replace(/Z3 model analysis indicates/g, 'Analysis indicates');
                
                content += `
                    <div>
                        <strong>Position (${moveRow}, ${moveCol})</strong>: 
                        ${moveExplanation}
                    </div>
                `;
            }
            
            if (altCount === 0) {
                content += `<div>No viable alternative moves found</div>`;
            }
            
            content += `</div></div>`;
        }
        
        // Add win probability display
        if (data.win_probability !== undefined) {
            let winProb = data.win_probability;
            let probColor = "";
            
            if (winProb >= 70) {
                probColor = "#27ae60"; // Dark green - very good
            } else if (winProb >= 55) {
                probColor = "#2ecc71"; // Green - good
            } else if (winProb >= 45) {
                probColor = "#f39c12"; // Orange - neutral
            } else if (winProb >= 30) {
                probColor = "#e67e22"; // Light red - poor
            } else {
                probColor = "#e74c3c"; // Red - very poor
            }
            
            content += `
                <div class="z3-section probability-section">
                    <h4 class="z3-section-title">Win Probability</h4>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${winProb}%; background-color: ${probColor};"></div>
                        <div class="progress-text" style="color: ${winProb > 50 ? '#fff' : '#000'};">${winProb}%</div>
                    </div>
                </div>
            `;
        }
        
        content += `</div>`; // 关闭z3-hint-result div
    } else {
        // If there is no valid move, display the message from the API
        content = `<div class="z3-no-move">${data.message || "No valid move could be determined."}</div>`;
    }
    
    z3HintContent.innerHTML = content;
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
                // Disable all player operation buttons
                const verifyHumanButton = document.getElementById("verify-human-button");
                const aiMoveButton = document.getElementById("ai-move-button");
                const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
                
                verifyHumanButton.disabled = true;
                aiMoveButton.disabled = true;
                z3HelpsHumanButton.disabled = true;
                
                // Update the game hint
                document.getElementById("game-hint").innerHTML = `<p><strong>AI's Turn</strong>: Your turn has been skipped as you have no valid moves. AI is thinking...</p>`;
                
                // Update the round indicator
                const totalPieces = parseInt(document.getElementById("black-count").innerText) + 
                                   parseInt(document.getElementById("white-count").innerText);
                const currentTurn = totalPieces - 4 + 1;
                document.getElementById("turn-indicator").innerText = `AI's Turn - Round ${currentTurn}`;
                
                // Highlight the AI button, even though it is disabled
                highlightActiveButton("ai-move-button");
                
                setTimeout(() => {
                    triggerAIMove();
                }, 500);
            }
        }, 500);
    }
}
