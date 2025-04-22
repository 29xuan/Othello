import time
from flask import Flask, jsonify, request, render_template, send_from_directory
from othello import OthelloGame, OthelloBoard, OthelloAI
from z3_solver import Z3Solver, Z3HeuristicSolver

app = Flask(__name__)

# Constants for players
BLACK = 1
WHITE = 2

def create_game_from_state(board_size, board_state):
    """Create an OthelloGame instance from a given board state and size"""
    board = OthelloBoard(size=board_size)
    board.set_board_state(board_state)
    game = OthelloGame(board)
    return game

@app.route('/get_ai_move', methods=['POST'])
def get_ai_move():
    try:
        data = request.get_json()
        board_size = data.get('board_size', 8)
        board_state = data.get('board_state', [])
        player = data.get('player', BLACK)
        difficulty = data.get('difficulty', 'easy')
        
        game = create_game_from_state(board_size, board_state)
        
        start_time = time.time()
        
        if difficulty == 'hard' and board_size == 4:
            solver = Z3Solver(game, player)
            move, analysis_data = solver.get_move_with_analysis()
            analysis_data['elapsed_time'] = round(time.time() - start_time, 2)
            
            return jsonify({
                'move': move,
                'analysis': analysis_data
            })
        else:
            # For other difficulties or board sizes, use standard AI
            ai = OthelloAI(game, player)
            
            if difficulty == 'easy':
                move = ai.get_move_random()
            elif difficulty == 'medium':
                move = ai.get_move_greedy()
            else:  # Hard but not 4x4
                move = ai.get_move_minimax()
                
            elapsed_time = round(time.time() - start_time, 2)
            
            analysis_data = {
                'solver_type': f'{difficulty.capitalize()} AI',
                'elapsed_time': elapsed_time,
                'best_move': move
            }
            
            return jsonify({
                'move': move,
                'analysis': analysis_data
            })
            
    except Exception as e:
        app.logger.error(f"Error in get_ai_move: {str(e)}")
        return jsonify({'error': str(e)}), 500 