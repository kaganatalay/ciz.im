import socketio

my_username = "user2"


sio = socketio.Client()

@sio.event
def connect():
    print("✅ USER connected")
    sio.emit("join", {"username": "user2"})

@sio.on("join_success")
def join_success(data):
    print("🎉 USER join_success:", data)

@sio.on("players_update")
def players_update(data):
    print("👥 USER players_update:", data)

@sio.on("round_started")
def round_started(data):
    print("🟢 USER round_started:", data)

    if data.get("drawer") == my_username:
        print("✏️ USER is drawer, sending draw events...")
        sio.emit("draw", {"x": 100, "y": 100, "type": "start"})
        sio.emit("draw", {"x": 120, "y": 120, "type": "move"})
        sio.emit("draw", {"x": 140, "y": 140, "type": "end"})
    else:
        print("👀 USER is viewer")

@sio.on("draw")
def on_draw(data):
    print("🎨 USER received draw:", data)



@sio.on("your_word")
def your_word(data):
    print("🟣 USER your_word:", data)  # normalde user1 drawer değilse gelmemeli

sio.connect("http://127.0.0.1:5000")
sio.wait()
