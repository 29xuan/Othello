# Z3-based Othello Solver with Strategic Analysis in the 8X8 Board

## Overview

`Z3_Othello_solver_8*8_Multistep` is an enhanced version of the Othello game that integrates the Z3 to not only verify specifications but also to provide strategic move recommendations. This application features an 8X8 game board where players can compete against an AI with adjustable difficulty levels while receiving detailed analysis and hints for optimal moves based on formal verification techniques.

## Features

- Web-based interface built with Flask
- Formal verification of game rules using Z3 
- Advanced move recommendation system powered by Z3 constraint solving
- Multiple AI difficulty levels (easy/hard)
- Detailed strategic analysis of board positions

## Repository Structure

```
Z3_Othello_solver_8*8/
├── main.py              # Application entry point
├── flask_app.py         # Flask web application routes and API endpoints
├── game_logic.py        # Core Othello game mechanics and state management
├── verification.py      # Z3-based formal verification implementation
├── z3_solver.py         # Advanced Z3 solver for move recommendations
├── ai.py                # AI opponent implementation with difficulty levels
├── requirements.txt     # Project dependencies
├── static/              # Frontend assets
│   ├── othello.js       # Game frontend logic and solver integration
│   └── othello.css      # Game styling and responsive design
├── templates/           # HTML templates
│   └── index.html       # Main game interface
└── README.md            # This file
```

## Getting Started

### Prerequisites

- Python 3.6+
- Flask
- Z3 Solver
- NumPy

### Running the Code

1. Install required Python dependencies:

```bash
pip install -r requirements.txt
```

2. Clone or download the project code:

```bash
git clone https://github.com/29xuan/Othello.git
cd Z3_Othello_solver_8*8
```

3. Run the game:

```bash
python main.py
```

4. Access the game in your browser at: `http://localhost:5000`

## Formal Verification

This project leverages the Z3 to implement formal verification of Othello game rules through five key specifications:

- **Board Consistency**: Each cell contains exactly one state (empty, black, or white).
- **Fairness**: Both players alternate turns and have equal opportunities to place.
- **Legal Move**: Ensures each move follows Othello rules by validating empty cell placement and opponent piece flipping.
- **Termination**: Game ends when no valid moves or board is full.
- **Winner Determination**: The player with more discs wins.

## Strategic Move Recommendation

### Advanced Z3 Solving Architecture

The Z3-based move recommendation system employs a sophisticated constraint-solving approach combined with multi-step lookahead analysis:

- **Symbolic Board Representation**: Encodes the 8×8 Othello board as a system of symbolic variables and constraints.
- **Multi-step Lookahead**: Default search depth of 6 moves, dynamically adjusted based on game stage:
  - Early game (moves 1-15): 4-5 moves depth for faster response
  - Mid game (moves 16-45): Standard 6 moves depth
  - Late game (moves 46-60): 6-8 moves depth for higher precision
- **Time-Managed Solving**: Real-time processing with adaptive timeout management, typically taking 500-2000ms per analysis.
- **Alpha-Beta Pruning**: Advanced search space optimization to enable deeper lookahead analysis.

### Comprehensive Strategic Evaluation

The solver evaluates potential moves using a sophisticated weighted factor system:

#### Position Value Assessment
- **Static Position Matrix**: Carefully calibrated position weights with:
  - Corners (100): Highest value, cannot be flipped once captured
  - Near-corner (-25, -10): Dangerous positions that may give opponent access to corners
  - Edges (8, 6): More stable than center positions
  - Center (1): Basic value positions, easily flipped

#### Dynamic Game Stage Adaptation

Weights for evaluation factors automatically adjust through game progression:

**Early Game Strategy (moves 1-15)**
- Mobility: 3.0× weight (highest priority)
- Position Value: 2.5× weight
- Piece Count: 0.5× weight (lowest priority)
- Focuses on: Securing strategic positions, maintaining flexibility, avoiding dangerous near-corner positions

**Mid Game Strategy (moves 16-45)**
- Position Value: 2.0× weight
- Mobility: 1.5× weight
- Stable Pieces: 1.5× weight
- Piece Count: 1.0× weight
- Focuses on: Balancing position control with piece acquisition, building stable disc chains

**Late Game Strategy (moves 46-60)**
- Piece Count: 3.0× weight (highest priority)
- Endgame Calculation: 2.0× weight
- Position Value: 1.0× weight
- Mobility: 0.5× weight (lowest priority)
- Focuses on: Maximizing final disc count, blocking opponent counterplay opportunities

### Advanced Strategic Considerations

- **Stability Analysis**: Identifies and prioritizes stable discs (pieces that cannot be flipped)
- **Frontier Management**: Minimizes vulnerable frontier pieces early, sacrifices when advantageous later
- **Parity Control**: Strategic management of odd/even empty squares to control the final move
- **Corner Control Strategy**: Highest priority to securing corners and building corner-connected stable regions
- **Trap Detection**: Identifies and either sets or avoids multi-step traps based on position

## Enhancements Over Base `Z3_Othello_8*8`

Compared to the base `Z3_Othello` implementation, this version adds:

- **Strategic Move Recommendations**: Advanced Z3-based analysis to recommend optimal moves
- **Detailed Move Explanations**: In-depth explanations of why certain moves are recommended
- **Variable AI Difficulty**: Adjustable AI opponent difficulty levels
- **Enhanced UI**: More detailed visualization of game state and analysis

## Acknowledgements

- [Z3 Theorem Prover](https://github.com/Z3Prover/z3) - Microsoft Research's constraint solver
- [Flask Web Framework](https://flask.palletsprojects.com/) - Lightweight Python web framework
- [Othello/Reversi](https://en.wikipedia.org/wiki/Reversi) - Classic board game concept and rules
- [ChatGPT](https://chat.openai.com) - Assisted with syntax understanding and debugging