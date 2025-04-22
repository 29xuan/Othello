import random
import logging
from game_logic import Othello, BLACK, WHITE, EMPTY

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('ai')

# Global variable to track difficulty level
difficulty_level = "easy"  # Default is easy

def set_difficulty(level):
    """Set the AI difficulty level"""
    global difficulty_level
    difficulty_level = level.lower()
    logger.info(f"AI difficulty set to: {difficulty_level}")

def get_ai_move(game):
    """ Choose a move for AI based on current difficulty level """
    global difficulty_level
    
    valid_moves = [(r, c) for r in range(4) for c in range(4) if game.is_valid_move(r, c)]
    logger.info(f"AI calculating move. Current player: {game.current_player}, Valid moves: {valid_moves}")
    
    if not valid_moves:
        logger.info("No valid moves for AI")
        return None
    
    if difficulty_level == "easy":
        # Easy mode: Just pick the first valid move (deterministic)
        selected_move = valid_moves[0]
        logger.info(f"Easy mode - Selected move: {selected_move}")
        return selected_move
    else:
        # Hard mode: Use a more strategic approach
        selected_move = get_strategic_move(game, valid_moves)
        logger.info(f"Hard mode - Selected move: {selected_move}")
        return selected_move

def get_strategic_move(game, valid_moves):
    """Use a strategic approach to select the best move"""
    try:
        # Define position value matrix
        position_values = [
            [120, -20, -20, 120],  
            [-20, -5, -5, -20],
            [-20, -5, -5, -20],
            [120, -20, -20, 120]  
        ]
        
        # Calculate game stage
        total_pieces = sum(1 for r in range(4) for c in range(4) if game.board[r][c] != EMPTY)
        game_stage = "early" if total_pieces < 8 else "mid" if total_pieces < 12 else "late"
        logger.info(f"Game stage: {game_stage}, Total pieces: {total_pieces}")
        
        best_score = float('-inf')
        best_move = None
        
        for move in valid_moves:
            row, col = move
            
            # Create game simulation
            sim_game = Othello()
            sim_game.board = game.board.copy()
            sim_game.current_player = game.current_player
            
            # Execute move in simulation
            sim_game.make_move(row, col)
            
            # Basic position score
            position_score = position_values[row][col]
            
            # Flipping score
            flipping_score = len(sim_game.last_flipped_discs) * 5
            
            # Corner control score 
            corner_score = 0
            corners = [(0,0), (0,3), (3,0), (3,3)]
            if (row, col) in corners:
                corner_score = 50
            
            # Edge control score
            edge_score = 0
            if row == 0 or row == 3 or col == 0 or col == 3:
                edge_score = 15
            
            # Mobility score 
            mobility_score = 0
            sim_game.current_player = 3 - sim_game.current_player  
            opponent_moves = sim_game.get_valid_moves()
            mobility_score = -len(opponent_moves) * 3  
            
            # Stability score 
            stability_score = 0
            
            # Adjust score weights based on game stage
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
                logger.debug(f"New best move: {best_move}, score: {best_score}")
        
        # If no strategic move is found, fall back to random move
        if best_move:
            logger.info(f"Strategic move selected: {best_move}, score: {best_score}")
            return best_move
        else:
            random_move = random.choice(valid_moves)
            logger.info(f"No best move found, using random move: {random_move}")
            return random_move
            
    except Exception as e:
        logger.error(f"Error in strategic move calculation: {str(e)}")
        # Fallback to a simpler approach in case of error
        if valid_moves:
            fallback_move = valid_moves[0]
            logger.info(f"Using fallback move due to error: {fallback_move}")
            return fallback_move
        return None

