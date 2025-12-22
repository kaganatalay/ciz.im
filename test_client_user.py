import socketio
import threading

sio = socketio.Client()
my_username = "user1"

def guess_loop():
    while True:
        text = input("💬 USER guess yaz (enter): ").strip()
        if text:
            sio.emit("guess", {"text": text})

@sio.event
def connect():
    print("✅ USER connected")
    sio.emit("join", {"username": my_username})

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
        print("✏️ USER is drawer (guess yazma)")
    else:
        print("👀 USER is viewer (guess yazabilirsin)")
        threading.Thread(target=guess_loop, daemon=True).start()

@sio.on("your_word")
def your_word(data):
    print("🟣 USER your_word:", data)  # test için kelimeyi görür

@sio.on("chat_message")
def chat_message(data):
    print("💬 CHAT:", data)

@sio.on("guess_feedback")
def guess_feedback(data):
    print("ℹ️ guess_feedback:", data)

@sio.on("correct_guess")
def correct_guess(data):
    print("✅ correct_guess:", data)

@sio.on("round_over")
def round_over(data):
    print("🏁 round_over:", data)
    
@sio.on("server_notice")
def server_notice(data):
    print("📢 NOTICE:", data)


sio.connect("http://127.0.0.1:5000")
sio.wait()
