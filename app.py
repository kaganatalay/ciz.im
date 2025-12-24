from flask import Flask, jsonify, render_template
from flask_socketio import SocketIO
from game_manager import GameManager
from socket_events import *

# 1. Flask ve SocketIO Ayarları
app = Flask(__name__)
app.config['SECRET_KEY'] = 'cok-gizli-anahtar'
socketio = SocketIO(app, cors_allowed_origins="*")

# 2. GLOBAL GAME MANAGER
# Tüm oyunları yönetecek.
game_manager = GameManager()

# 3. Ana Sayfa: Oyun Arayüzü
@app.route('/')
def index():
    return render_template('index.html')

# 4. API Health Check
@app.route('/api/health')
def health():
    return jsonify({
        "status": "running",
        "games": len(game_manager.games)
    })

# 4. Sunucuyu Başlatma
if __name__ == '__main__':
    print("Oyun Sunucusu Başlatılıyor...")
    socketio.run(app, debug=True, port=5000)
