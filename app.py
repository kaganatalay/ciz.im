from flask import Flask, jsonify
from flask_socketio import SocketIO
from game_state import GameState
print("✅ app.py loaded")
from socket_events import register_socket_events

print("✅ imported register_socket_events")

# 1. Flask ve SocketIO Ayarları
app = Flask(__name__)
app.config['SECRET_KEY'] = 'cok-gizli-anahtar'
socketio = SocketIO(app, cors_allowed_origins="*")

# 2. GLOBAL OYUN NESNESİ (Singleton)
# Tüm oyun verisi burada tutulacak.
# Person B (Socket'çi arkadaş) bu değişkeni import edip kullanacak.
game = GameState()

print("✅ before register_socket_events")
register_socket_events(socketio, game)
print("✅ after register_socket_events")


# 3. Basit bir Health Check (Sunucu ayakta mı?)
@app.route('/')
def index():
    return jsonify({
        "status": "running",
        "players": len(game.players),
        "game_active": game.is_game_active
    })

# 4. Sunucuyu Başlatma
if __name__ == '__main__':
    # Burası çok önemli: Socket eventlerini (Person B'nin kodu) burada import edeceğiz
    # Böylece sunucu kalkarken eventleri de yüklemiş olacak.
    # from socket_events import * print("Oyun Sunucusu Başlatılıyor...")
    socketio.run(app, debug=True, port=5000)