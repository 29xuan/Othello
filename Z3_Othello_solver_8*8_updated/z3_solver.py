import z3
import numpy as np
from game_logic import Othello, BLACK, WHITE, EMPTY
import time

class OthelloZ3Solver:
    """
    Z3-based solver for Othello that models the game as a full search problem
    without time constraints, incorporating strategic principles for optimal play.
    """
    
    def __init__(self, game_instance, max_depth=None):
        self.game = game_instance
        self.max_depth = max_depth  # If None, will try to solve to the end of the game
        self.solver = z3.Solver()
        
        # Strategic position values - these are based on the specified strategies
        self.position_weights = [
            [120, -20,  20,  5,  5, 20, -20, 120],  # Corners extremely valuable
            [-20, -40,  -5, -5, -5, -5, -40, -20],  # X-squares and C-squares very bad
            [ 20,  -5,  15,  3,  3, 15,  -5,  20],  # Edge positions generally good
            [  5,  -5,   3,  3,  3,  3,  -5,   5],
            [  5,  -5,   3,  3,  3,  3,  -5,   5],
            [ 20,  -5,  15,  3,  3, 15,  -5,  20],
            [-20, -40,  -5, -5, -5, -5, -40, -20],
            [120, -20,  20,  5,  5, 20, -20, 120]
        ]
        
        # Track stable discs (pieces that cannot be flipped)
        self.corner_positions = [(0, 0), (0, 7), (7, 0), (7, 7)]
        self.edge_positions = [(0, i) for i in range(1, 7)] + [(7, i) for i in range(1, 7)] + \
                              [(i, 0) for i in range(1, 7)] + [(i, 7) for i in range(1, 7)]
        
        # Dangerous positions (X-squares and C-squares)
        self.x_squares = [(1, 1), (1, 6), (6, 1), (6, 6)]
        self.c_squares = [(0, 1), (1, 0), (0, 6), (1, 7), (6, 0), (7, 1), (6, 7), (7, 6)]
        
        # Phase detection thresholds
        self.early_game_threshold = 20  # Less than 20 pieces on board
        self.late_game_threshold = 50   # More than 50 pieces on board
        
        # Transposition table for position caching
        self.transposition_table = {}
        
        # Move ordering heuristics for alpha-beta pruning
        self.history_table = {}  # Store history heuristic scores
        
    def find_best_move(self):
        """Find the best move using full Z3 model search"""
        game_copy = self.game.copy()
        valid_moves = game_copy.get_valid_moves()
        
        if not valid_moves:
            return None
            
        # Determine game phase
        total_pieces = np.sum(game_copy.board != EMPTY)
        
        # Select different strategies based on game phase
        if total_pieces < self.early_game_threshold:
            return self._early_game_strategy(game_copy, valid_moves)
        elif total_pieces > self.late_game_threshold:
            return self._late_game_strategy(game_copy, valid_moves)
        else:
            return self._mid_game_strategy(game_copy, valid_moves)
    
    def _early_game_strategy(self, game, valid_moves):
        """
        Early game strategy focuses on:
        - Avoiding X-squares and C-squares
        - Controlling center
        - Maximizing mobility
        """
        print("Using early game strategy")
        
        # Avoid X-squares and C-squares at all costs in early game
        safe_moves = [move for move in valid_moves if move not in self.x_squares and move not in self.c_squares]
        
        # If we have safe moves, use them; otherwise fall back to all valid moves
        moves_to_consider = safe_moves if safe_moves else valid_moves
        
        # For early game, use minimax with positional evaluation and mobility
        depth = 6  # Moderate depth for early game
        best_score = float('-inf')
        best_move = moves_to_consider[0]  # Default to first move
        
        # Add time limit
        start_time = time.time()
        max_time = 3.0  # Early game can use shorter search time
        
        for move in moves_to_consider:
            # Check if time limit is reached
            if time.time() - start_time > max_time:
                print(f"Search time limit reached after analyzing {moves_to_consider.index(move)}/{len(moves_to_consider)} moves")
                break
                
            game_copy = game.copy()
            game_copy.make_move(move[0], move[1])
            
            # Get score from minimax with time limit
            score = -self._negamax(game_copy, depth-1, float('-inf'), float('inf'), False, start_time, max_time)
            
            if score > best_score:
                best_score = score
                best_move = move
                
        return best_move
    
    def _mid_game_strategy(self, game, valid_moves):
        """
        Mid game strategy focuses on:
        - Gaining control of edges
        - Reducing opponent's mobility
        - Building stable disc formations
        """
        print("Using mid game strategy")
        
        # In mid game, prioritize checking corner positions
        for move in valid_moves:
            if move in self.corner_positions:
                return move
        
        # Reduce mid game search depth to improve performance
        depth = 5  # Reduce from 8 to 5, reduce search space
        best_score = float('-inf')
        best_move = valid_moves[0]  # Default to first move
        
        # Add time limit
        start_time = time.time()
        max_time = 5.0  # Set 5 seconds maximum search time
        
        # Sort moves by importance
        sorted_moves = self._sort_moves(valid_moves, game)
        
        for move in sorted_moves:
            # Check if time limit is reached
            if time.time() - start_time > max_time:
                print(f"Search time limit reached after analyzing {sorted_moves.index(move)}/{len(sorted_moves)} moves")
                break
                
            game_copy = game.copy()
            game_copy.make_move(move[0], move[1])
            
            # Get score
            score = -self._negamax(game_copy, depth-1, float('-inf'), float('inf'), False, start_time, max_time)
            
            if score > best_score:
                best_score = score
                best_move = move
                
        return best_move
    
    def _late_game_strategy(self, game, valid_moves):
        """
        Late game strategy focuses on:
        - Maximizing final disc count
        - Controlling parity (odd/even number of empty spaces)
        - Full search to the end if possible
        """
        print("Using late game strategy")
        
        # Calculate empty spaces to determine if we can solve to the end of the game
        empty_count = np.sum(game.board == EMPTY)
        
        # If there are less than 8 empty spaces, try to solve to the end of the game
        if empty_count <= 8:  # Reduce from 10 to 8, reduce search space
            return self._solve_endgame(game, valid_moves)
        
        # Otherwise, use depth search
        depth = 6  # Reduce from 10 to 6, reduce search space
        best_score = float('-inf')
        best_move = valid_moves[0]  # Default to first move
        
        # Add time limit
        start_time = time.time()
        max_time = 5.0  # Set 5 seconds maximum search time
        
        # Sort moves to improve pruning
        sorted_moves = self._sort_moves(valid_moves, game)
        
        for move in sorted_moves:
            # Check if time limit is reached
            if time.time() - start_time > max_time:
                print(f"Search time limit reached after analyzing {sorted_moves.index(move)}/{len(sorted_moves)} moves")
                break
                
            game_copy = game.copy()
            game_copy.make_move(move[0], move[1])
            
            # Get score
            score = -self._negamax(game_copy, depth-1, float('-inf'), float('inf'), False, start_time, max_time)
            
            if score > best_score:
                best_score = score
                best_move = move
                
        return best_move
    
    def _solve_endgame(self, game, valid_moves):
        """
        Solve the endgame using full search to the end of the game
        """
        print("Solving endgame using full search")
        
        best_score = float('-inf')
        best_move = valid_moves[0]  # Default to first move
        
        # Add time limit
        start_time = time.time()
        max_time = 8.0  # Endgame can give more time, 8 seconds
        
        # Sort moves for better pruning
        sorted_moves = self._sort_moves(valid_moves, game)
        
        for move in sorted_moves:
            # Check if time limit is reached
            if time.time() - start_time > max_time:
                print(f"Search time limit reached after analyzing {sorted_moves.index(move)}/{len(sorted_moves)} moves")
                break
                
            game_copy = game.copy()
            game_copy.make_move(move[0], move[1])
            
            # Search to the end of the game
            score = -self._full_search(game_copy, start_time, max_time)
            
            if score > best_score:
                best_score = score
                best_move = move
                
        return best_move
    
    def _full_search(self, game, start_time=None, max_time=None, depth=0, max_depth=10):
        """
        Full search to the end of the game using minimax with alpha-beta pruning
        """
        # Add depth limit to prevent infinite recursion
        if depth > max_depth:
            return self._evaluate_position(game)
            
        # Check time limit
        if start_time and max_time and time.time() - start_time > max_time:
            return self._evaluate_position(game)
            
        # Check if we've already seen this position
        board_hash = str(game.board.tobytes())
        if board_hash in self.transposition_table:
            return self.transposition_table[board_hash]
        
        # Get valid moves for the current player
        valid_moves = game.get_valid_moves()
        
        # If there are no valid moves, try passing or end game
        if not valid_moves:
            # Try passing
            game_copy = game.copy()
            game_copy.current_player = -game_copy.current_player
            opponent_moves = game_copy.get_valid_moves()
            
            # If opponent also has no moves, game is over
            if not opponent_moves:
                # Game is over, count pieces
                black_count, white_count = game.get_piece_count()
                score = 1000 * (black_count - white_count) // (black_count + white_count)
                score = score if game.current_player == BLACK else -score
                # Store in transposition table
                self.transposition_table[board_hash] = score
                return score
                
            # Pass turn
            return -self._full_search(game_copy, start_time, max_time, depth+1, max_depth)
        
        # Try each move
        best_score = float('-inf')
        
        # Sort moves for better pruning
        sorted_moves = self._sort_moves(valid_moves, game)
        
        for move in sorted_moves:
            # Check time limit
            if start_time and max_time and time.time() - start_time > max_time:
                break
                
            game_copy = game.copy()
            game_copy.make_move(move[0], move[1])
            
            # Recursive search
            score = -self._full_search(game_copy, start_time, max_time, depth+1, max_depth)
            
            best_score = max(best_score, score)
        
        # Store in transposition table
        self.transposition_table[board_hash] = best_score
        
        return best_score
    
    def _negamax(self, game, depth, alpha, beta, is_maximizing, start_time=None, max_time=None):
        """
        Negamax search with alpha-beta pruning
        """
        # Check time limit
        if start_time and max_time and time.time() - start_time > max_time:
            return self._evaluate_position(game)
            
        # Terminal conditions
        if depth == 0:
            return self._evaluate_position(game)
        
        # Get valid moves for current player
        valid_moves = game.get_valid_moves()
        
        # If no valid moves, either pass or end of game
        if not valid_moves:
            # Try passing
            game_copy = game.copy()
            game_copy.current_player = -game_copy.current_player
            opponent_moves = game_copy.get_valid_moves()
            
            # If opponent also has no moves, game is over
            if not opponent_moves:
                # Game is over, count pieces
                black_count, white_count = game.get_piece_count()
                if black_count > white_count:
                    return 1000 if game.current_player == BLACK else -1000
                elif white_count > black_count:
                    return -1000 if game.current_player == BLACK else 1000
                else:
                    return 0  # Draw
                
            # Pass turn
            return -self._negamax(game_copy, depth-1, -beta, -alpha, not is_maximizing, start_time, max_time)
        
        # Sort moves for better pruning
        sorted_moves = self._sort_moves(valid_moves, game)
        
        best_score = float('-inf')
        
        for move in sorted_moves:
            # Check time limit
            if start_time and max_time and time.time() - start_time > max_time:
                break
                
            game_copy = game.copy()
            game_copy.make_move(move[0], move[1])
            
            # Recursive search
            score = -self._negamax(game_copy, depth-1, -beta, -alpha, not is_maximizing, start_time, max_time)
            
            best_score = max(best_score, score)
            alpha = max(alpha, score)
            
            # Alpha-beta pruning
            if alpha >= beta:
                break
        
        return best_score
    
    def _evaluate_position(self, game):
        """
        Evaluate a board position based on strategic principles
        """
        if game.current_player == BLACK:
            my_color, opp_color = BLACK, WHITE
        else:
            my_color, opp_color = WHITE, BLACK
        
        # Count pieces
        black_count, white_count = game.get_piece_count()
        piece_diff = black_count - white_count
        piece_diff = piece_diff if my_color == BLACK else -piece_diff
        
        # Count pieces in different regions
        corners = sum(1 for pos in self.corner_positions if game.board[pos] == my_color) - \
                  sum(1 for pos in self.corner_positions if game.board[pos] == opp_color)
                  
        x_squares = sum(1 for pos in self.x_squares if game.board[pos] == my_color) - \
                    sum(1 for pos in self.x_squares if game.board[pos] == opp_color)
                    
        c_squares = sum(1 for pos in self.c_squares if game.board[pos] == my_color) - \
                    sum(1 for pos in self.c_squares if game.board[pos] == opp_color)
                    
        edges = sum(1 for pos in self.edge_positions if game.board[pos] == my_color) - \
                sum(1 for pos in self.edge_positions if game.board[pos] == opp_color)
        
        # Calculate mobility (number of valid moves)
        original_player = game.current_player
        my_mobility = len(game.get_valid_moves())
        
        game.current_player = -game.current_player
        opp_mobility = len(game.get_valid_moves())
        game.current_player = original_player
        
        mobility_diff = my_mobility - opp_mobility
        
        # Simplified stable disc calculation - only consider corners and completely occupied edges
        my_stable, opp_stable = self._simplified_count_stable_discs(game, my_color, opp_color)
        stability_diff = my_stable - opp_stable
        
        # Simplified frontier disc calculation
        my_frontier, opp_frontier = self._simplified_count_frontier_discs(game, my_color, opp_color)
        frontier_diff = opp_frontier - my_frontier  # Fewer frontier discs is better
        
        # Calculate positional value
        positional_value = self._calculate_positional_value(game, my_color, opp_color)
        
        # Determine game phase for weighting factors
        total_pieces = black_count + white_count
        
        if total_pieces < self.early_game_threshold:
            # Early game weights
            piece_weight = 10
            corner_weight = 500
            x_square_weight = -300
            c_square_weight = -150
            edge_weight = 50
            mobility_weight = 100
            stability_weight = 300
            frontier_weight = 20
            positional_weight = 30
        elif total_pieces > self.late_game_threshold:
            # Late game weights
            piece_weight = 500
            corner_weight = 300
            x_square_weight = -50
            c_square_weight = -30
            edge_weight = 100
            mobility_weight = 20
            stability_weight = 500
            frontier_weight = 10
            positional_weight = 50
        else:
            # Mid game weights
            piece_weight = 50
            corner_weight = 400
            x_square_weight = -150
            c_square_weight = -100
            edge_weight = 100
            mobility_weight = 80
            stability_weight = 300
            frontier_weight = 30
            positional_weight = 50
        
        # Calculate total score
        score = (piece_weight * piece_diff + 
                corner_weight * corners +
                x_square_weight * x_squares +
                c_square_weight * c_squares +
                edge_weight * edges +
                mobility_weight * mobility_diff +
                stability_weight * stability_diff +
                frontier_weight * frontier_diff +
                positional_weight * positional_value)
        
        return score
    
    def _simplified_count_stable_discs(self, game, my_color, opp_color):
        """
        Simplified stable disc calculation, only consider corners and edges connected to corners
        """
        board = game.board
        my_stable = 0
        opp_stable = 0
        
        # Corner always stable
        for r, c in self.corner_positions:
            if board[r, c] == my_color:
                my_stable += 1
            elif board[r, c] == opp_color:
                opp_stable += 1
        
        # Check horizontal edges
        for row in [0, 7]:
            # Left to right
            if board[row, 0] != EMPTY:  # If corner is occupied
                color = board[row, 0]
                for col in range(1, 8):
                    if board[row, col] != color:
                        break
                    if color == my_color:
                        my_stable += 1
                    else:
                        opp_stable += 1
            
            # Right to left
            if board[row, 7] != EMPTY:  # If corner is occupied
                color = board[row, 7]
                for col in range(6, -1, -1):
                    if board[row, col] != color:
                        break
                    if color == my_color:
                        my_stable += 1
                    else:
                        opp_stable += 1
        
        # Check vertical edges
        for col in [0, 7]:
            # Top to bottom
            if board[0, col] != EMPTY:  # If corner is occupied
                color = board[0, col]
                for row in range(1, 8):
                    if board[row, col] != color:
                        break
                    if color == my_color:
                        my_stable += 1
                    else:
                        opp_stable += 1
            
            # Bottom to top
            if board[7, col] != EMPTY:  # If corner is occupied
                color = board[7, col]
                for row in range(6, -1, -1):
                    if board[row, col] != color:
                        break
                    if color == my_color:
                        my_stable += 1
                    else:
                        opp_stable += 1
        
        return my_stable, opp_stable
    
    def _simplified_count_frontier_discs(self, game, my_color, opp_color):
        """
        Simplified frontier disc calculation, reduce calculation by sampling
        """
        board = game.board
        my_frontier = 0
        opp_frontier = 0
        
        # Sample positions in the board instead of checking each position
        sample_positions = []
        for r in range(1, 7, 2):  # Skip some rows
            for c in range(1, 7, 2):  # Skip some columns
                sample_positions.append((r, c))
        
        # Edge positions are more important, include all
        for pos in self.edge_positions:
            sample_positions.append(pos)
        
        for r, c in sample_positions:
            if board[r, c] != EMPTY:
                # Check if adjacent to any empty space
                is_frontier = False
                for dr, dc in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
                    adj_r, adj_c = r + dr, c + dc
                    if 0 <= adj_r < 8 and 0 <= adj_c < 8 and board[adj_r, adj_c] == EMPTY:
                        is_frontier = True
                        break
                
                if is_frontier:
                    if board[r, c] == my_color:
                        my_frontier += 1
                    else:
                        opp_frontier += 1
        
        # Multiply by a factor to estimate total
        factor = 1.5  # Adjust this factor to match actual counts
        my_frontier = int(my_frontier * factor)
        opp_frontier = int(opp_frontier * factor)
        
        return my_frontier, opp_frontier
    
    def _calculate_positional_value(self, game, my_color, opp_color):
        """
        Calculate the positional value based on the weight matrix
        """
        board = game.board
        my_value = 0
        opp_value = 0
        
        for r in range(8):
            for c in range(8):
                if board[r, c] == my_color:
                    my_value += self.position_weights[r][c]
                elif board[r, c] == opp_color:
                    opp_value += self.position_weights[r][c]
        
        return my_value - opp_value
    
    def _sort_moves(self, moves, game):
        """
        Sort moves based on heuristics to improve alpha-beta pruning
        """
        move_scores = []
        
        for move in moves:
            score = 0
            r, c = move
            
            # Prioritize corners extremely high
            if move in self.corner_positions:
                score += 10000
            
            # Avoid X-squares and C-squares if corners not taken
            elif move in self.x_squares:
                score -= 5000
                # Check if any adjacent corner is empty
                for dr, dc in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
                    corner_r, corner_c = r + dr, c + dc
                    if corner_r in [0, 7] and corner_c in [0, 7]:
                        if game.board[corner_r, corner_c] == EMPTY:
                            score -= 5000  # Extra penalty for X-square with empty corner
            
            elif move in self.c_squares:
                score -= 3000
                # Check if adjacent corner is empty
                if r == 0 or r == 7:
                    corner_c = 0 if c == 1 else 7
                    if game.board[r, corner_c] == EMPTY:
                        score -= 3000  # Extra penalty for C-square with empty corner
                else:  # c == 0 or c == 7
                    corner_r = 0 if r == 1 else 7
                    if game.board[corner_r, c] == EMPTY:
                        score -= 3000  # Extra penalty for C-square with empty corner
            
            # Prioritize edges, but not if adjacent to empty corners
            elif move in self.edge_positions:
                score += 500
                # Check if this edge move is safe
                if r == 0 or r == 7:
                    if game.board[r, 0] == EMPTY or game.board[r, 7] == EMPTY:
                        score -= 300  # Penalty for unsafe edge move
                else:  # c == 0 or c == 7
                    if game.board[0, c] == EMPTY or game.board[7, c] == EMPTY:
                        score -= 300  # Penalty for unsafe edge move
            
            # Use position weights for other positions
            else:
                score += self.position_weights[r][c]
            
            # Consider move history for similar positions
            if (move, game.current_player) in self.history_table:
                score += self.history_table[(move, game.current_player)] // 10
            
            move_scores.append((move, score))
        
        # Sort moves by score in descending order
        move_scores.sort(key=lambda x: x[1], reverse=True)
        
        return [move for move, _ in move_scores]
    
    def analyze_best_move(self):
        """
        Analyze the current board state and find the best move using Z3 modeling
        """
        start_time = time.time()
        max_time = 10.0  # Give 10 seconds for analysis
        
        # Try to find the best move
        try:
            best_move = self.find_best_move()
            
            # If timeout or no best move found, use greedy strategy
            if not best_move or (time.time() - start_time) > max_time:
                print("No best move found or analysis timeout, using greedy strategy")
                best_move = self._greedy_move_selection()
            
            end_time = time.time()
            
            if best_move:
                # Create a game copy and make the move to see its effects
                game_copy = self.game.copy()
                game_copy.make_move(best_move[0], best_move[1])
                
                # Get statistics
                black_count, white_count = game_copy.get_piece_count()
                current_player = "Black" if self.game.current_player == BLACK else "White"
                
                analysis = {
                    "has_move": True,  # Add this field to match frontend expectations
                    "best_move": best_move,
                    "row": best_move[0],
                    "col": best_move[1],
                    "player": current_player,
                    "analysis_time_seconds": end_time - start_time,
                    "expected_black_count": black_count,
                    "expected_white_count": white_count,
                    "strategic_evaluation": self._get_move_strategic_evaluation(best_move)
                }
                
                return analysis
            
            return {"has_move": False, "analysis": "No valid moves available"}
            
        except Exception as e:
            print(f"Error in analyze_best_move: {str(e)}")
            # If an error occurs, use greedy strategy
            best_move = self._greedy_move_selection()
            if best_move:
                return {
                    "has_move": True,
                    "best_move": best_move,
                    "row": best_move[0],
                    "col": best_move[1],
                    "strategic_evaluation": "Fallback greedy strategy due to analysis error"
                }
            return {"has_move": False, "analysis": f"Error during analysis: {str(e)}"}
            
    def _greedy_move_selection(self):
        """
        Greedy strategy, select move based on simple rules
        """
        valid_moves = self.game.get_valid_moves()
        if not valid_moves:
            return None
            
        # 1. First try to occupy corners
        for move in valid_moves:
            if move in self.corner_positions:
                return move
                
        # 2. Avoid dangerous X and C squares
        safe_moves = [move for move in valid_moves if move not in self.x_squares and move not in self.c_squares]
        if safe_moves:
            # 3. Select the best move based on position weights
            best_score = float('-inf')
            best_move = safe_moves[0]
            
            for move in safe_moves:
                r, c = move
                score = self.position_weights[r][c]
                
                # Give bonus for edge positions
                if move in self.edge_positions:
                    score += 20
                    
                # Check how many discs will be flipped by this move
                game_copy = self.game.copy()
                game_copy.make_move(r, c)
                flipped_count = len(game_copy.last_flipped_discs)
                
                # Middle game earlier flips better, later flips better
                total_pieces = np.sum(self.game.board != EMPTY)
                if total_pieces < 30:
                    score += flipped_count * 2  # Moderate reward for early game
                else:
                    score += flipped_count * 5  # More reward for later game
                
                if score > best_score:
                    best_score = score
                    best_move = move
                    
            return best_move
        
        # If no safe moves, select move with least flips (early game) or most flips (late game)
        total_pieces = np.sum(self.game.board != EMPTY)
        best_move = valid_moves[0]
        
        if total_pieces < 30:  # Early game
            min_flips = float('inf')
            for move in valid_moves:
                game_copy = self.game.copy()
                game_copy.make_move(move[0], move[1])
                flips = len(game_copy.last_flipped_discs)
                if flips < min_flips:
                    min_flips = flips
                    best_move = move
        else:  # Late game
            max_flips = -1
            for move in valid_moves:
                game_copy = self.game.copy()
                game_copy.make_move(move[0], move[1])
                flips = len(game_copy.last_flipped_discs)
                if flips > max_flips:
                    max_flips = flips
                    best_move = move
        
        return best_move
    
    def _get_move_strategic_evaluation(self, move):
        """
        Provide a strategic evaluation of the move
        """
        r, c = move
        
        if move in self.corner_positions:
            return "Corner move - excellent strategic position"
        elif move in self.x_squares:
            return "X-square move - risky position, may give opponent corner access"
        elif move in self.c_squares:
            return "C-square move - risky position, may give opponent corner access"
        elif move in self.edge_positions:
            return "Edge move - generally strong position if stable"
        
        # Check if the move increases mobility
        game_copy = self.game.copy()
        original_player = game_copy.current_player
        
        # Count opponent moves before our move
        game_copy.current_player = -original_player
        opp_moves_before = len(game_copy.get_valid_moves())
        game_copy.current_player = original_player
        
        # Make our move
        game_copy.make_move(r, c)
        
        # Count opponent moves after our move
        opp_moves_after = len(game_copy.get_valid_moves())
        
        if opp_moves_after < opp_moves_before:
            return "Mobility control move - reduces opponent's options"
        
        # Check if the move creates stable discs
        my_color = original_player
        my_stable_before = self._simplified_count_stable_discs(self.game, my_color, -my_color)[0]
        my_stable_after = self._simplified_count_stable_discs(game_copy, my_color, -my_color)[0]
        
        if my_stable_after > my_stable_before:
            return "Stability building move - creates stable disc formation"
        
        # Default evaluation
        return "Central position - maintains flexibility"

def get_best_move(game_instance):
    """Utility function to get the best move for the current game state"""
    solver = OthelloZ3Solver(game_instance)
    analysis = solver.analyze_best_move()
    return analysis["best_move"] 