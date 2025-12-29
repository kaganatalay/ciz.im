from flask import request
from flask_socketio import emit, join_room, leave_room
from extensions import socketio, game_manager
from models import Player

@socketio.on('connect')
def connect():
    # User connected - no action needed
    pass

@socketio.on('join_game')
def join_game(data):
    sid = getattr(request, 'sid')
    game_id = data['game_id'].upper()
    username = data['username']

    player = Player(sid, username)

    game = game_manager.get_game(game_id)
    if (game is None):
        game = game_manager.create_game()
        player.is_admin = True

    if player.session_id in game.players:
        emit('error', {'message': 'Already in game'}, to=player.session_id)
        return
    
    game.add_player(player)
    join_room(game.id, sid)

    emit('game_joined', {
        'game_id': game.id,
        'you': player.to_dict(),
        'players': game.get_all_players()
    }, to=sid)
    socketio.emit('update_players', {'players': game.get_all_players()}, to=game_id, skip_sid=sid)

@socketio.on('start_game')
def start_game(data):
    sid = getattr(request, 'sid')
    game_id = data['game_id'].upper()
    game = game_manager.get_game(game_id)
    
    # Validation: Only admin can start
    if not game or sid not in game.players or not game.players[sid].is_admin:
        return
        
    round_data = game.start_new_round()
    if not round_data:
        emit('error', {'message': 'Need at least 2 players!'}, to=sid)
        return

    # 1. Send REAL word to Drawer
    drawer_sid = round_data['drawer_id']
    socketio.emit('game_started', round_data, to=drawer_sid)

    # 2. Send MASKED word to Guessers
    guesser_data = round_data.copy()
    guesser_data['word'] = "_ " * len(round_data['word'])
    socketio.emit('game_started', guesser_data, to=game_id, skip_sid=drawer_sid)

@socketio.on('guess')
def guess(data):
    sid = getattr(request, 'sid')
    game_id = data['game_id'].upper()
    message = data['message']
    game = game_manager.get_game(game_id)
    
    if not game: return

    result = game.process_guess(sid, message)
    if result:
        if result['type'] == 'CHAT_MESSAGE':
            socketio.emit('message', {'message': f"{game.players[sid].username}: {message}"}, to=game_id)
        elif result['type'] == 'ROUND_WIN':
            socketio.emit('round_end', {
                'winner': result['winner'],
                'word': result['word']
            }, to=game_id)

@socketio.on('draw_start')
def draw_start(data):
    sid = getattr(request, 'sid')
    game_id = data['game_id'].upper()
    x = data['x']
    y = data['y']
    socketio.emit('draw_start', {'x': x, 'y': y}, to=game_id, skip_sid=sid)

@socketio.on('draw_line')
def draw_line(data):
    sid = getattr(request, 'sid')
    game_id = data['game_id'].upper()
    x = data['x']
    y = data['y']
    socketio.emit('draw_line', {'x': x, 'y': y}, to=game_id, skip_sid=sid)

@socketio.on('disconnect')
def disconnect():
    sid = getattr(request, 'sid')
    # Remove from all games
    games_to_check = list(game_manager.games.values())
    for game in games_to_check:
        if sid in game.players:
            game.remove_player(sid)
            socketio.emit('update_players', {'players': game.get_all_players()}, to=game.id)
            if len(game.players) == 0:
                game_manager.delete_game(game.id)