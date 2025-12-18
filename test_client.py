import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("✅ connected")
    sio.emit("join", {"username": "burak"})

@sio.on("join_success")
def on_join_success(data):
    print("🎉 join_success:", data)

@sio.on("join_error")
def on_join_error(data):
    print("❌ join_error:", data)

@sio.on("players_update")
def on_players_update(data):
    print("👥 players_update:", data)

sio.connect("http://127.0.0.1:5000")
time.sleep(3)
sio.disconnect()
