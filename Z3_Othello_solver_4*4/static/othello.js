async function updateBoard(lastMove = null, flippedDiscs = [], verification = null, player = null, showVerification = false, updateButtons = true, showFlippedDiscs = true, showValidMoves = true) {
    let response = await fetch("/board");
    let data = await response.json();
    let board = data.board;
    let currentPlayer = data.current_player;
    let blackCount = data.black_count;
    let whiteCount = data.white_count;
    let winner = data.winner;
    
    // Update the turn count based on the current board state
    const totalPieces = blackCount + whiteCount;
    const currentTurn = Math.ceil((totalPieces - 4) / 2) + 1; 
    
    // Update the chess count displayed at the top of the screen
    document.getElementById("black-count").innerText = blackCount;
    document.getElementById("white-count").innerText = whiteCount;
    
    // Update progress bar
    updateProgressBar(totalPieces);
    
    // Update game status
    const turnIndicator = document.getElementById("turn-indicator");
    
    if (winner) {
        if (winner === "Black") {
            turnIndicator.innerText = "You Win";  // Black player wins
        } else if (winner === "White") {
            turnIndicator.innerText = "AI Wins";  // White player wins
        } else {
            turnIndicator.innerText = "Draw";  // tie
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
        

        if (showValidMoves && currentPlayer === 1) {
            const gameHintText = document.getElementById("game-hint").innerHTML;
            const skipCheckingMoves = 
                gameHintText.includes("Turn Skipped") || 
                gameHintText.includes("AI is thinking");
                
            if (!skipCheckingMoves) {
                const validMoves = await getValidMoves();
                if (validMoves.length === 0) {
                    // Human has no valid moves and needs to skip turn
                    // Store the current board state for return value
                    const boardState = {
                        board: board,
                        currentPlayer: currentPlayer,
                        blackCount: blackCount,
                        whiteCount: whiteCount,
                        winner: winner
                    };
                    
                    // Show warning pop-up window
                    window.alert("You have no valid moves. Your turn will be skipped.");
                    
                    // Show prompt message, no warning pop-up window is used
                    const gameHintElement = document.getElementById("game-hint");
                    gameHintElement.innerHTML = `<p><strong>Your Turn</strong>: There is no valid move for current player, skip to opponent</p>`;
                    
                    // Disable buttons
                    document.getElementById("verify-human-button").disabled = true;
                    document.getElementById("ai-move-button").disabled = true;
                    document.getElementById("z3-helps-human-button").disabled = true;
                    
                    // Wait 3 seconds to switch to AI's turn
                    setTimeout(() => {
                        // Update UI to indicate AI's turn
                        gameHintElement.innerHTML = `
                            <p><strong>AI's Turn</strong>: Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</p>
                        `;
                        
                        // Enable AI Move button, disable other buttons
                        document.getElementById("verify-human-button").disabled = true;
                        document.getElementById("ai-move-button").disabled = false;
                        document.getElementById("z3-helps-human-button").disabled = true;
                        
                        // Highlight AI Move button
                        highlightActiveButton("ai-move-button");
                        
                        // Do not automatically call aiMove()
                    }, 3000); 
                    
                    // Skip the rest of the update to avoid overwriting the message
                    return boardState;
                }
            }
        }
        
        // Enable/disable buttons based on current player only if updateButtons is true
        if (updateButtons) {
            updateButtonState(currentPlayer);
        }
        
        // Update game hint - but only update when human just made a move 
        if (!lastVerificationResult || player !== "black") {
            const hasHumanVerification = lastVerificationResult && lastVerificationPlayer === "black";
            updateGameHint(currentPlayer, hasHumanVerification);
        }
    }

    // Check if the chessboard has been created
    let boardDiv = document.getElementById("board");
    let boardExists = boardDiv.querySelector('.coordinate-row');
    
    // If the chessboard hasn't been created, create the complete chessboard structure
    if (!boardExists) {
        boardDiv.innerHTML = "";
        
        // Create the chessboard coordinate system 
        let topRow = document.createElement("div");
        topRow.classList.add("coordinate-row");
        
        // Add an empty cell as the top left corner
        let emptyCell = document.createElement("div");
        emptyCell.classList.add("coordinate-cell");
        emptyCell.style.width = "25px";
        topRow.appendChild(emptyCell);
        
        // Add the 1-4 column numbers
        for (let col = 0; col < 4; col++) {
            let colHeader = document.createElement("div");
            colHeader.classList.add("coordinate-cell");
            colHeader.textContent = col + 1;
            topRow.appendChild(colHeader);
        }
        boardDiv.appendChild(topRow);

        // Create the chessboard body
        for (let row = 0; row < 4; row++) {
            // Create each row, including the row number and chess grid
            let boardRow = document.createElement("div");
            boardRow.classList.add("board-row");
            boardRow.dataset.row = row;
            
            // Add the row number cell
            let rowHeader = document.createElement("div");
            rowHeader.classList.add("coordinate-cell");
            rowHeader.textContent = row + 1; 
            boardRow.appendChild(rowHeader);
            
            for (let col = 0; col < 4; col++) {
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
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            // Find the corresponding cell
            const cell = boardDiv.querySelector(`.board-row[data-row="${row}"] .cell[data-row="${row}"][data-col="${col}"]`);
            
            // First save whether the current cell has a piece and color
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
                // display the normal chessboard state
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
                        // This is a piece that needs to be flipped, display its original color
                        let piece = document.createElement("div");
                        
                        // Determine the original color based on the current player
                        const originalColor = (player === "black") ? "white" : "black";
                        piece.classList.add(originalColor);
                        
                        cell.appendChild(piece);
                    } else {
                        // This is a normal piece or the newly placed piece, display it directly
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
    
        // When it is the player's turn, get and mark the valid placement positions
    if (currentPlayer === 1 && showValidMoves) { 
        // First check if there is already a valid-move mark, if not, then get the valid positions
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

    // If showVerification is true and we have verification results, update the verification panel
    if (showVerification && verification) {
        updateVerificationPanel(verification, player);
        
        // Show verification results
        let resultsDiv = document.getElementById("verification-results");
        if (resultsDiv.style.display === "none") {
            toggleVerificationResults();
        }
    }

    // Return the current game state for other functions to use
    return {
        board: board,
        currentPlayer: currentPlayer,
        blackCount: blackCount,
        whiteCount: whiteCount,
        winner: winner
    };
}

// Get valid placement positions
async function getValidMoves() {
    let response = await fetch("/valid_moves");
    let data = await response.json();
    return data.valid_moves;
}

// Update button states based on current player and game state
function updateButtonState(currentPlayer) {
    const verifyHumanButton = document.getElementById("verify-human-button");
    const aiMoveButton = document.getElementById("ai-move-button");
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    // Check if there is a verification result for the human player
    const hasHumanVerification = lastVerificationResult && lastVerificationPlayer === "black";
    
    if (currentPlayer === 1) { // Black's turn (human)
        // When it is the human's turn, enable the Z3 helps human button
        z3HelpsHumanButton.disabled = false;
        
        if (hasHumanVerification) {
            // The human just made a move and verified, enable the AI move button, disable the verify button
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = false;
            
            // The Z3 helps human button should be disabled in this case, because the human has already made a move
            z3HelpsHumanButton.disabled = true;
        } else if (lastVerificationResult) {
            // The human just made a move, should be able to verify
            verifyHumanButton.disabled = false;
            aiMoveButton.disabled = false;
            // The Z3 helps human button should be disabled
            z3HelpsHumanButton.disabled = true;
        } else {
            // Initial state or AI made a move, the human should make a move
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
        
        // Clear the verification status in localStorage
        localStorage.removeItem("lastVerificationResult");
        localStorage.removeItem("lastVerificationPlayer");
        localStorage.removeItem("savedVerificationResults");
        localStorage.removeItem("verificationDisplayed");
        
        // Clear move history
        moveHistory = [];
        localStorage.removeItem("moveHistory");
        updateMoveHistoryUI();
        
        // Load the board and not display the movement highlighting
        updateBoard(null, [], null, null, false, true, false, false);
        
        // Then recreate the chessboard DOM structure
        document.getElementById("board").innerHTML = "";
        
        // Load the chessboard normally
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
        
        // Ensure the current difficulty setting is maintained
        const currentDifficulty = localStorage.getItem("aiDifficulty") || "easy";
        setDifficultyOnServer(currentDifficulty, false);
        
        // Show the difficulty callout when restarting the game
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
    
    // Check and prevent repeated updates in Z3 helps human move mode
    const isAfterMoveHint = gameHintElement.innerHTML.includes("<strong>After Your Move</strong>");
    
    // If it is not the after-move hint, update immediately
    if (!isAfterMoveHint) {
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
        // The player successfully made a move, hide the difficulty callout
        hideDifficultyCallout();
        
        // Record the player's move to history
        addMoveToHistory("black", row, col);
        
        // Store the verification result for later use BEFORE updating board
        lastVerificationResult = result.verification;
        lastVerificationPlayer = result.player;
        
        // Save the verification state to localStorage
        saveVerificationState();
        
        // Calculate and update the progress right away
        const blackCount = parseInt(document.getElementById("black-count").innerText) + 1; // Add one for the new piece
        const whiteCount = parseInt(document.getElementById("white-count").innerText);
        const totalPieces = blackCount + whiteCount;
        updateProgressBar(totalPieces);
        
        // Pass in the actual black chess position and the flipped list
        updateBoard(result.lastMove, result.flippedDiscs, null, result.player, false, false, false, true);
        
        // Wait for the animation to complete
        setTimeout(() => {
            // Display all flipped chess pieces
            updateBoard(result.lastMove, result.flippedDiscs, null, result.player, false, false, true, false);
            
            // Manually set the button state
            const verifyHumanButton = document.getElementById("verify-human-button");
            const aiMoveButton = document.getElementById("ai-move-button");
            const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
            
            // The human just made a move
            verifyHumanButton.disabled = false;
            aiMoveButton.disabled = false;
            // Disable the Z3 helps human button
            z3HelpsHumanButton.disabled = true;
            
            // Update the turn indicator to ensure correct display
            document.getElementById("turn-indicator").innerText = `Your Turn - Round ${totalPieces - 4 + 1}`;
            
            highlightActiveButton(null); 
        }, 600); // 0.6 seconds later (white flips black)
    } else {
        // For invalid moves
        alert("Invalid move! Try again.");
        gameHintElement.innerHTML = originalGameHint;
    }
}

// Store the last verification result
let lastVerificationResult = null;
let lastVerificationPlayer = null;

// Restore the verification state from localStorage
function restoreVerificationState() {
    try {
        const savedVerification = localStorage.getItem("lastVerificationResult");
        const savedPlayer = localStorage.getItem("lastVerificationPlayer");
        const savedDetails = localStorage.getItem("savedVerificationResults");
        
        if (savedVerification) {
            // Restore the main verification status
            lastVerificationResult = JSON.parse(savedVerification);
            lastVerificationPlayer = savedPlayer;
            
            // Restore the complete verification details
            if (savedDetails) {
                savedVerificationResults = JSON.parse(savedDetails);
            }
            
            console.log("Restored verification state from localStorage");
        }
    } catch (e) {
        console.error("Error restoring verification state:", e);
        // Clear the state if an error occurs
        localStorage.removeItem("lastVerificationResult");
        localStorage.removeItem("lastVerificationPlayer");
        localStorage.removeItem("savedVerificationResults");
        
        // Reset the verification results
        lastVerificationResult = null;
        lastVerificationPlayer = null;
        savedVerificationResults = {
            board_consistency: null,
            fairness: null,
            legal_moves_black: null,
            legal_moves_white: null,
            termination: null,
            winner_determination: null
        };
    }
}

// Save the verification state
function saveVerificationState() {
    try {
        // Save the verification result and player
        if (lastVerificationResult) {
            localStorage.setItem("lastVerificationResult", JSON.stringify(lastVerificationResult));
            localStorage.setItem("lastVerificationPlayer", lastVerificationPlayer);
            
            // Save the complete verification details
            localStorage.setItem("savedVerificationResults", JSON.stringify(savedVerificationResults));
            
        } else {
            // Clear the storage
            localStorage.removeItem("lastVerificationResult");
            localStorage.removeItem("lastVerificationPlayer");
            localStorage.removeItem("savedVerificationResults");
            localStorage.removeItem("verificationDisplayed"); 
        }
    } catch (e) {
        console.error("Error saving verification state:", e);
    }
}

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
        
        // Update the game hint text
        document.getElementById("game-hint").innerHTML = `
            <p><strong>AI's Turn</strong>: Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</p>
        `;
        highlightActiveButton("ai-move-button");
        
        // Set the verification displayed mark
        localStorage.setItem("verificationDisplayed", "true");
        
        // Save the updated verification state to localStorage
        saveVerificationState();
    } else {
        // Run manual verification
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
    const gameHintElement = document.getElementById("game-hint");
    gameHintElement.innerHTML = `<p><strong>AI's Turn</strong>: Processing move...</p>`;
    highlightActiveButton(null);
    
    try {
        // First get the current player information
        let boardResponse = await fetch("/board");
        let boardData = await boardResponse.json();
        
        // Get the valid moves
        let validMovesResponse = await fetch("/valid_moves");
        let validMovesData = await validMovesResponse.json();
        
        console.log("Current player:", boardData.current_player);
        console.log("Valid moves:", validMovesData.valid_moves);
        
        // Clear the previous verification result and Z3 highlight
        lastVerificationResult = null;
        lastVerificationPlayer = null;
        localStorage.removeItem("verificationDisplayed");
        saveVerificationState();
        
        // Clear the Z3 recommendation highlight
        clearZ3Recommendation();
        
        // Close the Z3 hint panel
        let z3HintPanel = document.getElementById("z3-hint-panel");
        if (z3HintPanel.style.display !== "none") {
            z3HintPanel.style.display = "none";
            document.getElementById("modal-overlay").style.display = "none";
        }
        
        // Directly call the AI move API
        let response = await fetch("/ai_move");
        let result = await response.json();
        
        // Add debugging output to view the server response
        console.log("AI move API response:", result);
        console.log("Result success:", result.success);
        console.log("Result message:", result.message);
        
        // If there are no valid moves, display a warning and wait 3 seconds to skip
        if (result.message === "AI has no valid moves, turn skipped") {
            console.log("AI has no valid moves, displaying skip message");
            
            // Display a warning pop-up window
            window.alert("AI has no valid moves. Skipping to your turn.");
            
            // Display a prompt message
            document.getElementById("game-hint").innerHTML = `<p><strong>AI's Turn</strong>: There is no valid move for current player, skip to opponent</p>`;
            document.getElementById("turn-indicator").innerText = `AI's Turn - No Valid Moves`;
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            updateBoard(null, [], result.verification, result.player, false, true, true, true);
            
            // Enable the Z3 helps button
            z3HelpsHumanButton.disabled = false;
            
            // Update the game hint
            document.getElementById("game-hint").innerHTML = `
                <p><strong>Your Turn</strong>: Please choose one of the following options:</p>
                <ul>
                    <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                    <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                    <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
                </ul>
            `;
            return;
        }
        
        // Process the normal AI move result
        if (result.success) {
            console.log("AI made a successful move:", result.lastMove);
            
            // Record the AI move to history
            addMoveToHistory("white", result.lastMove[0], result.lastMove[1]);
            
            // Pass in the actual white chess position, but set showFlippedDiscs to false
            updateBoard(result.lastMove, result.flippedDiscs, null, result.player, false, false, false, false);
            
            // Wait and then display the flipped chessboard and verification results
            setTimeout(() => {
                // Now display all flipped chess pieces and verification results
                updateBoard(result.lastMove, result.flippedDiscs, result.verification, result.player, true, false, true, false);
                
                // Reset verification results for human player to ensure proper button state
                lastVerificationResult = null;
                lastVerificationPlayer = null;
                
                // Update button state
                const verifyHumanButton = document.getElementById("verify-human-button");
                const aiMoveButton = document.getElementById("ai-move-button");
                const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
                
                verifyHumanButton.disabled = true;
                aiMoveButton.disabled = true;
                z3HelpsHumanButton.disabled = true;
                
                // Wait and display the valid position and enable the related buttons
                setTimeout(async () => {
                    // Now display the valid position
                    updateBoard(result.lastMove, result.flippedDiscs, result.verification, result.player, false, false, true, true);
                    
                    // Enable the Z3 helps button
                    z3HelpsHumanButton.disabled = false;
                    
                    // Update the game hint
                    document.getElementById("game-hint").innerHTML = `
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
            // Process other error cases
            console.error("AI move failed:", result.message);
            
            // Update the board state
            updateBoard(null, [], result.verification, result.player, false, true, true, true);
            
            // If it is the human player's turn
            if (result.player === "black") {
                // Enable the Z3 helps button
                z3HelpsHumanButton.disabled = false;
                
                // Update the game hint to the standard human player options
                document.getElementById("game-hint").innerHTML = `
                    <p><strong>Your Turn</strong>: Please choose one of the following options:</p>
                    <ul>
                        <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                        <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                        <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
                    </ul>
                `;
            }
        }
    } catch (error) {
        console.error("Error in AI move process:", error);
        // When an error occurs, display the error information
        document.getElementById("game-hint").innerHTML = `<p><strong>Error</strong>: ${error.message}</p>`;
    } finally {
        // Restore the button text
        aiMoveButton.textContent = originalText;
        
        // Re-enable the buttons based on the current player
        let boardResponse = await fetch("/board");
        let boardData = await boardResponse.json();
        if (boardData.current_player === 1) {
            // The human player's turn
            z3HelpsHumanButton.disabled = false;
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = true;
        } else {
            // The AI's turn or other scenarios
            updateButtonState(boardData.current_player);
        }
    }
}

// AI automatically takes
async function aiMove() {
    // Clear the Z3 recommended position highlight
    clearZ3Recommendation();
    
    // Clear the previous verification state
    lastVerificationResult = null;
    lastVerificationPlayer = null;
    localStorage.removeItem("verificationDisplayed");
    saveVerificationState();
    
    // Close the Z3 hint panel
    let z3HintPanel = document.getElementById("z3-hint-panel");
    if (z3HintPanel.style.display !== "none") {
        z3HintPanel.style.display = "none";
        document.getElementById("modal-overlay").style.display = "none";
    }
    
    // Store the original game hint to restore later if needed
    const gameHintElement = document.getElementById("game-hint");
    
    // Ensure the message about AI thinking is displayed
    gameHintElement.innerHTML = `<p><strong>AI's Turn</strong>: AI is thinking...</p>`;
    
    try {
        // First check if there is a valid move
        let validMovesResponse = await fetch("/valid_moves");
        let validMovesData = await validMovesResponse.json();
        
        console.log("Valid moves for AI:", validMovesData.valid_moves);
        
        // If there is no valid move, display the prompt information and wait 3 seconds to skip
        if (validMovesData.valid_moves.length === 0) {

            gameHintElement.innerHTML = `<p><strong>AI's Turn</strong>: There is no valid move for current player, skip to opponent</p>`;
            
            // Call the AI move API to skip the turn
            let response = await fetch("/ai_move");
            let result = await response.json();
            
            console.log("AI skip turn result:", result);
            
            // Wait and update the board state
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Update the board state
            updateBoard(null, [], result.verification, result.player, false, true, true, true);
            
            // If it is the human player's turn
            if (result.player === "black") {
                // Enable the Z3 helps button
                document.getElementById("z3-helps-human-button").disabled = false;
                
                // Update the game hint
                gameHintElement.innerHTML = `
                    <p><strong>Your Turn</strong>: Please choose one of the following options:</p>
                    <ul>
                        <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                        <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                        <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
                    </ul>
                `;
            }
            return;
        }
        
        // Get AI move from the server
        let response = await fetch("/ai_move");
        let result = await response.json();
        
        if (result.success) {
            console.log("AI made a successful move:", result.lastMove);
            
            // Record the AI move to history
            addMoveToHistory("white", result.lastMove[0], result.lastMove[1]);
            
            // Pass in the actual white chess position, but set showFlippedDiscs to false
            updateBoard(result.lastMove, result.flippedDiscs, null, result.player, false, false, false, false);
            
            // Wait and then display the flipped chessboard and verification results
            setTimeout(() => {
                // Display all flipped chess pieces and verification results
                updateBoard(result.lastMove, result.flippedDiscs, result.verification, result.player, true, false, true, false);
                
                // Reset verification results for human player
                lastVerificationResult = null;
                lastVerificationPlayer = null;
                
                // Update button state 
                const verifyHumanButton = document.getElementById("verify-human-button");
                const aiMoveButton = document.getElementById("ai-move-button");
                const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
                
                verifyHumanButton.disabled = true;
                aiMoveButton.disabled = true;
                z3HelpsHumanButton.disabled = true;
                
                // Wait and display the valid position and enable the related buttons
                setTimeout(async () => {
                    // Display the valid position
                    updateBoard(result.lastMove, result.flippedDiscs, result.verification, result.player, false, false, true, true);
                    
                    // Enable the Z3 helps button
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
                }, 1200); 
            }, 1000); 
        } else {
            // Process other error cases
            console.error("AI move failed:", result.message);
            
            // Update the board state
            updateBoard(null, [], result.verification, result.player, false, true, true, true);
            
            // If it is the human player's turn
            if (result.player === "black") {
                // Enable the Z3 helps button
                document.getElementById("z3-helps-human-button").disabled = false;
                
                // Update the game hint
                gameHintElement.innerHTML = `
                    <p><strong>Your Turn</strong>: Please choose one of the following options:</p>
                    <ul>
                        <li>Click on a valid position (highlighted in dark) to place your disc.</li>
                        <li>Click <strong>Z3 Suggests Human Move</strong> to get Z3's analysis and suggested optimal move.</li>
                        <li>Click <strong>Z3 Helps Human Move</strong> to automatically play the optimal move based on Z3's strategy.</li>
                    </ul>
                `;
            }
        }
    } catch (error) {
        console.error("Error in AI move process:", error);
        
        // Update the board state and button state
        let boardResponse = await fetch("/board");
        let boardData = await boardResponse.json();
        updateBoard(null, [], null, null, false, true, true, true);
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
        // Create a special function to display the full results
        showFullVerificationResults(result.verification);
        
        // Save the verification state
        if (result.verification.legal_moves_black) {
            lastVerificationResult = result.verification;
            lastVerificationPlayer = "black";
            saveVerificationState();
            
            // Set the verification displayed mark
            localStorage.setItem("verificationDisplayed", "true");
            
            // After manual verification, enable the AI button
            aiMoveButton.disabled = false;
            verifyHumanButton.disabled = true;
            z3HelpsHumanButton.disabled = true;
            
            // Update the prompt text to a concise AI turn prompt
            document.getElementById("game-hint").innerHTML = `
                <p><strong>AI's Turn</strong>: Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</p>
            `;
            highlightActiveButton("ai-move-button");
        } else {
            // Keep all buttons disabled for AI's turn
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = true;
            z3HelpsHumanButton.disabled = true;
        }
    }
}

// Display full verification results
function showFullVerificationResults(verification) {
    // Update the saved verification results
    for (let key in verification) {
        savedVerificationResults[key] = verification[key];
    }
    
    // If the verification contains legal move information
    if (verification.legal_moves_black || verification.legal_moves_white) {
        lastVerificationResult = verification;
        
        // Determine the current verification player
        if (verification.legal_moves_black) {
            lastVerificationPlayer = "black";
        } else if (verification.legal_moves_white) {
            lastVerificationPlayer = "white";
        }
        
        // Save the verification state to localStorage
        saveVerificationState();
    }
    
    let resultsDiv = document.getElementById("verification-results");
    resultsDiv.innerHTML = ""; 

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
    legalMovesTitle.style.marginTop = "-3px";  
    legalMovesTitle.style.marginBottom = "0px"; 
    legalMovesTitle.innerHTML = "<strong>Spec 3-Legal Moves:</strong>";
    resultsDiv.appendChild(legalMovesTitle);

    
    // Add Black Chess Legal Moves Verification
    let blackMovesItem = document.createElement("div");
    blackMovesItem.classList.add("verification-item");
    blackMovesItem.style.marginLeft = "20px";
    blackMovesItem.style.marginTop = "0px";

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
    whiteMovesItem.style.marginTop = "5px"; 

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
    spaceDiv.style.marginBottom = "15px"; 
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
        // Update the maximum height to accommodate new content
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
    
    // Format coordinates
    return coordinates.map(coord => `(${coord[0]}, ${coord[1]})`).join(", ");
}

// Update verification panel
function updateVerificationPanel(verification, player) {
    // Selectively update verification results
    if (verification) {
        for (let key in verification) {
            if (key === "legal_moves_black" && player !== "black") {
                continue;
            }
            
            if (key === "legal_moves_white" && player !== "white") {
                continue;
            }
            
            // Update other shared verification results
            savedVerificationResults[key] = verification[key];
        }
    }

    let resultsDiv = document.getElementById("verification-results");
    resultsDiv.innerHTML = ""; 

    // Add Board Consistency
    if (savedVerificationResults.board_consistency) {
        addVerificationItem(resultsDiv, "Spec 1-Board Consistency", savedVerificationResults.board_consistency);
    }

    // Add Fairness
    if (savedVerificationResults.fairness) {
        addVerificationItem(resultsDiv, "Spec 2-Fairness", savedVerificationResults.fairness, true);
    }

    // Add Legal Moves section titles
    let legalMovesTitle = document.createElement("div");
    legalMovesTitle.classList.add("verification-item");
    legalMovesTitle.style.marginTop = "-3px";  
    legalMovesTitle.style.marginBottom = "0px";
    legalMovesTitle.innerHTML = "<strong>Spec 3-Legal Moves:</strong>";
    resultsDiv.appendChild(legalMovesTitle);

    // The Legal Moves verification result
    if (player === "black") {
        // Display Black Chess Legal Moves Verification
        let blackMovesItem = document.createElement("div");
        blackMovesItem.classList.add("verification-item");
        blackMovesItem.style.marginLeft = "20px";
        blackMovesItem.style.marginTop = "0px"; 

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
    } else if (player === "white") {
        // Display White Chess Legal Moves Verification
        let whiteMovesItem = document.createElement("div");
        whiteMovesItem.classList.add("verification-item");
        whiteMovesItem.style.marginLeft = "20px";
        whiteMovesItem.style.marginTop = "0px";

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
    }

    // Add extra interval between Legal Moves and Termination
    let spaceDiv = document.createElement("div");
    spaceDiv.style.marginBottom = "15px"; 
    resultsDiv.appendChild(spaceDiv);

    // Add Termination
    if (savedVerificationResults.termination) {
        addVerificationItem(resultsDiv, "Spec 4-Termination", savedVerificationResults.termination);
    }

    // Add Winner Determination
    if (savedVerificationResults.winner_determination) {
        addVerificationItem(resultsDiv, "Spec 5-Winner Determination", savedVerificationResults.winner_determination);
    }

    // show it if the verification panel is hidden,
    if (resultsDiv.style.display === "none") {
        toggleVerificationResults();
    } else {
        resultsDiv.style.maxHeight = resultsDiv.scrollHeight + "px";
    }
}

// Add a verification project
function addVerificationItem(container, title, verificationData, allowHTML = false) {
    let item = document.createElement("div");
    item.classList.add("verification-item");
    
    if (verificationData) {
        // Add corresponding classes
        item.classList.add(`verification-${verificationData.status}`);
        
        // If HTML is allowed 
        if (allowHTML) {
            item.innerHTML = `<strong>${title}:</strong> ${verificationData.details}`;
        } else {
            // Otherwise use textContent
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
        highlightActiveButton(null); 
    } else if (currentPlayer === -1) { // White Chess
        if (hasHumanVerification) {
            hintElement.innerHTML = `
                <p><strong>AI's Turn</strong>: Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</p>
            `;
            highlightActiveButton("ai-move-button"); 
        } else {
            hintElement.innerHTML = `
                <p><strong>After Your Move</strong>: Please select one of the following options:</p>
                <ul>
                    <li>Click <strong>Verify Human Move</strong> to verify whether your move satisfies the specifications.</li>
                    <li>Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</li>
                </ul>
            `;
            highlightActiveButton(null); 
        }
    } else {
        // Game over or other cases
        hintElement.innerHTML = `<p><strong>Game Over!</strong> Click 'Restart' to play again.</p>`;
        highlightActiveButton(null); 
    }
}

// Highlight active button
function highlightActiveButton(buttonId) {
    // First remove all highlights
    document.querySelectorAll(".control-button").forEach(btn => {
        btn.classList.remove("active");
    });
    
    // Add a highlight if a button ID is specified
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
}

// Display/hide game hint
function toggleGameHint() {
    const hintElement = document.getElementById("game-hint");
    const hintToggle = document.getElementById("hint-toggle");
    
    // Toggle visibility
    if (hintElement.classList.contains("hidden")) {
        // If hint is hidden
        hintElement.classList.remove("hidden");
        hintToggle.style.display = "none";
    } else {
        // If hint is visible
        hintElement.classList.add("hidden");
        hintToggle.style.display = "flex";
    }
    
    // Save the state in localStorage 
    const isHidden = hintElement.classList.contains("hidden");
    localStorage.setItem("gameHintHidden", isHidden);
}

// Initialize the board when the page is loading
window.onload = function() {
    // First restore the verification state
    restoreVerificationState();
    
    // Restore the movement history
    restoreMovementHistory();
    
    // Initialize the board
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
    
    // Check the current game status
    checkGameStateAfterRefresh();
};

// Initialize difficulty settings and UI
function initializeDifficulty() {
    // Load saved difficulty
    const savedDifficulty = localStorage.getItem("aiDifficulty") || "easy";
    
    // Update UI to reflect the current difficulty
    updateDifficultyUI(savedDifficulty);
    
    // Set the difficulty on the server
    setDifficultyOnServer(savedDifficulty, false);
    
    // Display the difficulty prompt box When the game just starts
    showDifficultyCallout();
    
    // Check the board state
    checkBoardStateForCallout();
}

// Display the difficulty prompt box
function showDifficultyCallout() {
    const callout = document.getElementById("difficulty-callout");
    callout.style.display = "block";
}

// Hide the difficulty prompt box
function hideDifficultyCallout() {
    const callout = document.getElementById("difficulty-callout");
    callout.style.display = "none";
}

// Check the board state
async function checkBoardStateForCallout() {
    let response = await fetch("/board");
    let data = await response.json();
    
    // Get the number of black and white discs on the board
    let blackCount = 0;
    let whiteCount = 0;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (data.board[i][j] === 1) blackCount++;
            else if (data.board[i][j] === -1) whiteCount++;
        }
    }
    
    if (blackCount > 2) {
        hideDifficultyCallout();
    }
}

// Update difficulty UI
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
    
    // Check if game has started
    const blackCount = parseInt(document.getElementById("black-count").innerText);
    const whiteCount = parseInt(document.getElementById("white-count").innerText);
    const totalPieces = blackCount + whiteCount;
    
    // If game has already started
    let shouldRestart = totalPieces > 4;
    
    if (shouldRestart) {
        // Confirm with user that the game will restart
        const confirmRestart = confirm(
            "Changing difficulty level will restart the game. Continue?"
        );
        
        if (!confirmRestart) {
            return; 
        }
        
        // Clear the movement history
        moveHistory = [];
        localStorage.removeItem("moveHistory");
        updateMoveHistoryUI();
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
        
        // Reload the board
        updateBoard(null, [], null, null, false, true, false, false);
        
        // Forcefully recreate the board DOM structure
        document.getElementById("board").innerHTML = "";
        updateBoard(null, [], null, null, false, true, true, true);
        
        // Clear the verification panel
        clearVerificationPanel();
        
        // Display the difficulty prompt box again
        showDifficultyCallout();
    }
}

// Send the difficulty setting to the server
async function setDifficultyOnServer(difficulty, restartNeeded) {
    try {
        // Send the difficulty to the server
        let response = await fetch('/set_difficulty', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                difficulty: difficulty,
                restart: restartNeeded
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let result = await response.json();
        
        if (result.success && restartNeeded) {
            console.log("Game restarted with new difficulty:", difficulty);
            
            // Clear movement history
            moveHistory = [];
            localStorage.removeItem("moveHistory");
            updateMoveHistoryUI();
            
            // Clear the verification state
            lastVerificationResult = null;
            lastVerificationPlayer = null;
            localStorage.removeItem("lastVerificationResult");
            localStorage.removeItem("lastVerificationPlayer");
            localStorage.removeItem("verificationDisplayed");
        }
        
        return result;
    } catch (error) {
        console.error("Error setting difficulty:", error);
        alert("Failed to set difficulty. Please try again.");
        return { success: false };
    }
}

// Check the game status after page refresh 
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
    
    // Display the highlight
    if (lastMove && flippedDiscs && flippedDiscs.length > 0) {
        updateBoard(lastMove, flippedDiscs, null, lastPlayer, false, false, true, true);
    }
    
    // Calculate the number of black and white discs
    let blackCount = 0;
    let whiteCount = 0;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (board[i][j] === 1) blackCount++;
            else if (board[i][j] === -1) whiteCount++;
        }
    }
    
    // Get the button elements
    const verifyHumanButton = document.getElementById("verify-human-button");
    const aiMoveButton = document.getElementById("ai-move-button");
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    // If the game is over
    if (winner) {
        verifyHumanButton.disabled = true;
        aiMoveButton.disabled = true;
        z3HelpsHumanButton.disabled = true;
        document.getElementById("game-hint").innerHTML = `<p><strong>Game Over!</strong> Click 'Restart' to play again.</p>`;
        return;
    }
    
    // Check if there is a black verification result
    if (lastVerificationResult && lastVerificationPlayer === "black" && currentPlayer === -1) {
        let hasDisplayedVerification = false;
        
        try {
            // Determine if the verification result has been displayed
            hasDisplayedVerification = localStorage.getItem("verificationDisplayed") === "true";
        } catch (e) {
            console.error("Error checking verification display status:", e);
        }
        
        if (hasDisplayedVerification) {
            // The black move has been verified
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = false; 
            z3HelpsHumanButton.disabled = true;
            
            // Update to AI move prompt
            document.getElementById("game-hint").innerHTML = `
                <p><strong>AI's Turn</strong>: Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</p>
            `;
            highlightActiveButton("ai-move-button");
            
            // Display the verification results
            if (lastVerificationResult.legal_moves_black) {
                updateVerificationPanel(lastVerificationResult, "black");
                
                // Display the verification results panel
                let resultsDiv = document.getElementById("verification-results");
                if (resultsDiv.style.display === "none") {
                    toggleVerificationResults();
                }
            }
            
            return;
        }
    }
    
    // If the current player is AI (white)
    if (currentPlayer === -1 && blackCount > whiteCount) {
        verifyHumanButton.disabled = false;
        aiMoveButton.disabled = false;
        z3HelpsHumanButton.disabled = true;
        
        // Update the prompt text
        document.getElementById("game-hint").innerHTML = `
            <p><strong>After Your Move</strong>: Please select one of the following options:</p>
            <ul>
                <li>Click <strong>Verify Human Move</strong> to verify whether your move satisfies the specifications.</li>
                <li>Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</li>
            </ul>
        `;
        highlightActiveButton(null);
        
        // Reset the verification state
        lastVerificationResult = null;
        lastVerificationPlayer = null;
        saveVerificationState();
    } else if (currentPlayer === 1) {
        // Normal human turn, waiting for a move
        if (blackCount === whiteCount) {
            // The game just started or the AI has moved
            verifyHumanButton.disabled = true;
            aiMoveButton.disabled = true;
            z3HelpsHumanButton.disabled = false; 
            
            // Update the game hint
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
        }
    } else {
        // Other cases, use standard update
        updateButtonState(currentPlayer);
        updateGameHint(currentPlayer, false);
    }
}

// Function to update the progress bar
function updateProgressBar(totalPieces) {
    // The progress bar calculation logic 
    const initialPieces = 4;
    const maxPieces = 16;   
    const totalMoves = maxPieces - initialPieces;
    
    // Calculate the number of completed steps
    const completedMoves = totalPieces - initialPieces;
    
    // Calculate the progress percentage
    const progress = Math.min(100, Math.round((completedMoves / totalMoves) * 100));
    
    // Update the progress bar
    const progressBar = document.getElementById("progress-bar");
    const progressInner = progressBar.querySelector("div") || document.createElement("div");
    
    // creat the progress bar
    if (!progressBar.contains(progressInner)) {
        progressInner.className = "progress-inner";
        progressBar.appendChild(progressInner);
    }
    
    // set the internal progress bar width
    progressInner.style.width = `${progress}%`;
    
    // update the text to "Completed steps/Total steps" format
    document.getElementById("progress-text").textContent = `Progressed: ${completedMoves}/${totalMoves}`;
}

// Z3 helps human move function
async function z3HelpsHumanMove() {
    // disable the Z3 helps human button
    const z3HelpsHumanButton = document.getElementById("z3-helps-human-button");
    
    // Save the original text
    const originalText = z3HelpsHumanButton.textContent;
    
    // Disable the button but do not change the size
    z3HelpsHumanButton.disabled = true;
    z3HelpsHumanButton.textContent = "Processing...";
    
    try {
        console.log("Requesting Z3 hint for human move...");
        // Get the best move position recommended by Z3
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
            
            // Highlight the recommended position
            highlightRecommendedMove(bestMoveRow, bestMoveCol);
            
            // Update game prompts in advance
            const gameHintElement = document.getElementById("game-hint");
            gameHintElement.innerHTML = `
                <p><strong>After Your Move</strong>: Please select one of the following options:</p>
                <ul>
                    <li>Click <strong>Verify Human Move</strong> to verify whether your move satisfies the specifications.</li>
                    <li>Click <strong>AI Move & Verify</strong> to let the AI make its move and verify it.</li>
                </ul>
            `;
            
            // Wait and automatically place a disc in that position
            setTimeout(async () => {
                // Hide the difficulty prompt box
                hideDifficultyCallout();
                
                // Execute the player's move
                await playerMove(bestMoveRow, bestMoveCol);
                
                // Restore the button text
                z3HelpsHumanButton.textContent = originalText;
            }, 1500); 
        } else {
            // If there are no valid moves
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
            let winProbability = data.win_probability || 50;
            
            console.log(`Z3 suggests best move at (${bestMove[0]}, ${bestMove[1]})`);
            if (isHeuristic) {
                console.log("Note: This move was determined using heuristic evaluation, not Z3 constraint solving");
            }
            
            // Highlight the recommended move on the board
            highlightRecommendedMove(data.best_move[0], data.best_move[1]);
            
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
                    const isHeuristic = move.is_heuristic || false;
                    content += `
                        <div>
                            <strong>Position (${move.move_display[0]}, ${move.move_display[1]})</strong>:
                            ${move.explanation}
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
        
        // Update the Z3 hint content 
        z3HintContent.innerHTML = content;
        
        // Find the existing Close  and replace its event handler
        const existingCloseButton = document.querySelector("#z3-hint-panel .close-button");
        if (existingCloseButton) {
            existingCloseButton.removeAttribute("onclick");
            existingCloseButton.addEventListener("click", () => {
                document.getElementById("z3-hint-panel").style.display = "none";
                document.getElementById("modal-overlay").style.display = "none";
            });
        }
        
    } catch (error) {
        console.error("Error fetching Z3 hint:", error);
        // For error cases, just show a simple message
        z3HintContent.innerHTML = `<p class="error">Error fetching Z3 hint: ${error.message}. Please try again.</p>`;

        const existingCloseButton = document.querySelector("#z3-hint-panel .close-button");
        if (existingCloseButton) {
            existingCloseButton.removeAttribute("onclick");
            
            // Add our event listener
            existingCloseButton.addEventListener("click", () => {
                document.getElementById("z3-hint-panel").style.display = "none";
                document.getElementById("modal-overlay").style.display = "none";
            });
        }
    }
}

// Calculate the number of black and white pieces 
function countPieces(board) {
    let blackCount = 0;
    let whiteCount = 0;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (board[i][j] === 1) blackCount++;
            else if (board[i][j] === -1) whiteCount++;
        }
    }
    return { blackCount, whiteCount };
}

// Storing movement history
let moveHistory = [];

// Add move record to history
function addMoveToHistory(player, row, col) {
    const movePosition = `(${row+1}, ${col+1})`;
    
    if (player === "black") {
        // Black chess moves
        moveHistory.push({
            black: movePosition,
            white: ""
        });
    } else {
        // White chess moves
        if (moveHistory.length > 0) {
            moveHistory[moveHistory.length - 1].white = movePosition;
        } else {
            // If the history is empty 
            moveHistory.push({
                black: "",
                white: movePosition
            });
        }
    }
    
    // Save movement history
    saveMovementHistory();
    
    // Update UI display
    updateMoveHistoryUI();
}

// Update move history UI
function updateMoveHistoryUI() {
    const tbody = document.getElementById("move-history-tbody");
    if (!tbody) return;
    
    // Clear existing content
    tbody.innerHTML = "";
    
    // Add each row of history records
    moveHistory.forEach((move, index) => {
        const row = document.createElement("tr");
        
        // Add black chess moves
        const blackCell = document.createElement("td");
        blackCell.textContent = move.black;
        blackCell.className = move.black ? "black-move" : "";
        row.appendChild(blackCell);
        
        // Add white chess moves
        const whiteCell = document.createElement("td");
        whiteCell.textContent = move.white;
        whiteCell.className = move.white ? "white-move" : "";
        row.appendChild(whiteCell);
        
        // Add the highlight style
        if (index === moveHistory.length - 1) {
            row.className = "latest-move";
        }
        
        tbody.appendChild(row);
    });
    
    // Scroll to the bottom to show the latest move
    const historyPanel = document.querySelector(".move-history-panel");
    if (historyPanel) {
        historyPanel.scrollTop = historyPanel.scrollHeight;
    }
}

// Save movement history
function saveMovementHistory() {
    try {
        localStorage.setItem("moveHistory", JSON.stringify(moveHistory));
    } catch (e) {
        console.error("Error saving move history:", e);
    }
}

// Restore movement history
function restoreMovementHistory() {
    try {
        const savedHistory = localStorage.getItem("moveHistory");
        if (savedHistory) {
            moveHistory = JSON.parse(savedHistory);
            updateMoveHistoryUI();
        }
    } catch (e) {
        console.error("Error restoring move history:", e);
        moveHistory = [];
    }
}
