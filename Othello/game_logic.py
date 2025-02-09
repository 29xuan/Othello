import numpy as np
import time

EMPTY = 0
BLACK = 1
WHITE = -1

class Othello:
    def __init__(self):
        self.board = np.zeros((8, 8), dtype=int)
        self.board[3, 3], self.board[4, 4] = WHITE, WHITE
        self.board[3, 4], self.board[4, 3] = BLACK, BLACK
        self.current_player = BLACK
        self.last_flipped_discs = []
        self.last_ai_move = None

    def get_board(self):
        """ 返回棋盘状态，包括棋子数量 """
        black_count, white_count = self.get_piece_count()
        winner = self.check_winner()  # 获取赢家

        return {
            "board": self.board.tolist(),
            "current_player": int(self.current_player),  # 转换为 Python int
            "black_count": int(black_count),  # 转换为 Python int
            "white_count": int(white_count),  # 转换为 Python int
            "winner": winner  # 添加赢家信息
        }

    def is_valid_move(self, row, col):
        """ 检查当前位置是否可以落子 """
        if self.board[row, col] != EMPTY:
            return False

        for dr, dc in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
            if self._can_flip(row, col, dr, dc):
                return True
        return False

    def _can_flip(self, row, col, dr, dc):
        """ 检查在给定方向上是否可以翻转棋子 """
        opponent = -self.current_player
        r, c = row + dr, col + dc
        has_opponent = False

        while 0 <= r < 8 and 0 <= c < 8:
            if self.board[r, c] == opponent:
                has_opponent = True
            elif self.board[r, c] == self.current_player and has_opponent:
                return True
            else:
                return False
            r, c = r + dr, c + dc
        return False

    def make_move(self, row, col, is_ai=False):
        """ 执行落子操作并翻转棋子 """
        if not self.is_valid_move(row, col):
            return False

        self.board[row, col] = self.current_player
        self.last_flipped_discs = []
        self.last_ai_move = (row, col) if self.current_player == WHITE else None

        for dr, dc in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
            self._flip_disks(row, col, dr, dc)

        self.current_player = -self.current_player

        if is_ai:
            time.sleep(1)  # AI 落子后，再等待 1 秒翻转

        return True

    def _flip_disks(self, row, col, dr, dc):
        """ 执行翻转棋子的操作 """
        opponent = -self.current_player
        r, c = row + dr, col + dc
        to_flip = []

        while 0 <= r < 8 and 0 <= c < 8:
            if self.board[r, c] == opponent:
                to_flip.append((r, c))
            elif self.board[r, c] == self.current_player:
                for flip_r, flip_c in to_flip:
                    self.board[flip_r, flip_c] = self.current_player
                    self.last_flipped_discs.append((flip_r, flip_c))
                return
            else:
                return
            r, c = r + dr, c + dc

    def get_last_flipped_discs(self):
        """ 返回最近翻转的棋子列表 """
        return self.last_flipped_discs

    def has_valid_moves(self):
        """ 检查当前玩家是否还有有效的落子点 """
        return any(self.is_valid_move(row, col) for row in range(8) for col in range(8))

    def get_valid_moves(self):
        """ 获取当前玩家所有合法的落子点 """
        return [(r, c) for r in range(8) for c in range(8) if self.is_valid_move(r, c)]

    def ai_move(self):
        """ AI 自动下棋 """
        valid_moves = self.get_valid_moves()
        if valid_moves:
            self.last_ai_move = valid_moves[0]  # 选择第一个合法位置（可改进AI策略）
            self.make_move(*self.last_ai_move, is_ai=True)
            return self.last_ai_move, self.get_last_flipped_discs()
        return None, []

    def get_piece_count(self):
        """ 计算棋盘上黑白棋子的数量 """
        black_count = np.sum(self.board == BLACK)
        white_count = np.sum(self.board == WHITE)
        return black_count, white_count

    def check_winner(self):
        """ 检查游戏是否结束，并返回赢家信息 """
        if not self.has_valid_moves():  # 没有合法移动，游戏结束
            black_count, white_count = self.get_piece_count()
            if black_count > white_count:
                return "Black"
            elif white_count > black_count:
                return "White"
            else:
                return "Draw"
        return None  # 还没结束


