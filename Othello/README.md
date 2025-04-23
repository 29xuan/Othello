# web-based implementation of  Othello

## Overview

`Othello` is an interactive web-based implementation of the Othello board game. This application allows players to compete against a simple AI opponent through an intuitive browser interface. The game follows standard Othello rules and provides a clean, responsive gaming experience.

## Features

- Web-based interface built with Flask
- Responsive user interface
- Player vs. AI gameplay
- Interactive game board with valid move highlighting
- Real-time game state tracking
- Score tracking and winner determination

## Repository Structure

```
Othello/
├── main.py              # Application entry point
├── flask_app.py         # Flask web application routes and API endpoints
├── game_logic.py        # Core Othello game mechanics and state management
├── ai.py                # AI opponent implementation
├── static/              # Frontend assets
│   ├── othello.js       # Game frontend logic
│   └── othello.css      # Game styling
├── templates/           # HTML templates
│   └── index.html       # Main game interface
└── README.md            # This file
```

## Getting Started

### Prerequisites

- Python 3.6+
- Flask
- NumPy

### Running the Code

1. Install required Python dependencies:

```bash
pip install flask numpy
```

2. Clone or download the project code:

```bash
git clone https://github.com/29xuan/Othello.git
cd Othello
```

3. Run the game:

```bash
python main.py
```

4. Access the game in your browser at: `http://localhost:5000`

## Game Rules

Othello is played according to these standard rules:

- **Rule 1**: Players take turns placing discs (black or white)
- **Rule 2:** A valid move must flip at least one opponent disc
- **Rule 3:** Flipped discs are sandwiched between your new disc and existing disc
- **Rule 4:** Game ends when no valid moves or board is full
- **Rule 5:** The player with more discs wins

## Acknowledgements

- [Flask Web Framework](https://flask.palletsprojects.com/) - Lightweight Python web framework
- [Othello/Reversi](https://en.wikipedia.org/wiki/Reversi) - Classic board game concept and rules 