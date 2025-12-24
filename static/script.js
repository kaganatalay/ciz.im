const socket = io();
let currentGameId = null;
let currentPlayer = null;
let isDrawer = false;
let canvas, ctx;
let drawing = false;

document.getElementById("create-btn").addEventListener("click", createGame);
document.getElementById("join-btn").addEventListener("click", joinGame);
document.getElementById("start-game-btn").addEventListener("click", startGame);
document
  .getElementById("message-input")
  .addEventListener("keydown", sendMessage);
document.getElementById("new-round-btn").addEventListener("click", startGame); // For simplicity

function createGame() {
  console.log("Emitting create_game");
  socket.emit("create_game");
}

function joinGame() {
  const gameId = document.getElementById("join-game-id").value.toUpperCase();
  const username = document.getElementById("join-username").value;
  if (gameId && username) {
    socket.emit("join_game", { game_id: gameId, username: username });
    currentGameId = gameId;
  }
}

function startGame() {
  socket.emit("start_game", { game_id: currentGameId });
}

function sendMessage(event) {
  if (event.key === "Enter") {
    const msg = document.getElementById("message-input").value;
    if (msg.trim()) {
      socket.emit("guess", { game_id: currentGameId, message: msg });
      document.getElementById("message-input").value = "";
    }
  }
}

socket.on("game_created", (data) => {
  console.log("Received game_created", data);
  currentGameId = data.game_id;
  document.getElementById("game-id").textContent = currentGameId;
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("lobby").style.display = "block";
  document.getElementById("lobby-game-id").textContent = currentGameId;
  document.getElementById("start-game-btn").style.display = "inline-block";
});

socket.on("game_joined", (data) => {
  currentPlayer = data.player;
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("lobby").style.display = "block";
  document.getElementById("lobby-game-id").textContent = currentGameId;
  if (data.is_admin) {
    document.getElementById("start-game-btn").style.display = "inline-block";
  }
  updatePlayers(data.players);
});

socket.on("update_players", (data) => {
  updatePlayers(data.players);
});

function updatePlayers(players) {
  const list = document.getElementById("players-list");
  list.innerHTML =
    "<ul>" +
    players
      .map((p) => `<li>${p.username} ${p.is_admin ? "(Admin)" : ""}</li>`)
      .join("") +
    "</ul>";
}

socket.on("game_started", (data) => {
  document.getElementById("lobby").style.display = "none";
  document.getElementById("game").style.display = "block";
  document.getElementById(
    "current-drawer"
  ).textContent = `Drawer: ${data.drawer}`;
  document.getElementById("messages").innerHTML = "";
  if (socket.id === data.drawer_id) {
    isDrawer = true;
    document.getElementById("word-hint").textContent = `Word: ${data.word}`;
    setupCanvas();
  } else {
    isDrawer = false;
    document.getElementById("word-hint").textContent = "Guess the word!";
    receiveCanvas();
  }
});

function setupCanvas() {
  canvas = document.getElementById("drawing-canvas");
  ctx = canvas.getContext("2d");
  ctx.lineCap = "round";
  ctx.lineWidth = 5;

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);
}

function startDrawing(e) {
  if (!isDrawer) return;
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
  socket.emit("draw_start", {
    game_id: currentGameId,
    x: e.offsetX,
    y: e.offsetY,
  });
}

function draw(e) {
  if (!drawing || !isDrawer) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  socket.emit("draw_line", {
    game_id: currentGameId,
    x: e.offsetX,
    y: e.offsetY,
  });
}

function stopDrawing() {
  drawing = false;
}

socket.on("draw_start", (data) => {
  if (isDrawer) return; // Drawer doesn't need to receive
  const ctx = receiveCanvas();
  ctx.beginPath();
  ctx.moveTo(data.x, data.y);
});

socket.on("draw_line", (data) => {
  if (isDrawer) return; // Drawer doesn't need to receive
  const ctx = receiveCanvas();
  ctx.lineTo(data.x, data.y);
  ctx.stroke();
});

function receiveCanvas() {
  if (!ctx) {
    canvas = document.getElementById("drawing-canvas");
    ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
  }
  return ctx;
}

socket.on("message", (data) => {
  const msgDiv = document.createElement("div");
  msgDiv.textContent = data.message;
  document.getElementById("messages").appendChild(msgDiv);
  document.getElementById("messages").scrollTop =
    document.getElementById("messages").scrollHeight;
});

socket.on("correct_guess", (data) => {
  document.getElementById(
    "winner-text"
  ).textContent = `${data.player_name} guessed it right!`;
  document.getElementById("game-over-popup").style.display = "flex";
});

socket.on("error", (data) => {
  alert(data.message);
});
