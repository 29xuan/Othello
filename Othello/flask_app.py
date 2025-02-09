from flask import Flask, request, jsonify, render_template
from game_logic import Othello
from ai import get_ai_move

app = Flask(__name__)
game = Othello()


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

    if game.make_move(row, col):
        return jsonify({
            "success": True,
            "board": game.get_board(),
            "lastMove": (row, col),
            "flippedDiscs": game.get_last_flipped_discs()  # 记录翻转的棋子
        })
    return jsonify({"success": False})


@app.route("/ai_move", methods=["GET"])
def ai_move():
    move = get_ai_move(game)
    if move:
        game.make_move(*move)
        return jsonify({
            "success": True,
            "board": game.get_board(),
            "lastMove": move,
            "flippedDiscs": game.get_last_flipped_discs()
        })
    return jsonify({"success": False})


@app.route("/valid_moves", methods=["GET"])
def valid_moves():
    moves = [(r, c) for r in range(8) for c in range(8) if game.is_valid_move(r, c)]
    return jsonify({"valid_moves": moves})

@app.route("/restart", methods=["POST"])
def restart_game():
    global game
    game = Othello()  # 重新初始化游戏
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)
