from flask import Flask, request, jsonify, render_template
from game_logic import Othello, BLACK, WHITE
from ai import get_ai_move, set_difficulty
from verification import OthelloVerifier
from z3_solver import OthelloZ3Solver
import numpy as np

# Helper function, convert NumPy type to Python native type
def convert_numpy_types(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(i) for i in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(i) for i in obj)
    else:
        return obj

app = Flask(__name__)
game = Othello()
verifier = OthelloVerifier(game)
z3_solver = OthelloZ3Solver(game, max_depth=20)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/board", methods=["GET"])
def get_board():
    board_data = game.get_board()
    return jsonify(convert_numpy_types(board_data))

@app.route("/move", methods=["POST"])
def make_move():
    data = request.get_json()
    row, col = data["row"], data["col"]

    # First verify if the move is valid (for the player's move - BLACK)
    is_valid = game.is_valid_move(row, col)

    if is_valid:
        # Verify move before making it, only update Black's verification
        verifier.verify_legal_move(row, col, BLACK)
        
        # Make the move
        game.make_move(row, col)
        
        # Run remaining verifications
        verification_results = verifier.run_all_verifications()
        
        response_data = {
            "success": True,
            "board": game.get_board(),
            "lastMove": (row, col),
            "flippedDiscs": game.get_last_flipped_discs(),
            "verification": verification_results,
            "player": "black"
        }
        return jsonify(convert_numpy_types(response_data))
    else:
        # If the move is invalid, also update the verification
        verifier.verify_legal_move(row, col, BLACK)
        verification_results = verifier.run_all_verifications()
        
        response_data = {
            "success": False,
            "verification": verification_results
        }
        return jsonify(convert_numpy_types(response_data))


@app.route("/ai_move", methods=["GET"])
def ai_move():
    move = get_ai_move(game)
    
    # Get valid moves for the current player
    valid_moves = game.get_valid_moves()
    
    if not valid_moves:
        # AI has no valid moves, check if human player has moves
        original_player = game.current_player
        game.current_player = -game.current_player  # Switch to human player
        human_valid_moves = game.get_valid_moves()
        
        if human_valid_moves:
            # Human player has valid moves, skip AI's turn
            verification_results = verifier.run_all_verifications()
            
            response_data = {
                "success": True,
                "skip_turn": True,  # Indicate that AI's turn was skipped
                "board": game.get_board(),
                "verification": verification_results,
                "message": "AI has no valid moves. Your turn.",
                "current_player": "black" if game.current_player == BLACK else "white"
            }
            return jsonify(convert_numpy_types(response_data))
        else:
            # Both sides have no valid moves, game over
            game.current_player = original_player  # Restore original player
            verification_results = verifier.run_all_verifications()
            winner = game.check_winner()
            
            response_data = {
                "success": False,
                "game_over": True,
                "verification": verification_results,
                "winner": winner,
                "message": "Neither player has valid moves. Game over."
            }
            return jsonify(convert_numpy_types(response_data))
    
    if move:
        row, col = move
        
        # First verify if the move is valid (for AI's move - WHITE)
        is_valid = game.is_valid_move(row, col)
        
        if is_valid:
            # Verify AI move before making it, only update White's verification
            verifier.verify_legal_move(row, col, WHITE)
            
            # Make the move
            game.make_move(row, col)
            
            # Run remaining verifications
            verification_results = verifier.run_all_verifications()
            
            response_data = {
                "success": True,
                "board": game.get_board(),
                "lastMove": move,
                "flippedDiscs": game.get_last_flipped_discs(),
                "verification": verification_results,
                "player": "white"
            }
            return jsonify(convert_numpy_types(response_data))
    
    # If AI has no valid move, just return current game state
    verification_results = verifier.run_all_verifications()
    response_data = {
        "success": False,
        "verification": verification_results,
        "message": "AI could not make a move. Please try again."
    }
    return jsonify(convert_numpy_types(response_data))


@app.route("/valid_moves", methods=["GET"])
def valid_moves():
    moves = [(r, c) for r in range(8) for c in range(8) if game.is_valid_move(r, c)]
    
    # Check if the current player has no valid moves but the opponent does
    current_player_has_no_moves = len(moves) == 0
    
    # Check if opponent has moves (to determine if game should end)
    original_player = game.current_player
    game.current_player = -game.current_player
    opponent_moves = [(r, c) for r in range(8) for c in range(8) if game.is_valid_move(r, c)]
    game.current_player = original_player  # Reset to original player
    
    # Determine if we should skip turn
    skip_turn = current_player_has_no_moves and len(opponent_moves) > 0
    
    return jsonify({
        "valid_moves": convert_numpy_types(moves),
        "should_skip_turn": skip_turn,
        "current_player": "black" if game.current_player == BLACK else "white"
    })

