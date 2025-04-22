import numpy as np
import time

EMPTY = 0
BLACK = 1
WHITE = -1

class Othello:
    def __init__(self):
        self.board = np.zeros((4, 4), dtype=int)
        self.board[1, 1], self.board[2, 2] = WHITE, WHITE
        self.board[1, 2], self.board[2, 1] = BLACK, BLACK
        self.current_player = BLACK
        self.last_flipped_discs = []
        self.last_move = None  
        self.last_player = None  
        self.last_ai_move = None

    def get_board(self):
        """ Return the board status, including the number of chess pieces """
        black_count, white_count = self.get_piece_count()
        winner = self.check_winner() 

        return {
            "board": self.board.tolist(),
            "current_player": int(self.current_player),  
            "black_count": int(black_count), 
            "white_count": int(white_count), 
            "winner": winner 
        }

    def is_valid_move(self, row, col):
        """ Check whether the current location can be dropped """
        if row < 0 or row >= 4 or col < 0 or col >= 4:
            return False
            
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

        while 0 <= r < 4 and 0 <= c < 4:
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
        self.last_move = (row, col)  
        self.last_player = "black" if self.current_player == BLACK else "white" 
        self.last_ai_move = (row, col) if self.current_player == WHITE else None

        for dr, dc in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
            self._flip_disks(row, col, dr, dc)

        # Switch to the opponent
        self.current_player = -self.current_player

        # Check if the opponent has any valid moves
        if not self.has_valid_moves():
            # If opponent has no valid moves, switch back to the current player
            self.current_player = -self.current_player
            # If the current player also has no valid moves, the game ends
            # This will be caught by check_winner

        if is_ai:
            time.sleep(1) 

        return True

    def _flip_disks(self, row, col, dr, dc):
        """ Perform the operation of flipping the pieces """
        opponent = -self.current_player
        r, c = row + dr, col + dc
        to_flip = []

        while 0 <= r < 4 and 0 <= c < 4:
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
        return any(self.is_valid_move(row, col) for row in range(4) for col in range(4))

    def get_valid_moves(self):
        """ Get all legal landing points for current players """
        return [(r, c) for r in range(4) for c in range(4) if self.is_valid_move(r, c)]

    def ai_move(self):
        """ AI automatic chess """
        valid_moves = self.get_valid_moves()
        if valid_moves:
            self.last_ai_move = valid_moves[0] 
            self.make_move(*self.last_ai_move, is_ai=True)
            return self.last_ai_move, self.get_last_flipped_discs()
        else:
            # If AI has no valid moves, skip its turn by switching back to the human player
            self.current_player = -self.current_player
            # Record that the turn was skipped
            self.last_move = None
            self.last_flipped_discs = []
            self.last_player = "white" 
            return None, []

    def get_piece_count(self):
        """ Calculate the number of black and white pieces on the board """
        black_count = np.sum(self.board == BLACK)
        white_count = np.sum(self.board == WHITE)
        return black_count, white_count

    def check_winner(self):
        """ Check if the game is over and return the winner information """
        current_player_has_moves = self.has_valid_moves()

        if not current_player_has_moves:
            # Check if the opponent has moves
            self.current_player = -self.current_player
            opponent_has_moves = self.has_valid_moves()
            self.current_player = -self.current_player 

            # Game ends if current player has no moves and opponent has no moves
            # or if the board is full
            black_count, white_count = self.get_piece_count()
            total_disks = black_count + white_count
            
            if (not opponent_has_moves) or (total_disks == 16):
                if black_count > white_count:
                    return "Black"
                elif white_count > black_count:
                    return "White"
                else:
                    return "Draw"
        
        return None 

    def get_last_move_info(self):
        """ Return the last move and flipped information """
        return {
            "last_move": self.last_move,
            "flipped_discs": self.last_flipped_discs,
            "last_player": self.last_player
        }


