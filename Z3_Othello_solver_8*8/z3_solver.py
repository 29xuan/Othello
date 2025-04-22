import z3
import numpy as np
from game_logic import Othello, BLACK, WHITE, EMPTY

class OthelloZ3Solver:
    """Z3-based solver to find best moves for the Black player (human)"""
    
    def __init__(self, game_instance):
        self.game = game_instance
        self.solver = z3.Solver()
    
    def analyze_best_move(self):
        """Analyze the current board state and recommend the best move for BLACK player using Z3"""
        # Ensure the solver is in a clean state
        self.solver = z3.Solver()
        
        try:
            print("Starting Z3 analysis of best move...")
            valid_moves = self.game.get_valid_moves()
            
            if not valid_moves:
                print("No valid moves available for BLACK player")
                return {
                    "has_move": False,
                    "message": "No valid moves available for you at this moment."
                }
            
            # Analyze the current board state (keep existing analysis for explanation purposes)
            board_analysis = self._analyze_board_state()
            
            # Analyze the opponent's last move (keep existing analysis for explanation purposes)
            opponent_intent = self._analyze_opponent_last_move()
            
            # Apply Z3 constraint solving to evaluate moves
            move_scores = []
            
            # Determine the game stage for appropriate strategies
            game_stage = board_analysis["game_stage"]
            print(f"Current game stage: {game_stage} with {len(valid_moves)} valid moves")
            
            # For each valid move, evaluate using Z3 constraint solving
            for move in valid_moves:
                print(f"Evaluating move: {move} with Z3...")
                try:
                    score, explanation, is_heuristic, prob_percent = self._z3_evaluate_move(move, game_stage, valid_moves)
                    # Store the original explanation without heuristic marker
                    original_explanation = explanation
                    move_scores.append((move, score, original_explanation, is_heuristic, prob_percent))
                    print(f"Move {move} evaluated: score={score}")
                except Exception as e:
                    import traceback
                    print(f"Error evaluating move {move}: {str(e)}")
                    print(traceback.format_exc())
                    # Use a fallback evaluation for this move
                    score = -1000  # Very low score for error moves
                    explanation = f"Error evaluating this move: {str(e)}"
                    move_scores.append((move, score, explanation, True, 0))
            
            if not move_scores:
                print("No moves were successfully evaluated")
                return {
                    "has_move": False,
                    "message": "Could not evaluate any valid moves. Please try again."
                }
            
            # Sort by score (descending)
            move_scores.sort(key=lambda x: x[1], reverse=True)
            best_move = move_scores[0]
            
            # Format the result - convert numpy types to Python native types
            row, col = best_move[0]
            is_best_move_heuristic = best_move[3] if len(best_move) > 3 else False
            
            # Add heuristic marker ONLY to the best move explanation if it uses heuristic evaluation
            best_move_explanation = best_move[2]
            
            # Get win probability data
            win_probability = best_move[4] if len(best_move) > 4 else 50  # Default 50%
            
            result = {
                "has_move": True,
                "best_move": (int(row), int(col)),  # Convert numpy.int64 to Python int
                "best_move_display": (int(row)+1, int(col)+1),  # Convert to 1-8 format for display and Python int
                "score": int(best_move[1]) if isinstance(best_move[1], np.integer) else best_move[1],
                "explanation": best_move_explanation,  
                "is_heuristic": is_best_move_heuristic,  # Flag indicating if heuristic evaluation was used
                "win_probability": win_probability,  # Add win probability data
                "board_analysis": board_analysis,
                "opponent_intent": opponent_intent,
                "all_moves": [
                    {
                        "move": (int(m[0][0]), int(m[0][1])),  # Convert numpy.int64 to Python int
                        "move_display": (int(m[0][0])+1, int(m[0][1])+1),
                        "score": int(m[1]) if isinstance(m[1], np.integer) else m[1],
                        "explanation": m[2],  # Use original explanation without marker
                        "is_heuristic": m[3] if len(m) > 3 else False,
                        "win_probability": m[4] if len(m) > 4 else 50  # Add win probability data to each suggested move
                    } for m in move_scores[:3]  # Return the top 3 best moves
                ]
            }
            
            print(f"Z3 analysis complete. Best move: {result['best_move_display']}")
            if is_best_move_heuristic:
                print("Note: The best move was determined using heuristic evaluation, not Z3 constraint solving")
            return result
            
        except Exception as e:
            import traceback
            print(f"Error in analyze_best_move: {str(e)}")
            print(traceback.format_exc())
            return {
                "has_move": False,
                "message": f"Error in Z3 analysis: {str(e)}"
            }
    
    def _analyze_board_state(self):
        """Analyze the current board state, including piece count and control area"""
        board = self.game.board
        board_size = len(board)
        
        # Calculate the piece count
        black_count, white_count = self.game.get_piece_count()
        
        # Calculate the control situation in each area
        corners_black = 0
        corners_white = 0
        edges_black = 0
        edges_white = 0
        
        # Check the four corners (regardless of board size)
        corner_positions = [(0, 0), (0, board_size-1), (board_size-1, 0), (board_size-1, board_size-1)]
        for r, c in corner_positions:
            if board[r, c] == BLACK:
                corners_black += 1
            elif board[r, c] == WHITE:
                corners_white += 1
        
        # Check the edges (excluding corners)
        for i in range(1, board_size-1):
            # Top and bottom edges
            if board[0, i] == BLACK: edges_black += 1
            elif board[0, i] == WHITE: edges_white += 1
            if board[board_size-1, i] == BLACK: edges_black += 1
            elif board[board_size-1, i] == WHITE: edges_white += 1
            
            # Left and right edges
            if board[i, 0] == BLACK: edges_black += 1
            elif board[i, 0] == WHITE: edges_white += 1
            if board[i, board_size-1] == BLACK: edges_black += 1
            elif board[i, board_size-1] == WHITE: edges_white += 1
        
        # Calculate the game stage based on board size
        total_pieces = black_count + white_count
        if board_size == 4:  # 4x4 board
            if total_pieces <= 8:
                game_stage = "early"
            elif total_pieces <= 12:
                game_stage = "mid"
            else:
                game_stage = "late"
        else:  # 8x8 board
            if total_pieces <= 16:
                game_stage = "early"
            elif total_pieces <= 48:
                game_stage = "mid"
            else:
                game_stage = "late"
        
        # Analyze the stable discs (discs that cannot be flipped)
        stable_black, stable_white = self._count_stable_discs()
        
        # Analyze the mobility (number of valid moves for both players)
        current_player = self.game.current_player
        self.game.current_player = BLACK
        black_mobility = len(self.game.get_valid_moves())
        self.game.current_player = WHITE
        white_mobility = len(self.game.get_valid_moves())
        self.game.current_player = current_player  # Restore the original player
        
        return {
            "black_count": int(black_count),
            "white_count": int(white_count),
            "corners_black": int(corners_black),
            "corners_white": int(corners_white),
            "edges_black": int(edges_black),
            "edges_white": int(edges_white),
            "game_stage": game_stage,
            "stable_black": int(stable_black),
            "stable_white": int(stable_white),
            "black_mobility": int(black_mobility),
            "white_mobility": int(white_mobility)
        }
    
    def _count_stable_discs(self):
        """Calculate the number of stable discs for both players (discs that cannot be flipped)"""
        board = self.game.board
        board_size = len(board)
        stable_black = 0
        stable_white = 0
        
        # First mark all corners as stable
        stable_board = np.zeros((board_size, board_size), dtype=bool)
        corners = [(0, 0), (0, board_size-1), (board_size-1, 0), (board_size-1, board_size-1)]
        for r, c in corners:
            if board[r, c] != EMPTY:
                stable_board[r, c] = True
        
        # Start from the corners and expand to mark stable discs
        changed = True
        while changed:
            changed = False
            for r in range(board_size):
                for c in range(board_size):
                    if board[r, c] != EMPTY and not stable_board[r, c]:
                        # Check if this disc is stable
                        if self._is_stable_disc(r, c, stable_board):
                            stable_board[r, c] = True
                            changed = True
        
        # Calculate the number of stable discs for both players
        for r in range(board_size):
            for c in range(board_size):
                if stable_board[r, c]:
                    if board[r, c] == BLACK:
                        stable_black += 1
                    elif board[r, c] == WHITE:
                        stable_white += 1
        
        return stable_black, stable_white
    
    def _is_stable_disc(self, row, col, stable_board):
        """Check if a disc is stable (cannot be flipped in any future move)"""
        board = self.game.board
        board_size = len(board)
        directions = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
        
        # For each direction pair (e.g., UP/DOWN, LEFT/RIGHT, etc.)
        for i in range(4):  # 4 direction pairs
            dir1 = directions[i]
            dir2 = directions[i+4]  # Opposite direction
            
            # Check if the disc is bordered by same color or stable discs in both directions
            is_stable_dir = False
            
            # Check first direction
            r, c = row + dir1[0], col + dir1[1]
            if not (0 <= r < board_size and 0 <= c < board_size):
                # Edge of board - stable in this direction
                is_stable_dir = True
            elif board[r, c] == board[row, col] and stable_board[r, c]:
                # Same color and stable - stable in this direction
                is_stable_dir = True
            
            # If not stable in first direction, check opposite direction
            if not is_stable_dir:
                r, c = row + dir2[0], col + dir2[1]
                if not (0 <= r < board_size and 0 <= c < board_size):
                    # Edge of board - stable in this direction
                    is_stable_dir = True
                elif board[r, c] == board[row, col] and stable_board[r, c]:
                    # Same color and stable - stable in this direction
                    is_stable_dir = True
            
            # If not stable in either direction of this pair, then disc is not stable
            if not is_stable_dir:
                return False
        
        # If stable in all direction pairs, then disc is stable
        return True
    
    def _analyze_opponent_last_move(self):
        """Analyze the opponent's last move and possible intentions"""
        if self.game.last_ai_move is None:
            return {"has_last_move": False, "message": "No previous opponent move detected."}
        
        last_move = self.game.last_ai_move
        row, col = last_move
        flipped_discs = self.game.last_flipped_discs
        board_size = len(self.game.board)
        
        # Evaluate the strategic value of the opponent's last move
        move_type = "Normal Move"
        intent = "Unknown"
        
        # Determine the move type based on board size
        corner_positions = [(0, 0), (0, board_size-1), (board_size-1, 0), (board_size-1, board_size-1)]
        if (row, col) in corner_positions:
            move_type = "Corner Capture"
            intent = "Your opponent has captured a corner, which is a strong strategic position."
        elif row == 0 or row == board_size-1 or col == 0 or col == board_size-1:
            move_type = "Edge Capture"
            intent = "Your opponent has captured an edge position, possibly preparing to take a corner."
        elif ((row <= 1 and col <= 1) or 
              (row <= 1 and col >= board_size-2) or 
              (row >= board_size-2 and col <= 1) or 
              (row >= board_size-2 and col >= board_size-2)):
            move_type = "Near Corner"
            intent = "Your opponent has moved near a corner, possibly preparing to capture it."
        
        # Analyze the number of discs flipped and the pattern
        flipped_count = len(flipped_discs)
        
        # Check if the opponent is setting traps
        trap_analysis = self._check_for_opponent_traps()
        
        return {
            "has_last_move": True,
            "last_move": (int(row), int(col)),
            "last_move_display": (int(row)+1, int(col)+1),
            "flipped_count": int(flipped_count),
            "move_type": move_type,
            "intent": intent,
            "traps": trap_analysis
        }
    
    def _check_for_opponent_traps(self):
        """Check if the opponent is setting traps"""
        traps = []
        board_size = len(self.game.board)
        
        # Define corner positions based on board size
        corner_positions = [(0, 0), (0, board_size-1), (board_size-1, 0), (board_size-1, board_size-1)]
        
        # Simulate the current board, check if the opponent can gain any advantage if the black disc falls on certain positions
        current_player = self.game.current_player
        board_copy = np.copy(self.game.board)
        
        # Find all possible moves for the black disc
        self.game.current_player = BLACK
        black_moves = self.game.get_valid_moves()
        
        for black_move in black_moves:
            # Simulate the black disc's move
            game_sim = Othello()
            game_sim.board = np.copy(self.game.board)
            game_sim.current_player = BLACK
            r, c = black_move
            
            if game_sim.make_move(r, c):
                # Check the possible responses of the white disc after the black disc's move
                game_sim.current_player = WHITE
                white_moves = game_sim.get_valid_moves()
                
                # Evaluate each possible response of the white disc
                dangerous_responses = []
                for white_move in white_moves:
                    wr, wc = white_move
                    
                    # Check if the white disc can capture a corner
                    if (wr, wc) in corner_positions:
                        dangerous_responses.append({
                            "move": (int(wr), int(wc)),
                            "move_display": (int(wr)+1, int(wc)+1),
                            "threat": "Opponent may capture a corner",
                            "severity": "High"
                        })
                    
                    # Check if the white disc can gain a large number of flips
                    game_sim2 = Othello()
                    game_sim2.board = np.copy(game_sim.board)
                    game_sim2.current_player = WHITE
                    
                    if game_sim2.make_move(wr, wc):
                        flipped = len(game_sim2.last_flipped_discs)
                        # Adjust threshold based on board size
                        threshold = 3 if board_size == 8 else 2
                        high_threshold = 5 if board_size == 8 else 3
                        
                        if flipped >= threshold:  # If the white disc can flip sufficient discs, it is considered a potential threat
                            severity = "Medium Risk" if flipped < high_threshold else "High Risk"
                            dangerous_responses.append({
                                "move": (int(wr), int(wc)),
                                "move_display": (int(wr)+1, int(wc)+1),
                                "threat": f"Opponent may flip {flipped} of your discs",
                                "severity": severity 
                            })
                
                if dangerous_responses:
                    traps.append({
                        "black_move": (int(r), int(c)),
                        "black_move_display": (int(r)+1, int(c)+1),
                        "threats": dangerous_responses
                    })
        
        # Restore the game state
        self.game.current_player = current_player
        
        return traps
    
    def _z3_evaluate_move(self, move, game_stage, valid_moves):
        """
        Evaluates the move using Z3 constraint solving with fallback to advanced heuristic evaluation.
        Implements a multi-tier approach to Z3 solving:
        1. First tries a complete Z3 model
        2. If that fails, tries a simplified Z3 model
        3. If that fails, tries a minimal Z3 model
        4. Only if all Z3 models fail, falls back to heuristic evaluation
        """
        row, col = move
        
        # Prepare the game copy for all models to use
        game_copy = Othello()
        game_copy.board = np.copy(self.game.board)
        game_copy.current_player = BLACK
        
        # Simulate the move
        game_copy.make_move(row, col)
        
        # Get basic metrics for all models
        black_count, white_count = game_copy.get_piece_count()
        flipped_discs = len(game_copy.last_flipped_discs)
        immediate_score = black_count - white_count
        
        # Get position value matrix for all models
        board_size = len(game_copy.board)
        position_weights = self._get_position_value_matrix(game_stage)
        
        # Define important positions for all models
        corners = [(0, 0), (0, board_size-1), (board_size-1, 0), (board_size-1, board_size-1)]
        edges = []
        for i in range(1, board_size-1):
            edges.extend([(0, i), (i, 0), (board_size-1, i), (i, board_size-1)])
        
        # Get mobility for all models
        game_copy.current_player = BLACK
        black_mobility = len(game_copy.get_valid_moves())
        game_copy.current_player = WHITE
        white_mobility = len(game_copy.get_valid_moves())
        game_copy.current_player = BLACK  # Reset to BLACK
        mobility_diff = black_mobility - white_mobility
            
        # TIER 1: Complete Z3 Model
        try:
            print("Trying TIER 1: Complete Z3 Model")
            s = z3.Solver()
            
            # Set a reasonable timeout for the first tier
            s.set("timeout", 45000)  # 45 seconds (increased from 30 seconds)
            s.set("smt.arith.solver", 2)
            s.set("smt.random_seed", 42)
            s.set("smt.relevancy", 0)
            
            # Create Z3 variables for the board state
            board_vars = {}
            for r in range(board_size):
                for c in range(board_size):
                    board_vars[(r, c)] = z3.Int(f"cell_{r}_{c}")
                    s.add(board_vars[(r, c)] >= 0, board_vars[(r, c)] <= 2)  # 0=EMPTY, 1=BLACK, 2=WHITE
                    s.add(board_vars[(r, c)] == game_copy.board[r, c])  # Set current state
            
            # Calculate position score, corners are most important
            position_score_expr = z3.Real('0')
            for r in range(board_size):
                for c in range(board_size):
                    weight = position_weights[r][c]
                    cell_score = z3.If(board_vars[(r, c)] == 1, weight, 0)  # Score for BLACK
                    position_score_expr = position_score_expr + cell_score
            
            # Calculate stability score
            stability_expr = z3.Real('0')
            # Corners are most stable
            for r, c in corners:
                corner_stable = z3.If(board_vars[(r, c)] == 1, 25, 0)  # BLACK in corner
                stability_expr = stability_expr + corner_stable
            
            # Edges are somewhat stable
            for r, c in edges:
                edge_stable = z3.If(board_vars[(r, c)] == 1, 10, 0)  # BLACK on edge
                stability_expr = stability_expr + edge_stable
            
            # Mobility expression
            mobility_expr = z3.Real(str(mobility_diff))
            
            # Calculate threat score - opponent's potential strong moves
            threat_expr = z3.Real('0')
            game_copy.current_player = WHITE
            opponent_moves = game_copy.get_valid_moves()
            for opp_move in opponent_moves:
                opp_r, opp_c = opp_move
                # Opponent can take a corner
                if (opp_r, opp_c) in corners:
                    threat_expr = threat_expr - 15  # Serious threat
                # Opponent can take an edge
                elif (opp_r, opp_c) in edges:
                    threat_expr = threat_expr - 5   # Medium threat
            
            # Calculate win probability
            win_prob_expr = z3.Real('0')
            score_diff = black_count - white_count
            total_pieces = black_count + white_count
            
            # Calculate win probability impact at different stages
            if game_stage == "early":  # Early - position and mobility more important
                win_prob = 0.5 + (score_diff / float(board_size * board_size)) * 0.3 + (mobility_diff / float(board_size * 2)) * 0.2
            elif game_stage == "mid":  # Mid - score difference becomes more important
                win_prob = 0.5 + (score_diff / float(board_size * board_size)) * 0.4 + (mobility_diff / float(board_size * 2)) * 0.1
            else:  # Late - score difference is decisive
                win_prob = 0.5 + (score_diff / float(board_size * board_size)) * 0.5
            s.add(win_prob_expr == win_prob)
            
            # Combine all factors for final score
            # Adjust weights based on game stage
            final_score_expr = z3.Real('final_score')
            if game_stage == "early":
                s.add(final_score_expr == 
                      position_score_expr * 3 + 
                      stability_expr * 2 + 
                      mobility_expr * 3 + 
                      threat_expr * 2 + 
                      win_prob_expr * 30)
            elif game_stage == "mid":
                s.add(final_score_expr == 
                      position_score_expr * 2 + 
                      stability_expr * 3 + 
                      mobility_expr * 2 + 
                      threat_expr * 1 + 
                      win_prob_expr * 40)
            else:  # late
                s.add(final_score_expr == 
                      position_score_expr * 1 + 
                      stability_expr * 3 + 
                      mobility_expr * 1 + 
                      threat_expr * 1 + 
                      win_prob_expr * 50)
            
            # Check solver result
            result = s.check()
            if result == z3.sat:
                model = s.model()
                final_score = model[final_score_expr]
                win_prob = model[win_prob_expr]
                
                # Extract numeric results
                try:
                    score_val = float(final_score.as_decimal(5))
                    prob_val = float(win_prob.as_decimal(5))
                except:
                    # Backup method
                    score_val = float(str(final_score).replace('/', '.'))
                    prob_val = float(str(win_prob).replace('/', '.'))
                
                # Limit win probability to a reasonable range
                prob_val = max(0.1, min(0.9, prob_val))
                prob_percent = int(prob_val * 100)
                
                # Create explanation
                explanation = f"This move at position ({int(row)+1}, {int(col)+1}) flips {flipped_discs} opponent's disc(s)."
                if flipped_discs > 0:
                    explanation += f" After this move, you will have {int(black_count)} discs vs. opponent's {int(white_count)} discs."
                
                # Position explanation
                if (row, col) in corners:
                    explanation += " Taking a corner position, which is strategically valuable as it cannot be flipped."
                elif (row, col) in edges:
                    explanation += " Taking an edge position, which is harder for your opponent to flip."
                elif ((row <= 1 and col <= 1) and game_copy.board[0, 0] == EMPTY) or \
                     ((row <= 1 and col >= board_size-2) and game_copy.board[0, board_size-1] == EMPTY) or \
                     ((row >= board_size-2 and col <= 1) and game_copy.board[board_size-1, 0] == EMPTY) or \
                     ((row >= board_size-2 and col >= board_size-2) and game_copy.board[board_size-1, board_size-1] == EMPTY):
                    explanation += " This position is near an empty corner, which might give your opponent a strategic advantage."
                
                # Mobility explanation
                if mobility_diff > 0:
                    explanation += f" You will have {mobility_diff} more possible moves than your opponent."
                elif mobility_diff < 0:
                    explanation += f" After this move, your opponent will have {-mobility_diff} more possible moves than you."
                
                # Win probability explanation
                explanation += f" Z3 analysis indicates a favorable winning probability of {prob_percent}%."
                
                print(f"TIER 1 success: score={int(score_val)}, prob={prob_percent}")
                return int(score_val), explanation, False, prob_percent
            
            raise z3.Z3Exception("Tier 1 model did not produce a satisfiable result")
            
        except Exception as e:
            print(f"TIER 1 failed: {e}")
            
            # TIER 2: Simplified Z3 Model with fewer constraints
            try:
                print("Trying TIER 2: Simplified Z3 Model")
                simple_s = z3.Solver()
                simple_s.set("timeout", 25000)  # 25 seconds (increased from 15 seconds)
                
                # Simplified model with fewer variables and constraints
                # Only track key positions instead of the whole board
                
                # Create position value expression - simplified
                pos_value = position_weights[row][col]
                
                # Calculate stability score - simplified
                stability = 0
                if (row, col) in corners:
                    stability = 25  # High stability for corners
                elif (row, col) in edges:
                    stability = 10  # Medium stability for edges
                
                # Simplified model components
                simple_score_expr = z3.Real('simple_score')
                simple_win_prob_expr = z3.Real('simple_win_prob')
                
                # Simplified win probability calculation
                simple_win_prob = 0.5
                if game_stage == "early":
                    simple_win_prob += (immediate_score / float(board_size * board_size)) * 0.2 + (mobility_diff / float(board_size * 2)) * 0.3
                elif game_stage == "mid":
                    simple_win_prob += (immediate_score / float(board_size * board_size)) * 0.3 + (mobility_diff / float(board_size * 2)) * 0.2
                else:
                    simple_win_prob += (immediate_score / float(board_size * board_size)) * 0.4 + (mobility_diff / float(board_size * 2)) * 0.1
                
                simple_s.add(simple_win_prob_expr == simple_win_prob)
                
                # Simplified model score calculation
                if game_stage == "early":
                    simple_s.add(simple_score_expr == 
                              pos_value * 3 + 
                              stability * 2 + 
                              mobility_diff * 5 + 
                              flipped_discs * 2 + 
                              simple_win_prob_expr * 30)
                elif game_stage == "mid":
                    simple_s.add(simple_score_expr == 
                              pos_value * 2 + 
                              stability * 3 + 
                              mobility_diff * 3 + 
                              flipped_discs * 3 + 
                              simple_win_prob_expr * 40)
                else:  # late
                    simple_s.add(simple_score_expr == 
                              pos_value * 1 + 
                              stability * 3 + 
                              mobility_diff * 2 + 
                              flipped_discs * 4 + 
                              simple_win_prob_expr * 50)
                
                # Check simplified solver result
                simple_result = simple_s.check()
                if simple_result == z3.sat:
                    model = simple_s.model()
                    simple_score = model[simple_score_expr]
                    simple_prob = model[simple_win_prob_expr]
                    
                    # Extract numeric results
                    try:
                        score_val = float(simple_score.as_decimal(5))
                        prob_val = float(simple_prob.as_decimal(5))
                    except:
                        # Backup method
                        score_val = float(str(simple_score).replace('/', '.'))
                        prob_val = float(str(simple_prob).replace('/', '.'))
                    
                    # Limit win probability to a reasonable range
                    prob_val = max(0.1, min(0.9, prob_val))
                    prob_percent = int(prob_val * 100)
                    
                    # Create explanation
                    explanation = f"This move at position ({int(row)+1}, {int(col)+1}) flips {flipped_discs} opponent's disc(s)."
                    if flipped_discs > 0:
                        explanation += f" After this move, you will have {int(black_count)} discs vs. opponent's {int(white_count)} discs."
                    
                    # Position explanation
                    if (row, col) in corners:
                        explanation += " Taking a corner position, which is strategically valuable as it cannot be flipped."
                    elif (row, col) in edges:
                        explanation += " Taking an edge position, which is harder for your opponent to flip."
                    
                    # Mobility explanation
                    if mobility_diff > 0:
                        explanation += f" You will have {mobility_diff} more possible moves than your opponent."
                    elif mobility_diff < 0:
                        explanation += f" After this move, your opponent will have {-mobility_diff} more possible moves than you."
                    
                    # Win probability explanation with note about simplified model
                    explanation += f" Simplified Z3 model analysis indicates a winning probability of {prob_percent}%."
                    
                    print(f"TIER 2 success: score={int(score_val)}, prob={prob_percent}")
                    return int(score_val), explanation, False, prob_percent
                
                raise z3.Z3Exception("Tier 2 model did not produce a satisfiable result")
                
            except Exception as e:
                print(f"TIER 2 failed: {e}")
                
                # TIER 3: Minimal Z3 Model - Commenting out to prioritize complete and simplified models
                try:
                    print("Trying TIER 3: Minimal Z3 Model")
                    min_s = z3.Solver()
                    min_s.set("timeout", 8000)  # 8 seconds (increased from 5 seconds)
                    
                    # Extremely simplified model - just basic position value, flips and mobility
                    minimal_score_expr = z3.Real('minimal_score')
                    
                    # Position value from the matrix
                    pos_value = position_weights[row][col]
                    
                    # Very basic calculation
                    min_s.add(minimal_score_expr == pos_value + flipped_discs * 2 + mobility_diff * 3)
                    
                    # Solve the minimal model
                    min_result = min_s.check()
                    if min_result == z3.sat:
                        model = min_s.model()
                        min_score = model[minimal_score_expr]
                        
                        # Extract numeric result
                        try:
                            score_val = float(min_score.as_decimal(5))
                        except:
                            # Backup method
                            score_val = float(str(min_score).replace('/', '.'))
                        
                        # Calculate a basic win probability
                        if immediate_score > 0:
                            win_prob = 55 + immediate_score * 2
                        else:
                            win_prob = 45 + immediate_score * 2
                        
                        # Limit win probability to a reasonable range
                        win_prob = max(10, min(90, win_prob))
                        
                        # Create basic explanation
                        explanation = f"This move at position ({int(row)+1}, {int(col)+1}) flips {flipped_discs} opponent's disc(s)."
                        if (row, col) in corners:
                            explanation += " Taking a corner position, which is strategically valuable."
                        elif (row, col) in edges:
                            explanation += " Taking an edge position, which is a good strategic choice."
                        
                        explanation += f" Minimal Z3 model analysis indicates approximately {win_prob}% chance of winning."
                        
                        print(f"TIER 3 success: score={int(score_val)}, prob={win_prob}")
                        return int(score_val), explanation, False, win_prob
                    
                except Exception as e:
                    print(f"TIER 3 failed: {e}. Falling back to heuristic evaluation.")
                
                # # Directly fall back to heuristic evaluation after Tier 2 fails
                # print("Skipping Tier 3 minimal model. Falling back to heuristic evaluation.")
                
                # FINAL FALLBACK: Advanced Heuristic Evaluation
                # If all Z3 models fail, use the heuristic evaluation as last resort
                score, explanation, win_prob = self._advanced_heuristic_evaluate_move(move, game_copy, game_stage)
                return score, explanation, True, win_prob
    
    def _advanced_heuristic_evaluate_move(self, move, game_copy, game_stage):
        """
        Advanced heuristic evaluation that uses sophisticated strategies to score moves.
        This can be equally or more intelligent than the Z3 solver for certain situations.
        """
        row, col = move
        board_size = len(game_copy.board)
        
        # Get basic metrics
        black_count, white_count = game_copy.get_piece_count()
        flipped_discs = len(game_copy.last_flipped_discs)
        immediate_score_diff = black_count - white_count
        
        # Get position value matrix
        position_weights = self._get_position_value_matrix(game_stage)
        position_value = position_weights[row][col]
        
        # Define important positions
        corners = [(0, 0), (0, board_size-1), (board_size-1, 0), (board_size-1, board_size-1)]
        edges = []
        for i in range(1, board_size-1):
            edges.extend([(0, i), (i, 0), (board_size-1, i), (i, board_size-1)])
        
        # Calculate corner proximity - positions adjacent to corners are dangerous if the corner is empty
        corner_proximity = 0
        for cr, cc in corners:
            if game_copy.board[cr, cc] == EMPTY:
                # Check all adjacent positions
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
                    ar, ac = cr + dr, cc + dc
                    if 0 <= ar < board_size and 0 <= ac < board_size:
                        if ar == row and ac == col:  # Our move is next to an empty corner
                            corner_proximity -= 30
        
        # Calculate stability score - stable discs cannot be flipped
        stability_score = 0
        
        # Corners provide maximum stability
        if (row, col) in corners:
            stability_score += 50
            
            # Control of 2 or more corners gives dominance
            for cr, cc in corners:
                if game_copy.board[cr, cc] == BLACK and (cr != row or cc != col):
                    stability_score += 30  # Bonus for controlling multiple corners
        
        # Edge positions are somewhat stable
        elif (row, col) in edges:
            stability_score += 20
            
            # Check if it forms part of a contiguous line of same color
            directions = [(0, 1), (1, 0)] if (row == 0 or row == board_size-1) else [(0, 1)]
            for dr, dc in directions:
                contiguous_count = 1  # count the piece itself
                # Count in positive direction
                r, c = row + dr, col + dc
                while 0 <= r < board_size and 0 <= c < board_size and game_copy.board[r, c] == BLACK:
                    contiguous_count += 1
                    r, c = r + dr, c + dc
                
                # Count in negative direction
                r, c = row - dr, col - dc
                while 0 <= r < board_size and 0 <= c < board_size and game_copy.board[r, c] == BLACK:
                    contiguous_count += 1
                    r, c = r - dr, c - dc
                
                # Bonus for forming lines
                if contiguous_count >= 3:
                    stability_score += contiguous_count * 5
        
        # Calculate mobility - prefer moves that maximize our options and limit opponent's
        game_copy.current_player = BLACK
        black_mobility = len(game_copy.get_valid_moves())
        game_copy.current_player = WHITE
        white_mobility = len(game_copy.get_valid_moves())
        game_copy.current_player = BLACK  # Reset
        
        mobility_score = 0
        mobility_diff = black_mobility - white_mobility
        
        # Different weight for mobility based on game stage
        if game_stage == "early":
            mobility_score = mobility_diff * 10  # High weight in early game
        elif game_stage == "mid":
            mobility_score = mobility_diff * 7   # Moderate weight in mid game
        else:
            mobility_score = mobility_diff * 3   # Lower weight in late game

        # Check for frontier discs (pieces adjacent to empty spaces) - fewer is better
        frontier_score = 0
        directions = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
        black_frontier = 0
        white_frontier = 0
        
        for r in range(board_size):
            for c in range(board_size):
                if game_copy.board[r, c] != EMPTY:
                    # Check if this disc is a frontier disc
                    is_frontier = False
                    for dr, dc in directions:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < board_size and 0 <= nc < board_size and game_copy.board[nr, nc] == EMPTY:
                            is_frontier = True
                            break
                    
                    if is_frontier:
                        if game_copy.board[r, c] == BLACK:
                            black_frontier += 1
                    else:
                        white_frontier += 1
        
        # Having fewer frontier discs is better (less vulnerable)
        if black_frontier + white_frontier > 0:
            frontier_ratio = black_frontier / (black_frontier + white_frontier)
            frontier_score = -20 * frontier_ratio  # Penalty for having a higher proportion of frontier discs
        
        # Check for potential traps and tactical advantages
        tactical_score = 0
        
        # Check if our move forces the opponent to play in a bad position
        game_copy.current_player = WHITE
        white_moves = game_copy.get_valid_moves()
        forced_bad_move = True
        
        for white_move in white_moves:
            wr, wc = white_move
            # If opponent can take a corner, that's not good for us
            if (wr, wc) in corners:
                forced_bad_move = False
                tactical_score -= 40
            # If opponent can take a good edge that's not adjacent to an empty corner
            elif (wr, wc) in edges:
                # Check if it's adjacent to an empty corner
                is_bad_edge = False
                for cr, cc in corners:
                    if game_copy.board[cr, cc] == EMPTY and abs(wr - cr) <= 1 and abs(wc - cc) <= 1:
                        is_bad_edge = True
                        break
                
                if not is_bad_edge:
                    forced_bad_move = False
                    tactical_score -= 15
        
        # Bonus if all opponent's moves are bad
        if forced_bad_move and white_moves:
            tactical_score += 35
        
        # Check if the move creates a "wall" structure (connected line of pieces)
        wall_score = 0
        
        # Check horizontal and vertical directions for walls
        for dr, dc in [(0, 1), (1, 0)]:
            wall_length = 1  # Count the piece itself
            r, c = row + dr, col + dc
            while 0 <= r < board_size and 0 <= c < board_size and game_copy.board[r, c] == BLACK:
                wall_length += 1
                r, c = r + dr, c + dc
            
            r, c = row - dr, col - dc
            while 0 <= r < board_size and 0 <= c < board_size and game_copy.board[r, c] == BLACK:
                wall_length += 1
                r, c = r - dr, c - dc
            
            if wall_length >= 3:
                wall_score += wall_length * 3
        
        # Calculate the final score based on the game stage
        if game_stage == "early":
            final_score = (
                position_value * 3 +      # High weight for position in early game
                stability_score * 2 +     # Moderate weight for stability
                mobility_score * 3 +      # High weight for mobility
                corner_proximity * 3 +    # High penalty for bad positions near corners
                frontier_score * 1 +      # Small weight for frontier discs
                tactical_score * 2 +      # Moderate weight for tactical considerations
                wall_score * 2 +          # Moderate weight for wall formations
                immediate_score_diff * 1  # Low weight for immediate disc count
            )
        elif game_stage == "mid":
            final_score = (
                position_value * 2 +      # Moderate weight for position in mid game
                stability_score * 3 +     # High weight for stability
                mobility_score * 2 +      # Moderate weight for mobility
                corner_proximity * 2 +    # Moderate penalty for bad positions
                frontier_score * 2 +      # Moderate weight for frontier discs
                tactical_score * 3 +      # High weight for tactical considerations
                wall_score * 3 +          # High weight for wall formations
                immediate_score_diff * 2  # Moderate weight for disc count
            )
        else:  # late game
            final_score = (
                position_value * 1 +      # Low weight for position in late game
                stability_score * 3 +     # High weight for stability
                mobility_score * 1 +      # Low weight for mobility
                corner_proximity * 1 +    # Low penalty for bad positions
                frontier_score * 1 +      # Low weight for frontier discs
                tactical_score * 2 +      # Moderate weight for tactical considerations
                wall_score * 1 +          # Low weight for wall formations
                immediate_score_diff * 4  # Very high weight for disc count
            )
        
        # Calculate win probability based on various factors
        win_prob = 50  # Start with 50%
        
        # Position control factor
        corner_control = 0
        for cr, cc in corners:
            if game_copy.board[cr, cc] == BLACK:
                corner_control += 1
            elif game_copy.board[cr, cc] == WHITE:
                corner_control -= 1
        
        win_prob += corner_control * 10  # ±10% per corner
        
        # Disc difference factor - more important late game
        disc_factor = (black_count - white_count) / max(1, black_count + white_count)
        if game_stage == "late":
            win_prob += disc_factor * 30
        elif game_stage == "mid":
            win_prob += disc_factor * 20
        else:
            win_prob += disc_factor * 10
        
        # Mobility factor - more important early game
        if black_mobility + white_mobility > 0:
            mobility_factor = (black_mobility - white_mobility) / (black_mobility + white_mobility)
            if game_stage == "early":
                win_prob += mobility_factor * 25
            elif game_stage == "mid":
                win_prob += mobility_factor * 15
            else:
                win_prob += mobility_factor * 5
        
        # Limit probability to reasonable range
        win_prob = max(5, min(95, win_prob))
        
        # Create explanation
        explanation = f"[Advanced Analysis] This move at position ({int(row)+1}, {int(col)+1}) flips {flipped_discs} opponent's disc(s)."
        
        # Add position-specific explanation
        if (row, col) in corners:
            explanation += " Taking a corner position, which is strategically valuable as it cannot be flipped."
        elif (row, col) in edges:
            explanation += " Taking an edge position, which provides increased stability."
        
        # Add tactical explanations
        if corner_proximity < 0:
            explanation += " Caution: this position is near an empty corner, which could be risky."
        
        if wall_score > 10:
            explanation += f" This creates a strong wall formation of {wall_score//3} connected pieces."
        
        if tactical_score > 30:
            explanation += " This move limits your opponent's options to unfavorable positions."
        
        if mobility_diff > 0:
            explanation += f" You will have {mobility_diff} more possible moves than your opponent."
        elif mobility_diff < 0:
            explanation += f" Your opponent will have {-mobility_diff} more possible moves than you."
        
        # Win probability explanation
        explanation += f" Advanced analysis estimates a {int(win_prob)}% chance of winning from this position."
        
        return int(final_score), explanation, int(win_prob)
    
    def _get_position_value_matrix(self, game_stage):
        """Returns a matrix of position values based on the game stage and board size"""
        # Determine the board size
        board_size = len(self.game.board)
        
        # For 4x4 board
        if board_size == 4:
            if game_stage == "early":
                # Early game emphasizes central control and avoiding dangerous areas
                return [
                    [100, -20, 10,  5],
                    [-20, -25,  1,  1],
                    [ 10,   1,  5,  2],
                    [  5,   1,  2,  1]
                ]
            elif game_stage == "mid":
                # Mid game balances the value of each area
                return [
                    [100, -10,  8,  6],
                    [-10, -15,  4,  2],
                    [  8,   4,  6,  4],
                    [  6,   2,  4,  2]
                ]
            else:  # late
                # Late game emphasizes corners and edges
                return [
                    [100,  -5, 10,  8],
                    [ -5, -10,  5,  3],
                    [ 10,   5,  5,  3],
                    [  8,   3,  3,  3]
                ]
        # For 8x8 board
        else:
            if game_stage == "early":
                # Early game emphasizes central control and avoiding dangerous areas
                return [
                    [100, -20, 10,  5,  5, 10, -20, 100],
                    [-20, -25,  1,  1,  1,  1, -25, -20],
                    [ 10,   1,  5,  2,  2,  5,   1,  10],
                    [  5,   1,  2,  1,  1,  2,   1,   5],
                    [  5,   1,  2,  1,  1,  2,   1,   5],
                    [ 10,   1,  5,  2,  2,  5,   1,  10],
                    [-20, -25,  1,  1,  1,  1, -25, -20],
                    [100, -20, 10,  5,  5, 10, -20, 100]
                ]
            elif game_stage == "mid":
                # Mid game balances the value of each area
                return [
                    [100, -10,  8,  6,  6,  8, -10, 100],
                    [-10, -15,  4,  2,  2,  4, -15, -10],
                    [  8,   4,  6,  4,  4,  6,   4,   8],
                    [  6,   2,  4,  2,  2,  4,   2,   6],
                    [  6,   2,  4,  2,  2,  4,   2,   6],
                    [  8,   4,  6,  4,  4,  6,   4,   8],
                    [-10, -15,  4,  2,  2,  4, -15, -10],
                    [100, -10,  8,  6,  6,  8, -10, 100]
                ]
            else:  # late
                # Late game emphasizes corners and edges
                return [
                    [100,  -5, 10,  8,  8, 10,  -5, 100],
                    [ -5, -10,  5,  3,  3,  5, -10,  -5],
                    [ 10,   5,  5,  3,  3,  5,   5,  10],
                    [  8,   3,  3,  3,  3,  3,   3,   8],
                    [  8,   3,  3,  3,  3,  3,   3,   8],
                    [ 10,   5,  5,  3,  3,  5,   5,  10],
                    [ -5, -10,  5,  3,  3,  5, -10,  -5],
                    [100,  -5, 10,  8,  8, 10,  -5, 100]
                ] 