@app.route("/restart", methods=["POST"])
def restart_game():
    global game, verifier, z3_solver
    game = Othello()  # Reinitialize the game
    verifier = OthelloVerifier(game)  # Reinitialize the verifier
    z3_solver = OthelloZ3Solver(game, max_depth=20)  # Reinitialize the Z3 solver
    return jsonify({"success": True})

@app.route("/verify", methods=["GET"])
def verify_game():
    """Endpoint to run verification on current game state"""
    verification_results = verifier.run_all_verifications()
    return jsonify({"verification": convert_numpy_types(verification_results)})

@app.route("/z3_hint", methods=["GET"])
def get_z3_hint():
    """Endpoint to get Z3 solver hint for the best move for the current player"""
    try:
        print("Z3 hint requested for player:", "BLACK" if game.current_player == BLACK else "WHITE")
        
        # Always use max depth 20 regardless of query parameter
        max_depth = 20
        print(f"Using fixed max depth: {max_depth}")
        
        # Update max depth
        z3_solver.max_depth = max_depth
        
        if game.current_player == BLACK:  # Only give hints for Black (human) player
            # Ensure the Z3 solver references the current game state
            z3_solver.game = game
            
            # Print the current board state for debugging
            print("Current board state:")
            for row in game.board:
                print(" ".join(str(cell) for cell in row))
            
            # Check if there are valid moves
            valid_moves = game.get_valid_moves()
            print(f"Valid moves: {valid_moves}")
            
            if not valid_moves:
                return jsonify({"has_move": False, "message": "No valid moves available for you at this moment."})
            
            # Reanalyze the best move
            print("Calling Z3 solver's analyze_best_move method...")
            hint_result = z3_solver.analyze_best_move()
            
            # Print the result for debugging
            if "best_move" in hint_result and hint_result["best_move"]:
                print(f"Z3 best move: {hint_result['best_move']}")
                if "strategic_evaluation" in hint_result:
                    print(f"Explanation: {hint_result['strategic_evaluation']}")
                    
                # Return format consistent with frontend expectations
                row, col = hint_result["best_move"]
                
                return jsonify({
                    "has_move": True,
                    "best_move": hint_result["best_move"],
                    "best_move_display": f"{chr(65 + col)}{row + 1}",
                    "row": row,
                    "col": col,
                    "explanation": hint_result.get("strategic_evaluation", "Strategic move based on position analysis"),
                    "is_heuristic": False, 
                    "solving_details": {
                        "method": hint_result.get("solving_method", "Z3 Constraint Solving"),
                        "constraints_count": hint_result.get("constraints_count", 0),
                        "depth": max_depth,
                        "positions_evaluated": hint_result.get("positions_evaluated", 0),
                        "solving_time": hint_result.get("solving_time_ms", 0),
                        "key_constraints": hint_result.get("key_constraints", [
                            "Corner control priority",
                            "Edge stability",
                            "Mobility preservation",
                            "Disc flip minimization"
                        ]),
                        "decision_factors": hint_result.get("decision_factors", {
                            "Position value": "High strategic value",
                            "Future mobility": "Maintains good future options",
                            "Opponent limitation": "Restricts opponent's responses",
                            "Board control": "Improves control of key regions"
                        })
                    }
                })
            else:
                print(f"Z3 has no move. Message: {hint_result.get('analysis', 'No message')}")
                return jsonify({
                    "has_move": False,
                    "message": hint_result.get("analysis", "Could not determine best move")
                })
        else:
            print("Not black player's turn, no Z3 hint provided")
            return jsonify({"has_move": False, "message": "Z3 hints are only available during your turn (as Black)."})
    except Exception as e:
        import traceback
        print(f"Error in Z3 hint endpoint: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"has_move": False, "message": f"Error in Z3 solver: {str(e)}"})

@app.route("/last_move_info", methods=["GET"])
def get_last_move_info():
    """Endpoint to get information about the last move and flipped discs"""
    last_move_info = game.get_last_move_info()
    return jsonify(convert_numpy_types(last_move_info))

@app.route("/set_difficulty", methods=["POST"])
def set_ai_difficulty():
    """Endpoint to set the AI difficulty level"""
    data = request.get_json()
    difficulty = data.get("difficulty", "easy")
    
    # Set the difficulty in AI module
    set_difficulty(difficulty)
    
    # If this is a mid-game difficulty change, restart the game
    restart_needed = data.get("restart_needed", False)
    if restart_needed:
        global game, verifier, z3_solver
        game = Othello()  # Reinitialize the game
        verifier = OthelloVerifier(game)  # Reinitialize the verifier
        z3_solver = OthelloZ3Solver(game, max_depth=20)  # Use max_depth=20 parameter to ensure consistency
    
    return jsonify({
        "success": True, 
        "difficulty": difficulty,
        "restarted": restart_needed
    })

if __name__ == "__main__":
    app.run(debug=True)
