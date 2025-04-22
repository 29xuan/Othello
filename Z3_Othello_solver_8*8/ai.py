import random
from game_logic import Othello, BLACK, WHITE, EMPTY

# Global variable to track difficulty level
difficulty_level = "easy"  # Default is easy

def set_difficulty(level):
    """Set the AI difficulty level"""
    global difficulty_level
    difficulty_level = level.lower()

def get_ai_move(game):
    """ Choose a move for AI based on current difficulty level """
    global difficulty_level
    
    valid_moves = [(r, c) for r in range(8) for c in range(8) if game.is_valid_move(r, c)]
    
    if not valid_moves:
        return None
    
    if difficulty_level == "easy":
        # Easy mode: Just pick the first valid move (deterministic)
        return valid_moves[0]
    else:
        # Hard mode: Use a more strategic approach
        return get_strategic_move(game, valid_moves)

def get_strategic_move(game, valid_moves):
    """Use a strategic approach to select the best move"""
    # Define position value matrix - some positions are strategically better
    position_values = [
        [120, -20, 20, 5, 5, 20, -20, 120],  # Increase the importance of corners
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [20, -2, 5, 2, 2, 5, -2, 20],  # Adjust the weight of the intermediate area
        [5, -2, 2, 1, 1, 2, -2, 5],
        [5, -2, 2, 1, 1, 2, -2, 5],
        [20, -2, 5, 2, 2, 5, -2, 20],
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [120, -20, 20, 5, 5, 20, -20, 120]  # Increase the importance of corners
    ]
    
    # Calculate the game stage - early, mid or late
    total_pieces = sum(1 for r in range(8) for c in range(8) if game.board[r][c] != EMPTY)
    game_stage = "early" if total_pieces < 20 else "mid" if total_pieces < 50 else "late"
    
    best_score = float('-inf')
    best_move = None
    
    for move in valid_moves:
        row, col = move
        
        # Create a game simulation
        sim_game = Othello()
        sim_game.board = game.board.copy()
        sim_game.current_player = game.current_player
        
        # Perform a move in a simulation
        sim_game.make_move(row, col)
        
        # Basic location rating
        position_score = position_values[row][col]
        
        # Flipping score - how many opponent discs we flipped
        flipping_score = len(sim_game.last_flipped_discs) * 5
        
        # Corner control score - if it's a corner position, give a higher score
        corner_score = 0
        corners = [(0,0), (0,7), (7,0), (7,7)]
        if (row, col) in corners:
            corner_score = 50
        
        # Edge control score - controlling the edges is usually good
        edge_score = 0
        if row == 0 or row == 7 or col == 0 or col == 7:
            edge_score = 15
        
        # Mobility score - the fewer opponent moves in the next round, the better
        mobility_score = 0
        sim_game.current_player = 3 - sim_game.current_player  # Switch to opponent
        opponent_moves = sim_game.get_valid_moves()
        mobility_score = -len(opponent_moves) * 3  # The fewer opponent moves, the better
        
        # Stability score - the more stable the position, the better
        stability_score = 0
        
        # Adjust the scoring weights based on the game stage
        if game_stage == "early":
            # Early: emphasize position and mobility
            move_score = position_score * 2 + mobility_score * 2 + corner_score * 3 + edge_score + flipping_score * 0.5
        elif game_stage == "mid":
            # Mid: balance position and mobility
            move_score = position_score + mobility_score + corner_score * 2 + edge_score + flipping_score
        else:
            # Late: emphasize flipping and corner control
            move_score = position_score * 0.5 + corner_score * 2 + flipping_score * 2 + edge_score
        
        # If this move is better than the current best, update
        if move_score > best_score:
            best_score = move_score
            best_move = move
    
    # If no strategic move is found, fall back to random move
    return best_move if best_move else random.choice(valid_moves)

