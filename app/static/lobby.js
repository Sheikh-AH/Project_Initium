const socket = io();

let currentUsername = '';
let currentLobbyCode = '';
let isHost = false;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const usernameInput = document.getElementById('username-input');
const lobbyCodeInput = document.getElementById('lobby-code-input');
const joinBtn = document.getElementById('join-btn');
const playersList = document.getElementById('players-list');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const readyBtn = document.getElementById('ready-btn');
const startBtn = document.getElementById('start-btn');
const lobbyCodeDisplay = document.getElementById('lobby-code-display');

// Join lobby
joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const lobbyCode = lobbyCodeInput.value.trim() || 'default';
    
    if (username) {
        currentUsername = username;
        currentLobbyCode = lobbyCode;
        
        socket.emit('join_lobby', {
            username: username,
            lobby_code: lobbyCode
        });
        
        loginScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');
        lobbyCodeDisplay.textContent = lobbyCode;
    }
});

// Enter key for username
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinBtn.click();
    }
});

lobbyCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinBtn.click();
    }
});

// Toggle ready status
readyBtn.addEventListener('click', () => {
    socket.emit('toggle_ready');
});

// Start game
startBtn.addEventListener('click', () => {
    socket.emit('start_game');
});

// Send chat message
function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('send_message', { message: message });
        chatInput.value = '';
    }
}

sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Socket event handlers
socket.on('lobby_update', (data) => {
    updatePlayersList(data.users);
});

socket.on('chat_message', (data) => {
    addChatMessage(data.username, data.message);
});

socket.on('game_started', () => {
    addChatMessage('System', 'Game is starting!');
    // Here you would transition to the actual game
    setTimeout(() => {
        alert('Game would start here! Implement your game logic.');
    }, 1000);
});

// Update players list
function updatePlayersList(users) {
    playersList.innerHTML = '';
    
    users.forEach(user => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        
        const playerName = document.createElement('span');
        playerName.className = 'player-name';
        playerName.textContent = user.username;
        
        playerInfo.appendChild(playerName);
        
        if (user.is_host) {
            const badge = document.createElement('span');
            badge.className = 'player-badge';
            badge.textContent = 'HOST';
            playerInfo.appendChild(badge);
            
            if (user.username === currentUsername) {
                isHost = true;
                startBtn.classList.remove('hidden');
            }
        }
        
        const status = document.createElement('span');
        status.className = `player-status ${user.ready ? 'ready' : 'not-ready'}`;
        status.textContent = user.ready ? 'Ready' : 'Not Ready';
        
        if (user.username === currentUsername && user.ready) {
            readyBtn.textContent = 'Unready';
            readyBtn.classList.add('ready');
        } else if (user.username === currentUsername) {
            readyBtn.textContent = 'Ready';
            readyBtn.classList.remove('ready');
        }
        
        playerCard.appendChild(playerInfo);
        playerCard.appendChild(status);
        playersList.appendChild(playerCard);
    });
    
    // Enable start button if all players are ready
    if (isHost) {
        const allReady = users.every(u => u.ready || u.is_host);
        startBtn.disabled = !allReady || users.length < 2;
    }
}

// Add chat message
function addChatMessage(username, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = username === 'System' ? 'chat-message system' : 'chat-message';
    
    if (username === 'System') {
        messageDiv.textContent = message;
    } else {
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'chat-username';
        usernameSpan.textContent = username + ':';
        
        const messageText = document.createTextNode(' ' + message);
        
        messageDiv.appendChild(usernameSpan);
        messageDiv.appendChild(messageText);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
