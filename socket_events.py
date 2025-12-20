from flask import request
from flask_socketio import emit

def register_socket_events(socketio, game):
    print("✅ socket events registered")

    @socketio.on("connect")
    def on_connect():
        print("✅ client connected sid =", request.sid)
        emit("server_msg", {"text": "connected"})

    @socketio.on("join")
    def on_join(data):
        username = (data or {}).get("username", "").strip()

        if not username:
            emit("join_error", {"error": "username required"})
            return

        # username unique olsun (GameState içinde yok, burada kontrol ediyoruz)
        existing_usernames = {p.username for p in game.players.values()}
        if username in existing_usernames:
            emit("join_error", {"error": "username already taken"})
            return

        player = game.add_player(request.sid, username)

        # sadece join olan kişiye
        emit("join_success", {
            "username": player.username,
            "is_admin": player.is_admin
        })

        # herkese güncel liste
        emit("players_update", {"players": game.get_all_players()}, broadcast=True)

    @socketio.on("start_game")
    def on_start_game():
        # 1) Başlatan kişi kayıtlı mı?
        if request.sid not in game.players:
            emit("start_error", {"error": "not joined"})
            return

        starter = game.players[request.sid]

        # 2) Admin mi?
        if not starter.is_admin:
            emit("start_error", {"error": "only admin can start"})
            return

        # 3) Yeni tur başlat
        round_info = game.start_new_round()
        if not round_info:
            emit("start_error", {"error": "need at least 2 players"})
            return

        # 4) Herkese: tur başladı, çizen kim?
        emit("round_started", {"drawer": round_info["drawer"]}, broadcast=True)

        # 5) Sadece çizene: kelime
        emit("your_word", {"word": round_info["word"]}, to=round_info["drawer_id"])

    @socketio.on("draw")
    def on_draw(data):
        # Oyun aktif değilse çizimi yok say
        if not game.is_game_active:
            return

        # Gönderen drawer mı?
        if not game.current_drawer:
            return

        if request.sid != game.current_drawer.session_id:
            # Drawer olmayan biri çizemez
            return

        # data örn: { "x": 10, "y": 20, "type": "move" }
        # Çizimi diğer herkese gönder (drawer hariç)
        emit("draw", data, broadcast=True, include_self=False)
