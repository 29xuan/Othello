import numpy as np

EMPTY = 0
BLACK = 1
WHITE = -1

class Othello:
    def __init__(self):
        self.board = np.zeros((8, 8), dtype=int)
        self.board[3, 3], self.board[4, 4] = WHITE, WHITE
        self.board[3, 4], self.board[4, 3] = BLACK, BLACK
        self.current_player = BLACK

    def is_valid_move(self, row, col):
        if self.board[row, col] != EMPTY:
            return False

        for dr, dc in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
            if self._can_flip(row, col, dr, dc):
                return True
        return False

    def _can_flip(self, row, col, dr, dc):
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

    def make_move(self, row, col):
        if not self.is_valid_move(row, col):
            return False

        self.board[row, col] = self.current_player
        for dr, dc in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
            self._flip_disks(row, col, dr, dc)

        self.current_player = -self.current_player
        return True

    def _flip_disks(self, row, col, dr, dc):
        opponent = -self.current_player
        r, c = row + dr, col + dc
        to_flip = []
        while 0 <= r < 8 and 0 <= c < 8:
            if self.board[r, c] == opponent:
                to_flip.append((r, c))
            elif self.board[r, c] == self.current_player:
                for flip_r, flip_c in to_flip:
                    self.board[flip_r, flip_c] = self.current_player
                return
            else:
                return
            r, c = r + dr, c + dc

    def has_valid_moves(self):
        return any(self.is_valid_move(row, col) for row in range(8) for col in range(8))

    def get_winner(self):
        black_count = np.sum(self.board == BLACK)
        white_count = np.sum(self.board == WHITE)
        if black_count > white_count:
            return "Black Wins"
        elif white_count > black_count:
            return "White Wins"
        else:
            return "Draw"

    def get_board(self):
        return self.board.tolist()
