from flask import Flask, request, jsonify, render_template
from game_logic import Othello, BLACK, WHITE
from ai import get_ai_move
from verification import OthelloVerifier

app = Flask(__name__)
game = Othello()
verifier = OthelloVerifier(game)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/board", methods=["GET"])
def get_board():
    # return jsonify({"board": game.get_board(), "current_player": game.current_player})
    return jsonify(game.get_board())

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
        
        return jsonify({
            "success": True,
            "board": game.get_board(),
            "lastMove": (row, col),
            "flippedDiscs": game.get_last_flipped_discs(),
            "verification": verification_results,
            "player": "black"
        })
    else:
        # If the move is invalid, also update the verification
        verifier.verify_legal_move(row, col, BLACK)
        verification_results = verifier.run_all_verifications()
        
        return jsonify({
            "success": False,
            "verification": verification_results
        })


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
            
            return jsonify({
                "success": True,
                "board": game.get_board(),
                "lastMove": move,
                "flippedDiscs": game.get_last_flipped_discs(),
                "verification": verification_results,
                "player": "white"
            })
    
    # If AI has no valid move, just return current game state
    verification_results = verifier.run_all_verifications()
    return jsonify({
        "success": False,
        "verification": verification_results
    })


@app.route("/valid_moves", methods=["GET"])
def valid_moves():
    moves = [(r, c) for r in range(8) for c in range(8) if game.is_valid_move(r, c)]
    return jsonify({"valid_moves": moves})

@app.route("/restart", methods=["POST"])
def restart_game():
    global game, verifier
    game = Othello()  # Reinitialize the game
    verifier = OthelloVerifier(game)  # Reinitialize the validator
    return jsonify({"success": True})

@app.route("/verify", methods=["GET"])
def verify_game():
    """Endpoint to run verification on current game state"""
    verification_results = verifier.run_all_verifications()
    return jsonify({"verification": verification_results})

if __name__ == "__main__":
    app.run(debug=True)
