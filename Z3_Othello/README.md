# Z3-based Specification Verifier for Othello Game

## Overview

Z3_Othello is an interactive Othello game that integrates the Z3 to perform formal verification of game rules. Players can compete against a simple AI opponent while observing real-time verification of game mechanics.

## Features

- Web-based interface built with Flask
- Formal verification of game rules using Z3 
- Responsive user interface
- Player vs. AI gameplay
- Real-time verification visualization
- Interactive game board with valid move highlighting

## Repository Structure

```
Z3_Othello/
├── main.py              # Application entry point
├── flask_app.py         # Flask web application routes and API endpoints
├── game_logic.py        # Core Othello game mechanics and state management
├── verification.py      # Z3-based formal verification implementation
├── ai.py                # AI opponent implementation
├── static/                 # Frontend assets
│   ├── othello.js          # Game frontend logic
│   └── othello.css         # Game styling
├── templates/              # HTML templates
│   └── index.html          # Main game interface
└── README.md               # This file
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
pip install flask numpy z3-solver
```

2. Clone or download the project code:

```bash
git clone https://github.com/29xuan/Othello.git
cd Z3_Othello
```

3. Run the game:

```bash
python main.py
```

4. Access the game in your browser at: `http://localhost:5000`

## Formal Verification

This project leverages the Z3 theorem prover to implement formal verification of Othello game rules through five key specifications:

- **Board Consistency**: Each cell contains exactly one state (empty, black, or white).
- **Fairness**: Both players alternate turns and have equal opportunities to place.
- **Legal Move**: Ensures each move follows Othello rules by validating empty cell placement and opponent piece flipping.
- **Termination**: Game ends when no valid moves or board is full
- **Winner Determination**: The player with more discs wins.

## Enhancements Over Base Othello

Compared to the base Othello implementation (`Othello`), `Z3_Othello` adds:

- **Formal Verification**: Integration of Z3 to mathematically verify game rules
- **Verification Visualization**: Interactive panel showing verification results

## Acknowledgements

- [Z3 Theorem Prover](https://github.com/Z3Prover/z3) - Microsoft Research's constraint solver
- [Flask Web Framework](https://flask.palletsprojects.com/) - Lightweight Python web framework
- [Othello/Reversi](https://en.wikipedia.org/wiki/Reversi) - Classic board game concept and rules 
- [ChatGPT](https://chat.openai.com) - Assisted with syntax understanding and debugging
