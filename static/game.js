const socket = io();

// --- State Variables ---
let mySessionId = null; // My unique player ID (pid)
let currentGameId = null; // The Room Code
let currentDrawerId = null;
let isDrawing = false; // Mouse/Touch down state

// --- DOM Elements ---
const screens = {
  login: document.getElementById("login-screen"),
  lobby: document.getElementById("lobby-screen"),
  game: document.getElementById("game-screen"),
};
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const messagesDiv = document.getElementById("messages");

// --- Navigation ---
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  if (name === "game") resizeCanvas();
}

// --- Socket Event Listeners ---

socket.on("connect", () => {
  console.log("Connected to server");
});

// 1. Join & Lobby
socket.on("game_joined", (data) => {
  mySessionId = data.you.pid; // Store my ID
  currentGameId = data.game_id;

  // Update Lobby UI
  document.getElementById("lobby-room-code").innerText = currentGameId;
  updateLobbyList(data.players);
  showScreen("lobby");
});

socket.on("update_players", (data) => {
  updateLobbyList(data.players);
});

socket.on("error", (data) => {
  alert(data.message);
});

// 2. Admin Left / Game Closed
socket.on("game_closed", (data) => {
  alert(data.message);
  resetGame();
});

// 3. Game Logic
socket.on("game_started", (data) => {
  currentDrawerId = data.drawer_id;
  const amIDrawing = mySessionId === currentDrawerId;

  // Update Top Bar
  const secretWordEl = document.getElementById("secret-word");
  const roleTextEl = document.getElementById("role-text");

  secretWordEl.innerText = data.word;

  if (amIDrawing) {
    roleTextEl.innerText = "✏️ It's your turn to draw!";
    roleTextEl.style.color = "#22c55e"; // Green
    secretWordEl.style.color = "#22c55e";
    document.getElementById("canvas-container").classList.remove("locked");
  } else {
    roleTextEl.innerText = `👀 Guess what ${data.drawer} is drawing`;
    roleTextEl.style.color = "#a1a1aa"; // Gray
    secretWordEl.style.color = "#ffffff";
    document.getElementById("canvas-container").classList.add("locked");
  }

  // Reset Game State
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  messagesDiv.innerHTML = "";
  addMessage("Game started!", "msg-system");

  showScreen("game");
});

socket.on("round_end", (data) => {
  // Show Overlay
  document.getElementById("overlay-title").innerText = "ROUND OVER!";
  document.getElementById(
    "overlay-msg"
  ).innerText = `${data.winner} guessed correctly!`;
  document.getElementById("overlay-word-reveal").innerText = data.word;

  overlay.classList.remove("hidden");
});

socket.on("message", (data) => addMessage(data.message, "msg-chat"));

// 4. Drawing Events
socket.on("draw_start", (data) => drawRemote(data.x, data.y, "start"));
socket.on("draw_line", (data) => drawRemote(data.x, data.y, "line"));

// --- User Actions ---

function joinGame() {
  const username = document.getElementById("username").value.trim();
  const gameId = document.getElementById("gameId").value.trim();

  if (!username || !gameId) return alert("Please enter name and room code");

  socket.emit("join_game", { username, game_id: gameId });
}

function startGame() {
  socket.emit("start_game", { game_id: currentGameId });
}

function leaveGame() {
  if (!confirm("Leave the room?")) return;
  socket.emit("leave_game", { game_id: currentGameId });
  resetGame();
}

function resetGame() {
  currentGameId = null;
  mySessionId = null;
  currentDrawerId = null;
  isDrawing = false;
  document.getElementById("player-list").innerHTML = "";
  overlay.classList.add("hidden");
  showScreen("login");
}

function closeOverlay() {
  overlay.classList.add("hidden");
  // Return to lobby to wait for next round
  showScreen("lobby");
}

function sendGuess(e) {
  e.preventDefault();
  // Prevent drawers from chatting (spoiling)
  if (mySessionId === currentDrawerId) return;

  const input = document.getElementById("guess-input");
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("guess", { game_id: currentGameId, message: msg });
  input.value = "";
}

// --- Helper Functions ---

function updateLobbyList(players) {
  const list = document.getElementById("player-list");
  list.innerHTML = "";

  let amIAdmin = false;

  // Check if I am admin based on PID
  players.forEach((p) => {
    if (p.pid === mySessionId && p.is_admin) {
      amIAdmin = true;
    }
  });

  // Toggle Start Button
  const btn = document.getElementById("btn-start-game");
  const msg = document.getElementById("waiting-msg");

  if (amIAdmin) {
    btn.style.display = "block";
    msg.style.display = "none";
  } else {
    btn.style.display = "none";
    msg.style.display = "block";
  }

  // Render Players
  players.forEach((p) => {
    const div = document.createElement("div");
    div.className = "player-card";
    div.innerHTML = `
            <span>${p.username} ${p.pid === mySessionId ? "(You)" : ""}</span>
            ${p.is_admin ? '<span class="admin-badge">👑</span>' : ""}
        `;
    list.appendChild(div);
  });
}

function addMessage(text, type = "msg-chat") {
  const div = document.createElement("div");
  div.className = type;
  div.innerText = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Canvas & Drawing Logic ---

function resizeCanvas() {
  const container = document.getElementById("canvas-container");
  if (container) {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
}
window.addEventListener("resize", resizeCanvas);

// Normalize coordinates for mobile/desktop
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;

  return {
    x: cx - rect.left,
    y: cy - rect.top,
    normX: (cx - rect.left) / canvas.width,
    normY: (cy - rect.top) / canvas.height,
  };
}

function startDraw(e) {
  if (mySessionId !== currentDrawerId) return; // Permission check
  isDrawing = true;
  const p = getPos(e);

  localDraw(p.x, p.y, "start");
  socket.emit("draw_start", { game_id: currentGameId, x: p.normX, y: p.normY });
}

function moveDraw(e) {
  if (!isDrawing || mySessionId !== currentDrawerId) return;

  // Prevent scrolling on mobile while drawing
  if (e.cancelable) e.preventDefault();

  const p = getPos(e);
  localDraw(p.x, p.y, "line");
  socket.emit("draw_line", { game_id: currentGameId, x: p.normX, y: p.normY });
}

function stopDraw() {
  isDrawing = false;
}

// Actual Canvas Drawing
function localDraw(x, y, type) {
  if (type === "start") {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
  } else {
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

// Remote Drawing (Convert normalized back to pixels)
function drawRemote(normX, normY, type) {
  localDraw(normX * canvas.width, normY * canvas.height, type);
}

// Event Listeners (Mouse & Touch)
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", moveDraw);
canvas.addEventListener("mouseup", stopDraw);
canvas.addEventListener("mouseout", stopDraw);

// Passive: false is crucial for preventing scroll on touchmove
canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", moveDraw, { passive: false });
canvas.addEventListener("touchend", stopDraw);
