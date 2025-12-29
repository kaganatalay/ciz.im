import os
from flask import Flask, jsonify, render_template
from extensions import socketio, game_manager

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-secret-key-change-in-production')

socketio.init_app(app)

import socket_events

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health')
def health():
    return jsonify({
        "status": "running",
        "games": len(game_manager.games)
    })

if __name__ == '__main__':
    port = 5000

    print(f"Starting server on port {port}...")
    socketio.run(app, host='0.0.0.0', debug=True, port=port)
