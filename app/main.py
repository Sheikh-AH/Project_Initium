"""Game lobby server with real-time updates."""
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active lobbies and users
lobbies = {}
users = {}

@app.route('/')
def index():
    return render_template('lobby.html')

@socketio.on('connect')
def handle_connect():
    users[request.sid] = {'username': None, 'lobby': None, 'ready': False}
    
@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in users:
        user = users[request.sid]
        if user['lobby']:
            leave_lobby(user['lobby'], request.sid)
        del users[request.sid]

@socketio.on('join_lobby')
def handle_join_lobby(data):
    username = data['username']
    lobby_code = data.get('lobby_code', 'default')
    
    users[request.sid]['username'] = username
    users[request.sid]['lobby'] = lobby_code
    
    if lobby_code not in lobbies:
        lobbies[lobby_code] = {
            'host': request.sid,
            'users': {},
            'game_started': False
        }
    
    lobbies[lobby_code]['users'][request.sid] = {
        'username': username,
        'ready': False,
        'is_host': request.sid == lobbies[lobby_code]['host']
    }
    
    join_room(lobby_code)
    emit('lobby_update', get_lobby_state(lobby_code), room=lobby_code)
    emit('chat_message', {
        'username': 'System',
        'message': f'{username} joined the lobby'
    }, room=lobby_code)

@socketio.on('toggle_ready')
def handle_toggle_ready():
    user = users[request.sid]
    lobby_code = user['lobby']
    
    if lobby_code and lobby_code in lobbies:
        current_ready = lobbies[lobby_code]['users'][request.sid]['ready']
        lobbies[lobby_code]['users'][request.sid]['ready'] = not current_ready
        emit('lobby_update', get_lobby_state(lobby_code), room=lobby_code)

@socketio.on('send_message')
def handle_message(data):
    user = users[request.sid]
    lobby_code = user['lobby']
    
    if lobby_code:
        emit('chat_message', {
            'username': user['username'],
            'message': data['message']
        }, room=lobby_code)

@socketio.on('start_game')
def handle_start_game():
    user = users[request.sid]
    lobby_code = user['lobby']
    
    if lobby_code and lobbies[lobby_code]['host'] == request.sid:
        all_ready = all(u['ready'] or u['is_host'] for u in lobbies[lobby_code]['users'].values())
        if all_ready and len(lobbies[lobby_code]['users']) >= 2:
            lobbies[lobby_code]['game_started'] = True
            emit('game_started', room=lobby_code)

def leave_lobby(lobby_code, sid):
    if lobby_code in lobbies and sid in lobbies[lobby_code]['users']:
        username = lobbies[lobby_code]['users'][sid]['username']
        del lobbies[lobby_code]['users'][sid]
        
        if not lobbies[lobby_code]['users']:
            del lobbies[lobby_code]
        elif lobbies[lobby_code]['host'] == sid:
            new_host = next(iter(lobbies[lobby_code]['users']))
            lobbies[lobby_code]['host'] = new_host
            lobbies[lobby_code]['users'][new_host]['is_host'] = True
        
        leave_room(lobby_code)
        if lobby_code in lobbies:
            emit('lobby_update', get_lobby_state(lobby_code), room=lobby_code)
            emit('chat_message', {
                'username': 'System',
                'message': f'{username} left the lobby'
            }, room=lobby_code)

def get_lobby_state(lobby_code):
    if lobby_code not in lobbies:
        return {}
    return {
        'users': list(lobbies[lobby_code]['users'].values()),
        'lobby_code': lobby_code
    }

if __name__ == "__main__":
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)