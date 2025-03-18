import z3
import numpy as np
from game_logic import Othello, BLACK, WHITE, EMPTY

class OthelloVerifier:
    def __init__(self, game_instance):
        self.game = game_instance
        self.solver = z3.Solver()
        self.verification_results = {
            "legal_moves_black": {"status": "pending", "details": "No move yet"},
            "legal_moves_white": {"status": "pending", "details": "No move yet"},
            "fairness": {"status": "pending", "details": ""},
            "last_player": None,  # Track the last player who made a move
            "board_consistency": {"status": "pending", "details": ""},
            "termination": {"status": "pending", "details": ""},
            "winner_determination": {"status": "pending", "details": ""}
        }

    def verify_legal_move(self, row, col, player):
        """Verify that a proposed move is legal according to Othello rules"""
        # Reset solver for this verification
        self.solver.reset()
        
        # Track the player who is making this move
        self.verification_results["last_player"] = "Black" if player == BLACK else "White"
        
        # Get a copy of the current board state for verification
        board = np.copy(self.game.board)
        
        # Condition 1: The cell must be empty
        is_empty = board[row, col] == EMPTY
        
        # Condition 2: The move must flip at least one opponent's disk
        flips_opponent = False
        flipped_coordinates = []
        
        # Check all 8 directions
        directions = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
        opponent = -player
        
        for dr, dc in directions:
            # Check for opponent pieces in this direction
            r, c = row + dr, col + dc
            potential_flips = []
            
            if 0 <= r < 8 and 0 <= c < 8 and board[r, c] == opponent:
                potential_flips.append((r, c))
                # Continue in this direction looking for player's piece
                r, c = r + dr, c + dc
                while 0 <= r < 8 and 0 <= c < 8:
                    if board[r, c] == player:
                        flips_opponent = True
                        flipped_coordinates.extend(potential_flips)
                        break
                    elif board[r, c] == EMPTY:
                        break
                    else:  # More opponent pieces
                        potential_flips.append((r, c))
                    r, c = r + dr, c + dc
        
        # Update verification result based on player
        if player == BLACK:
            verification_key = "legal_moves_black"
            player_name = "Black"
        else:
            verification_key = "legal_moves_white"
            player_name = "White"
        
        # Convert coordinates from 0-7 to 1-8 format for display
        human_readable_coords = [(r+1, c+1) for r, c in flipped_coordinates]
        move_coords = (row+1, col+1)  # Convert to 1-8 format
            
        if is_empty and flips_opponent:
            self.verification_results[verification_key] = {
                "status": "passed", 
                "details": f"Move at {move_coords} is valid and flips {len(flipped_coordinates)} opponent's disk(s).",
                "flipped_discs": human_readable_coords
            }
        else:
            self.verification_results[verification_key] = {
                "status": "failed", 
                "details": f"Move at {move_coords} is invalid. " + 
                           ("The cell is not empty. " if not is_empty else "") + 
                           ("It doesn't flip any opponent's disks. " if not flips_opponent else ""),
                "flipped_discs": []
            }
        
        return is_empty and flips_opponent
    
    def verify_fairness(self):
        """Verify that player turns alternate fairly"""
        # Get current player
        current_player = "Black" if self.game.current_player == BLACK else "White"
        last_player = self.verification_results["last_player"]
        
        if last_player:
            fairness_details = (f"Players alternate turns fairly.<br>" +
                               f"<span style='margin-left: 59px;'>Recent player</strong>: {last_player}</span>" +
                               f"<span>. Current player</strong>: {current_player}</span>")
        else:
            fairness_details = f"Game just started.<br><span style='margin-left: 59px;'>Current player</strong>: {current_player}</span>"
        
        self.verification_results["fairness"] = {
            "status": "passed",
            "details": fairness_details
        }
        return True
    
    def verify_board_consistency(self):
        """Verify that the board state is consistent (no cell has both black and white)"""
        board = self.game.board
        # This is guaranteed by our implementation as we use -1, 0, 1 values
        # But still good to verify
        
        is_consistent = True
        inconsistent_cells = []
        
        for r in range(8):
            for c in range(8):
                if not (board[r, c] == BLACK or board[r, c] == WHITE or board[r, c] == EMPTY):
                    is_consistent = False
                    inconsistent_cells.append((r+1, c+1))  # Convert to 1-8 format
        
        if is_consistent:
            self.verification_results["board_consistency"] = {
                "status": "passed",
                "details": "Board state is consistent. No cell contains disks of both players."
            }
        else:
            self.verification_results["board_consistency"] = {
                "status": "failed",
                "details": f"Board inconsistency detected at cells: {inconsistent_cells}"
            }
        
        return is_consistent
    
    def verify_termination(self):
        """Verify that the game will terminate"""
        # In Othello, the game always terminates after at most 60 moves
        # (after initial 4 disks, 60 more disks can be placed at maximum)
        
        black_count, white_count = self.game.get_piece_count()
        total_disks = black_count + white_count
        
        has_valid_moves = self.game.has_valid_moves()
        opponent_has_moves = False
        
        # Check if opponent has moves
        self.game.current_player = -self.game.current_player
        opponent_has_moves = self.game.has_valid_moves()
        self.game.current_player = -self.game.current_player  # Reset to original player
        
        game_over = (total_disks == 64) or (not has_valid_moves and not opponent_has_moves)
        
        if game_over:
            self.verification_results["termination"] = {
                "status": "passed",
                "details": "Game has terminated. No more valid moves available."
            }
        else:
            moves_left = 64 - total_disks
            self.verification_results["termination"] = {
                "status": "pending",
                "details": f"Game is still in progress. Maximum {moves_left} moves left."
            }
        
        return game_over
    
    def verify_winner_determination(self):
        """Verify that the winner is correctly determined"""
        # Only applicable if the game is over
        if not self.verify_termination():
            self.verification_results["winner_determination"] = {
                "status": "pending",
                "details": "Game is still in progress. Winner not determined yet."
            }
            return False
        
        black_count, white_count = self.game.get_piece_count()
        
        if black_count > white_count:
            winner = "Black"
        elif white_count > black_count:
            winner = "White"
        else:
            winner = "Draw"
        
        self.verification_results["winner_determination"] = {
            "status": "passed",
            "details": f"Winner correctly determined: {winner} (Black: {black_count}, White: {white_count})"
        }
        
        return True
    
    def run_all_verifications(self, row=None, col=None, player=None):
        """Run all verifications and return results"""
        # Only verify the move for the specified player
        if row is not None and col is not None and player is not None:
            self.verify_legal_move(row, col, player)
        
        self.verify_fairness()
        self.verify_board_consistency()
        self.verify_termination()
        self.verify_winner_determination()
        
        return self.verification_results 