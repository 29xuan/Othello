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
    try:
        print(f"AI move requested. Current player: {game.current_player}")
        
        # First check if it's AI's turn (WHITE)
        if game.current_player != WHITE:
            print(f"Not AI's turn. Current player: {game.current_player}")
            response_data = {
                "success": False,
                "message": "Not AI's turn",
                "board": game.get_board(),
                "player": "black" if game.current_player == BLACK else "white"
            }
            return jsonify(convert_numpy_types(response_data))
        
        # Check for valid moves first
        valid_moves = game.get_valid_moves()
        print(f"Valid moves for AI: {valid_moves}")
        
        if not valid_moves:
            print("AI has no valid moves, skipping turn")
            # If AI has no valid moves, skip its turn by switching back to the human player
            game.current_player = BLACK
            # Record that the turn was skipped
            game.last_move = None
            game.last_flipped_discs = []
            game.last_player = "white"
            
            # Run verifications after skipping turn
            verification_results = verifier.run_all_verifications()
            
            response_data = {
                "success": False,
                "message": "AI has no valid moves, turn skipped",
                "verification": verification_results,
                "board": game.get_board(),
                "player": "black" 
            }
            return jsonify(convert_numpy_types(response_data))
            
        # Get AI's move
        move = get_ai_move(game)
        if move:
            row, col = move
            print(f"AI selected move: ({row}, {col})")
            
            # Verify if the move is valid
            is_valid = game.is_valid_move(row, col)
            if not is_valid:
                print(f"AI selected invalid move: ({row}, {col})")
                # Fall back to game.ai_move() to handle this case
                ai_move_result, flipped_discs = game.ai_move()
                
                # Run verifications
                verification_results = verifier.run_all_verifications()
                
                response_data = {
                    "success": False,
                    "message": "AI selected invalid move",
                    "verification": verification_results,
                    "board": game.get_board(),
                    "player": "white" if game.current_player == WHITE else "black"
                }
                return jsonify(convert_numpy_types(response_data))
            
            # Verify AI move before making it
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
        else:
            print("AI failed to select a move despite having valid moves")
            # Fall back to game.ai_move()
            ai_move_result, flipped_discs = game.ai_move()
            
            # Run verifications
            verification_results = verifier.run_all_verifications()
            
            response_data = {
                "success": ai_move_result is not None,
                "verification": verification_results,
                "board": game.get_board(),
                "player": "white" if game.current_player == WHITE else "black",
                "lastMove": ai_move_result,
                "flippedDiscs": flipped_discs
            }
            return jsonify(convert_numpy_types(response_data))
    
    except Exception as e:
        import traceback
        print(f"Error in AI move endpoint: {str(e)}")
        print(traceback.format_exc())
        
        # Return error response
        response_data = {
            "success": False,
            "message": f"Error processing AI move: {str(e)}",
            "board": game.get_board(),
            "player": "white" if game.current_player == WHITE else "black"
        }
        return jsonify(convert_numpy_types(response_data))


@app.route("/valid_moves", methods=["GET"])
def valid_moves():
    moves = [(r, c) for r in range(4) for c in range(4) if game.is_valid_move(r, c)]
    return jsonify({"valid_moves": convert_numpy_types(moves)})

@app.route("/restart", methods=["POST"])
def restart_game():
    global game, verifier, z3_solver
    game = Othello()  
    verifier = OthelloVerifier(game)  
    z3_solver = OthelloZ3Solver(game) 
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
        
        if game.current_player == BLACK:
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
        game = Othello()  
        verifier = OthelloVerifier(game) 
        z3_solver = OthelloZ3Solver(game) 
    
    return jsonify({
        "success": True, 
        "difficulty": difficulty,
        "restarted": restart_needed
    })

if __name__ == "__main__":
    app.run(debug=True)
