const socket = io();

// State
let mySessionId = null;
let currentGameId = null;
let currentDrawerId = null;
let isDrawing = false;

// Elements
const screens = {
  login: document.getElementById("login-screen"),
  lobby: document.getElementById("lobby-screen"),
  game: document.getElementById("game-screen"),
};
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");

// --- Navigation ---
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  if (name === "game") resizeCanvas();
}

// --- Socket Events ---
socket.on("connect", () => console.log("Connected"));

// 1. Join & Lobby Updates
socket.on("game_joined", (data) => {
  mySessionId = data.you.session_id;
  currentGameId = data.game_id;

  // Update Lobby UI
  document.getElementById("lobby-room-code").innerText = currentGameId;
  updateLobbyList(data.players);
  showScreen("lobby");
});

socket.on("update_players", (data) => {
  updateLobbyList(data.players);
});

// 2. Game Start
socket.on("game_started", (data) => {
  currentDrawerId = data.drawer_id;
  const amIDrawing = mySessionId === currentDrawerId;

  // Setup UI
  document.getElementById("secret-word").innerText = data.word;
  document.getElementById("role-text").innerText = amIDrawing
    ? "✏️ IT'S YOUR TURN TO DRAW!"
    : `👀 GUESS WHAT ${data.drawer} IS DRAWING`;

  document.getElementById("secret-word").style.color = amIDrawing
    ? "#22c55e"
    : "#ffffff";

  // Lock/Unlock Canvas
  const container = document.getElementById("canvas-container");
  if (amIDrawing) {
    container.classList.remove("locked");
  } else {
    container.classList.add("locked");
  }

  // Clear previous drawings
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById("messages").innerHTML = ""; // Clear chat
  showScreen("game");
});

// 3. Game/Round End
socket.on("round_end", (data) => {
  const isMe = data.winner === document.getElementById("username").value; // Rough check, better to use ID if available

  document.getElementById("overlay-title").innerText = "ROUND OVER!";
  document.getElementById(
    "overlay-msg"
  ).innerText = `${data.winner} correctly guessed the word!`;
  document.getElementById(
    "overlay-word-reveal"
  ).innerText = `The word was: ${data.word}`;

  // Visual flair
  const title = document.getElementById("overlay-title");
  title.style.color = "#22c55e"; // Green default

  overlay.classList.remove("hidden");
});

// 4. Drawing & Chat
socket.on("draw_start", (data) => drawRemote(data.x, data.y, "start"));
socket.on("draw_line", (data) => drawRemote(data.x, data.y, "line"));
socket.on("message", (data) => addMessage(data.message));

// --- Functions ---

function joinGame() {
  const username = document.getElementById("username").value.trim();
  const gameId = document.getElementById("gameId").value.trim();
  if (!username || !gameId) return alert("Fill all fields");
  socket.emit("join_game", { username, game_id: gameId });
}

function startGame() {
  socket.emit("start_game", { game_id: currentGameId });
}

function updateLobbyList(players) {
  const list = document.getElementById("player-list");
  list.innerHTML = "";

  // Find myself to check if I am admin
  const me = players.find((p) => p.session_id === mySessionId);
  const isAdmin = me ? me.is_admin : false;

  // Show/Hide Start Button
  const btn = document.getElementById("btn-start-game");
  const msg = document.getElementById("waiting-msg");
  if (isAdmin) {
    btn.style.display = "block";
    msg.style.display = "none";
  } else {
    btn.style.display = "none";
    msg.style.display = "block";
  }

  players.forEach((p) => {
    const div = document.createElement("div");
    div.className = "player-card";
    div.innerHTML = `
            <span>${p.username} ${
      p.session_id === mySessionId ? "(You)" : ""
    }</span>
            ${p.is_admin ? '<span class="admin-badge">👑</span>' : ""}
        `;
    list.appendChild(div);
  });
}

function closeOverlay() {
  overlay.classList.add("hidden");
  showScreen("lobby"); // Go back to lobby to wait for next round start
}

function sendGuess(e) {
  e.preventDefault();
  if (mySessionId === currentDrawerId) return; // Drawers can't chat

  const input = document.getElementById("guess-input");
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("guess", { game_id: currentGameId, message: msg });
  input.value = "";
}

function addMessage(text) {
  const div = document.createElement("div");
  div.innerText = text;
  const msgs = document.getElementById("messages");
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// --- Canvas Logic ---
function resizeCanvas() {
  const container = document.getElementById("canvas-container");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener("resize", resizeCanvas);

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: cx - rect.left,
    y: cy - rect.top,
    nx: (cx - rect.left) / canvas.width,
    ny: (cy - rect.top) / canvas.height,
  };
}

function startDraw(e) {
  if (mySessionId !== currentDrawerId) return;
  isDrawing = true;
  const p = getPos(e);
  localDraw(p.x, p.y, "start");
  socket.emit("draw_start", { game_id: currentGameId, x: p.nx, y: p.ny });
}

function moveDraw(e) {
  if (!isDrawing || mySessionId !== currentDrawerId) return;
  e.preventDefault();
  const p = getPos(e);
  localDraw(p.x, p.y, "line");
  socket.emit("draw_line", { game_id: currentGameId, x: p.nx, y: p.ny });
}

function stopDraw() {
  isDrawing = false;
}

function localDraw(x, y, type) {
  if (type === "start") {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
  } else {
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

function drawRemote(nx, ny, type) {
  localDraw(nx * canvas.width, ny * canvas.height, type);
}

// Events
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", moveDraw);
canvas.addEventListener("mouseup", stopDraw);
canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", moveDraw, { passive: false });
canvas.addEventListener("touchend", stopDraw);
