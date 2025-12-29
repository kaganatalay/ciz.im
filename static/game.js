const socket = io();

// --- State Variables ---
let mySessionId = null;
let currentGameId = null;
let currentDrawerId = null;
let isDrawing = false;
let drawingHistory = []; // Stores lines to handle window resizing

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
const btnClear = document.getElementById("btn-clear");
const chatInput = document.getElementById("guess-input");
const chatBtn = document.getElementById("btn-chat-submit");

// --- Navigation ---
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");

  if (name === "game") {
    resizeCanvas();
  }
}

// --- Socket Event Listeners ---

socket.on("connect", () => console.log("Connected"));

// 1. Join & Lobby
socket.on("game_joined", (data) => {
  mySessionId = data.you.pid;
  currentGameId = data.game_id;
  document.getElementById("lobby-room-code").innerText = currentGameId;
  updateLobbyList(data.players);
  showScreen("lobby");
  // Ensure overlay is gone if we just joined/rejoined
  overlay.classList.add("hidden");
});

socket.on("update_players", (data) => updateLobbyList(data.players));
socket.on("error", (data) => alert(data.message));
socket.on("game_closed", (data) => {
  alert(data.message);
  resetGame();
});

// 2. Game Start (The Source of Truth)
socket.on("game_started", (data) => {
  // FORCE RESET STATE: This fixes the "Admin started while I was on overlay" bug
  overlay.classList.add("hidden");
  drawingHistory = []; // Clear history for new round
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
  messagesDiv.innerHTML = "";

  currentDrawerId = data.drawer_id;
  const amIDrawing = mySessionId === currentDrawerId;

  // UI Updates
  const secretWordEl = document.getElementById("secret-word");
  const roleTextEl = document.getElementById("role-text");

  secretWordEl.innerText = data.word;

  if (amIDrawing) {
    // Drawer State
    roleTextEl.innerText = "✏️ IT'S YOUR TURN TO DRAW!";
    roleTextEl.style.color = "#22c55e";
    secretWordEl.style.color = "#22c55e";
    document.getElementById("canvas-container").classList.remove("locked");

    // Show Clear Button
    btnClear.style.display = "block";

    // Disable Chat
    chatInput.disabled = true;
    chatBtn.disabled = true;
    chatInput.placeholder = "You are drawing...";
  } else {
    // Guesser State
    roleTextEl.innerText = `👀 GUESS WHAT ${data.drawer} IS DRAWING`;
    roleTextEl.style.color = "#a1a1aa";
    secretWordEl.style.color = "#ffffff";
    document.getElementById("canvas-container").classList.add("locked");

    // Hide Clear Button
    btnClear.style.display = "none";

    // Enable Chat
    chatInput.disabled = false;
    chatBtn.disabled = false;
    chatInput.placeholder = "Type your guess here...";
  }

  addMessage("Round Started!", "msg-system");
  showScreen("game");
  resizeCanvas(); // Ensure canvas is sized correctly at start
});

// 3. Round End
socket.on("round_end", (data) => {
  const title = document.getElementById("overlay-title");
  const msg = document.getElementById("overlay-msg");

  if (data.reason === "drawer_left") {
    title.innerText = "DRAWER LEFT!";
    title.style.color = "#ef4444";
    msg.innerText = "The drawer disconnected. Round ended.";
  } else {
    title.innerText = "ROUND OVER!";
    title.style.color = "#22c55e";
    msg.innerText = `${data.winner} guessed correctly!`;
  }

  document.getElementById("overlay-word-reveal").innerText = data.word;
  overlay.classList.remove("hidden");
});

// 4. Game Events
socket.on("message", (data) => addMessage(data.message, "msg-chat"));

// Handle Clear Board
socket.on("clear_board", () => {
  drawingHistory = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on("draw_start", (data) => {
  drawingHistory.push({ type: "start", x: data.x, y: data.y });
  drawRemote(data.x, data.y, "start");
});
socket.on("draw_line", (data) => {
  drawingHistory.push({ type: "line", x: data.x, y: data.y });
  drawRemote(data.x, data.y, "line");
});

// --- User Actions ---

function joinGame() {
  const username = document.getElementById("username").value.trim();
  const gameId = document.getElementById("gameId").value.trim();
  if (!username || !gameId) return alert("Enter name and room code");
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
  drawingHistory = [];
  document.getElementById("player-list").innerHTML = "";
  overlay.classList.add("hidden");
  showScreen("login");
}

function backToLobby() {
  overlay.classList.add("hidden");
  showScreen("lobby");
}

function clearCanvas() {
  // Only drawer can click this because we hid it for others,
  // but good to check state anyway
  if (mySessionId === currentDrawerId) {
    socket.emit("clear_board", { game_id: currentGameId });
    // Local clear happens via socket event to keep sync
  }
}

function sendGuess(e) {
  e.preventDefault();
  if (mySessionId === currentDrawerId) return; // Double check

  const msg = chatInput.value.trim();
  if (!msg) return;

  socket.emit("guess", { game_id: currentGameId, message: msg });
  chatInput.value = "";
}

// --- Helper Functions ---

function updateLobbyList(players) {
  const list = document.getElementById("player-list");
  list.innerHTML = "";

  let amIAdmin = false;
  players.forEach((p) => {
    if (p.pid === mySessionId && p.is_admin) amIAdmin = true;
  });

  const btn = document.getElementById("btn-start-game");
  const msg = document.getElementById("waiting-msg");

  if (amIAdmin) {
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

// --- Canvas Logic (With Resize History) ---

function resizeCanvas() {
  const container = document.getElementById("canvas-container");
  if (container && container.clientWidth > 0) {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    // Redraw everything from history
    redrawHistory();
  }
}

// This solves the issue of canvas wiping on resize
window.addEventListener("resize", () => {
  // Debounce slightly if needed, but direct call is usually fine for this complexity
  resizeCanvas();
});

function redrawHistory() {
  ctx.beginPath(); // Reset context state
  drawingHistory.forEach((step) => {
    drawRemote(step.x, step.y, step.type);
  });
}

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
  if (mySessionId !== currentDrawerId) return;
  isDrawing = true;
  const p = getPos(e);

  // Store locally
  drawingHistory.push({ type: "start", x: p.normX, y: p.normY });

  localDraw(p.x, p.y, "start");
  socket.emit("draw_start", { game_id: currentGameId, x: p.normX, y: p.normY });
}

function moveDraw(e) {
  if (!isDrawing || mySessionId !== currentDrawerId) return;
  if (e.cancelable) e.preventDefault();

  const p = getPos(e);

  // Store locally
  drawingHistory.push({ type: "line", x: p.normX, y: p.normY });

  localDraw(p.x, p.y, "line");
  socket.emit("draw_line", { game_id: currentGameId, x: p.normX, y: p.normY });
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
    ctx.strokeStyle = "#000";
  } else {
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

function drawRemote(normX, normY, type) {
  localDraw(normX * canvas.width, normY * canvas.height, type);
}

// Events
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", moveDraw);
canvas.addEventListener("mouseup", stopDraw);
canvas.addEventListener("mouseout", stopDraw);
canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", moveDraw, { passive: false });
canvas.addEventListener("touchend", stopDraw);
