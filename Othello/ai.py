import random
from game_logic import Othello

def get_ai_move(game):
    """ 选择一个合法的 AI 落子 """
    valid_moves = [(r, c) for r in range(8) for c in range(8) if game.is_valid_move(r, c)]
    return random.choice(valid_moves) if valid_moves else None

