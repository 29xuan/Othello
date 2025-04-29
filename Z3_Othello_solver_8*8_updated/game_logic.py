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
        self.last_move = None  # Record the last move position
        self.last_player = None  # Record the last player who made the move
        self.last_ai_move = None

    def get_board(self):
        """ Return the board status, including the number of chess pieces """
        black_count, white_count = self.get_piece_count()
        winner = self.check_winner()  # winner

        return {
            "board": self.board.tolist(),
            "current_player": int(self.current_player),  # Convert to Python int
            "black_count": int(black_count),  # Convert to Python int
            "white_count": int(white_count),  # Convert to Python int
            "winner": winner  # Add winner information
        }

    def is_valid_move(self, row, col):
        """ Check whether the current location can be dropped """
        if self.board[row, col] != EMPTY:
            return False

        for dr, dc in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
            if self._can_flip(row, col, dr, dc):
                return True
        return False

    def _can_flip(self, row, col, dr, dc):
        """ Check if the piece can be flipped in a given direction """
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
        """ Perform a drop operation and flip the pieces """
        if not self.is_valid_move(row, col):
            return False

        self.board[row, col] = self.current_player
        self.last_flipped_discs = []
        self.last_move = (row, col)  # Record the last move position
        self.last_player = "black" if self.current_player == BLACK else "white"  # Record the player who made the move
        self.last_ai_move = (row, col) if self.current_player == WHITE else None

        for dr, dc in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
            self._flip_disks(row, col, dr, dc)

        self.current_player = -self.current_player

        if is_ai:
            time.sleep(1)  # After AI makes a move, wait for 1 second to flip

        return True

    def _flip_disks(self, row, col, dr, dc):
        """ Perform the operation of flipping the pieces """
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
        """ Return the list of recently flipped pieces """
        return self.last_flipped_discs

    def has_valid_moves(self):
        """ Check whether the current player has valid landing points """
        return any(self.is_valid_move(row, col) for row in range(8) for col in range(8))

    def get_valid_moves(self):
        """ Get all legal landing points for current players """
        return [(r, c) for r in range(8) for c in range(8) if self.is_valid_move(r, c)]

    def ai_move(self):
        """ AI automatic chess """
        valid_moves = self.get_valid_moves()
        if valid_moves:
            self.last_ai_move = valid_moves[0]  # Select the first legal location (to improve AI strategy)
            self.make_move(*self.last_ai_move, is_ai=True)
            return self.last_ai_move, self.get_last_flipped_discs()
        return None, []

    def get_piece_count(self):
        """ Calculate the number of black and white pieces on the board """
        black_count = np.sum(self.board == BLACK)
        white_count = np.sum(self.board == WHITE)
        return black_count, white_count

    def check_winner(self):
        """ Check if the game is over and return the winner information """
        if not self.has_valid_moves():  # Current player has no legal movement
            # Check if the opponent also has no valid moves
            original_player = self.current_player
            self.current_player = -self.current_player  # Switch to opponent
            opponent_has_moves = self.has_valid_moves()
            self.current_player = original_player  # Switch back
            
            # If the opponent also has no valid moves, or the board is full, the game ends
            if not opponent_has_moves or np.sum(self.board != EMPTY) == 64:
                black_count, white_count = self.get_piece_count()
                if black_count > white_count:
                    return "Black"
                elif white_count > black_count:
                    return "White"
                else:
                    return "Draw"
        return None  # Not finish yet

    def get_last_move_info(self):
        """ Return the last move and flipped information """
        return {
            "last_move": self.last_move,
            "flipped_discs": self.last_flipped_discs,
            "last_player": self.last_player
        }

    def copy(self):
        """ Create a deep copy of the game object """
        game_copy = Othello()
        game_copy.board = np.copy(self.board)
        game_copy.current_player = self.current_player
        game_copy.last_flipped_discs = self.last_flipped_discs.copy() if self.last_flipped_discs else []
        game_copy.last_move = self.last_move
        game_copy.last_player = self.last_player
        game_copy.last_ai_move = self.last_ai_move
        return game_copy


