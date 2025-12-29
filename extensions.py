from flask_socketio import SocketIO
from game_manager import GameManager

socketio = SocketIO(cors_allowed_origins="*")
game_manager = GameManager()
