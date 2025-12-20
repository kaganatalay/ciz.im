import socketio
import threading

my_username = "admin"


sio = socketio.Client()

def wait_for_enter_and_start():
    input("🟡 ENTER'a basınca start_game gönderilecek...\n")
    print("🚀 ADMIN sending start_game")
    sio.emit("start_game")

@sio.event
def connect():
    print("✅ ADMIN connected")
    sio.emit("join", {"username": "admin"})

@sio.on("join_success")
def join_success(data):
    print("🎉 ADMIN join_success:", data)
    # Artık otomatik start yok. ENTER bekleyen thread başlatıyoruz.
    t = threading.Thread(target=wait_for_enter_and_start, daemon=True)
    t.start()

@sio.on("players_update")
def players_update(data):
    print("👥 ADMIN players_update:", data)

@sio.on("start_error")
def start_error(data):
    print("❌ ADMIN start_error:", data)

@sio.on("round_started")
def round_started(data):
    print("🟢 ADMIN round_started:", data)

    if data.get("drawer") == my_username:
        print("✏️ ADMIN is drawer, sending draw events...")
        sio.emit("draw", {"x": 10, "y": 10, "type": "start"})
        sio.emit("draw", {"x": 20, "y": 20, "type": "move"})
        sio.emit("draw", {"x": 30, "y": 30, "type": "end"})
    else:
        print("👀 ADMIN is viewer")

@sio.on("draw")
def on_draw(data):
    print("🎨 ADMIN received draw:", data)


@sio.on("your_word")
def your_word(data):
    print("🟣 ADMIN your_word:", data)

sio.connect("http://127.0.0.1:5000")
sio.wait()
