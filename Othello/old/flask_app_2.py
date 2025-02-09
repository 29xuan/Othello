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
    return jsonify({"board": game.get_board(), "current_player": game.current_player})


@app.route("/move", methods=["POST"])
def make_move():
    data = request.get_json()
    row, col = data["row"], data["col"]

    if game.make_move(row, col):
        return jsonify({"success": True, "board": game.get_board()})
    return jsonify({"success": False})


@app.route("/ai_move", methods=["GET"])
def ai_move():
    move = get_ai_move(game)
    if move:
        game.make_move(*move)
        return jsonify({"success": True, "board": game.get_board(), "move": move})
    return jsonify({"success": False})


if __name__ == "__main__":
    app.run(debug=True)
