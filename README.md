# 🎨 ciz.im

A real-time multiplayer drawing and guessing game built with **Python (Flask)** and **Socket.IO**. Players take turns drawing words while others guess in the chat, similar to **Gartic.io**.

## Features

- **Real-time Drawing**: Live canvas syncing across all players
- **Multiplayer**: Create private rooms or join existing ones via a Game ID
- **Chat System**: Integrated chat for guessing words and talking

## Running Locally

### Prerequisites

- Docker
- uv

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/kaganatalay/ciz.im.git
   cd ciz.im
   ```

2. **Start the application**

   ```bash
   docker compose up --build -d
   ```

3. **Play**

   Open your browser and navigate to:

   - `http://localhost`

## Game Rules

- **Start**: Create a new game or join one with a code
- **Draw**: One player is chosen to draw a specific word
- **Guess**: Other players guess the word in the chat box
- **Win**: Points are awarded for correct guesses. The round ends when someone guesses correctly

## Project Structure

- `app.py` – Application entry point
- `src/models.py` – Game logic (Player and Game classes)
- `src/socket_events.py` – Handles real-time communication
- `src/game_manager.py` - Helper class to create, delete and retrieve games
- `static/*` - Frontend stylesheet and javascript
- `templates/index.html` - Frontend HTML
- `pyproject.toml` – Project configuration and dependencies

## License

Created for the **SEN4015 (Advanced Programming with Python)** coursework.
