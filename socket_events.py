from flask import request
from flask_socketio import emit, join_room, leave_room
from extensions import socketio, game_manager

print("Socket events module loaded")

@socketio.on('connect')
def connect():
    print(f"User connected with sid: {request.sid}")

@socketio.on('create_game')
def create_game():
    sid = request.sid
    print(f"Create game for sid: {sid}")
    game_id = game_manager.create_game()
    join_room(game_id, sid)
    emit('game_created', {'game_id': game_id}, room=sid)
    print(f"Emitted game_created with {game_id}")

@socketio.on('join_game')
def join_game(data):
    sid = request.sid
    game_id = data['game_id'].upper()
    username = data['username']
    game = game_manager.get_game(game_id)
    if not game:
        emit('error', {'message': 'Game not found'}, room=sid)
        return
    if sid in game.players:
        emit('error', {'message': 'Already in game'}, room=sid)
        return
    player = game.add_player(sid, username)
    join_room(game_id, sid)
    emit('game_joined', {
        'player': player.to_dict(),
        'is_admin': player.is_admin,
        'players': game.get_all_players()
    }, room=sid)
    socketio.emit('update_players', {'players': game.get_all_players()}, room=game_id, skip_sid=sid)

@socketio.on('start_game')
def start_game(data):
    sid = request.sid
    game_id = data['game_id'].upper()
    game = game_manager.get_game(game_id)
    if not game or sid not in game.players or not game.players[sid].is_admin:
        return
    round_data = game.start_new_round()
    if not round_data:
        emit('error', {'message': 'Not enough players'}, room=sid)
        return
    socketio.emit('game_started', round_data, room=game_id)

@socketio.on('guess')
def guess(data):
    sid = request.sid
    game_id = data['game_id'].upper()
    message = data['message']
    game = game_manager.get_game(game_id)
    if not game or sid not in game.players:
        return
    player = game.players[sid]
    result = game.process_guess(sid, message)
    if result:
        if result['type'] == 'CHAT_MESSAGE':
            socketio.emit('message', {'message': f"{player.username}: {message}"}, room=game_id)
        elif result['type'] == 'CORRECT_GUESS':
            socketio.emit('correct_guess', {'player_name': result['player_name']}, room=game_id)
            if result['round_over']:
                # For basic, just show popup
                pass

@socketio.on('draw_start')
def draw_start(data):
    sid = request.sid
    game_id = data['game_id'].upper()
    x = data['x']
    y = data['y']
    socketio.emit('draw_start', {'x': x, 'y': y}, room=game_id, skip_sid=sid)

@socketio.on('draw_line')
def draw_line(data):
    sid = request.sid
    game_id = data['game_id'].upper()
    x = data['x']
    y = data['y']
    socketio.emit('draw_line', {'x': x, 'y': y}, room=game_id, skip_sid=sid)

@socketio.on('disconnect')
def disconnect():
    sid = request.sid
    # Remove from all games
    games_to_check = list(game_manager.games.values())
    for game in games_to_check:
        if sid in game.players:
            game.remove_player(sid)
            socketio.emit('update_players', {'players': game.get_all_players()}, room=game.game_id)
            if len(game.players) == 0:
                game_manager.delete_game(game.game_id)
