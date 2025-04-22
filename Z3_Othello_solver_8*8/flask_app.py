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
z3_solver = OthelloZ3Solver(game)


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
        "verification": verification_results
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
    z3_solver = OthelloZ3Solver(game)  # Reinitialize the Z3 solver
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
            if hint_result["has_move"]:
                print(f"Z3 best move: {hint_result['best_move_display']}")
                print(f"Explanation: {hint_result['explanation']}")
                # If heuristic evaluation was used, print a note
                if hint_result.get("is_heuristic", False):
                    print("Note: This move was determined using heuristic evaluation, not Z3 constraint solving")
            else:
                print(f"Z3 has no move. Message: {hint_result.get('message', 'No message')}")
            
            return jsonify(convert_numpy_types(hint_result))
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
        z3_solver = OthelloZ3Solver(game)  # Reinitialize the Z3 solver
    
    return jsonify({
        "success": True, 
        "difficulty": difficulty,
        "restarted": restart_needed
    })

if __name__ == "__main__":
    app.run(debug=True)
