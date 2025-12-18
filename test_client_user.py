import socketio

sio = socketio.Client()

@sio.event
def connect():
    print("✅ USER connected")
    sio.emit("join", {"username": "user1"})

@sio.on("join_success")
def join_success(data):
    print("🎉 USER join_success:", data)

@sio.on("players_update")
def players_update(data):
    print("👥 USER players_update:", data)

@sio.on("round_started")
def round_started(data):
    print("🟢 USER round_started:", data)

@sio.on("your_word")
def your_word(data):
    print("🟣 USER your_word:", data)  # normalde user1 drawer değilse gelmemeli

sio.connect("http://127.0.0.1:5000")
sio.wait()
