let peer;
let connection = null;
let myId;
let currentPeerId = null;

const myIdDisplay = document.getElementById("myIdDisplay");
const regenBtn = document.getElementById("regenBtn");
const peerIdInput = document.getElementById("peerIdInput");
const connectBtn = document.getElementById("connectBtn");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const bubbleList = document.getElementById("bubbleList");

/* =========================
   ID SYSTEM
========================= */

function generateId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function saveId(id) {
  localStorage.setItem("lite_id", id);
}

function getId() {
  let id = localStorage.getItem("lite_id");
  if (!id) {
    id = generateId();
    saveId(id);
  }
  return id;
}

/* =========================
   PEER INIT
========================= */

function initPeer() {
  myId = getId();

  if (peer) {
    try { peer.destroy(); } catch {}
  }

  peer = new Peer(myId);

  peer.on("open", id => {
    myIdDisplay.textContent = "Your ID: " + id;
  });

  peer.on("connection", conn => {
    connection = conn;
    currentPeerId = conn.peer;
    localStorage.setItem("last_peer", currentPeerId);
    setupConnection();
  });
}

/* =========================
   REGENERATE ID
========================= */

regenBtn.onclick = () => {
  if (!confirm("Regenerate your ID? Old one will stop working.")) return;

  const newId = generateId();
  saveId(newId);

  if (connection) {
    try { connection.close(); } catch {}
  }

  initPeer();

  addMessage("Server: Your ID has been regenerated.");
};

/* =========================
   NICKNAMES
========================= */

function getNickname(peerId) {
  return localStorage.getItem("nickname_" + peerId);
}

function setNickname(peerId, name) {
  localStorage.setItem("nickname_" + peerId, name);
}

function displayName(peerId) {
  return getNickname(peerId) || peerId;
}

/* =========================
   CONNECT SYSTEM
========================= */

function attemptConnection(peerId) {
  if (!peerId || peerId === myId) return;

  if (connection) {
    try { connection.close(); } catch {}
  }

  currentPeerId = peerId;
  loadBubble(peerId);

  addMessage("Server: Attempting connection...");

  connection = peer.connect(peerId, { reliable: true });

  let connected = false;

  connection.on("open", () => {
    connected = true;
    localStorage.setItem("last_peer", peerId);
    addMessage("Server: Connected.");
    setupConnection();
  });

  connection.on("error", () => {
    if (!connected) {
      addMessage("Server: This user is offline.");
    }
  });

  connection.on("close", () => {
    addMessage("Server: Connection closed.");
  });

  setTimeout(() => {
    if (!connected) {
      addMessage("Server: This user is offline.");
      try { connection.close(); } catch {}
    }
  }, 4000);
}

connectBtn.onclick = () => {
  const peerId = peerIdInput.value.trim().toUpperCase();
  if (!peerId) return;

  addBubble(peerId);
  attemptConnection(peerId);
};

/* =========================
   CONNECTION SETUP
========================= */

function setupConnection() {
  addBubble(currentPeerId);

  connection.on("data", data => {
    addMessage(displayName(currentPeerId) + ": " + data);
    saveMessage(currentPeerId, "anon", data);
  });
}

/* =========================
   SEND MESSAGE
========================= */

messageInput.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;

  const msg = messageInput.value.trim();
  if (!msg || !connection || !currentPeerId) return;

  connection.send(msg);
  addMessage("You: " + msg);
  saveMessage(currentPeerId, "you", msg);

  messageInput.value = "";
});

/* =========================
   MESSAGE DISPLAY
========================= */

function addMessage(text) {
  const div = document.createElement("div");
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* =========================
   STORAGE
========================= */

function getKey(peerId) {
  return "bubble_" + peerId;
}

function saveMessage(peerId, sender, text) {
  const key = getKey(peerId);
  const messages = JSON.parse(localStorage.getItem(key) || "[]");
  messages.push({ sender, text });
  localStorage.setItem(key, JSON.stringify(messages));
}

function loadBubble(peerId) {
  messagesDiv.innerHTML = "";
  const key = getKey(peerId);
  const messages = JSON.parse(localStorage.getItem(key) || "[]");

  messages.forEach(msg => {
    const name = msg.sender === "you" ? "You" : displayName(peerId);
    addMessage(name + ": " + msg.text);
  });
}

/* =========================
   BUBBLE SIDEBAR
========================= */

function addBubble(peerId) {
  if (document.getElementById("btn_" + peerId)) return;

  const btn = document.createElement("button");
  btn.id = "btn_" + peerId;
  btn.textContent = displayName(peerId);

  btn.onclick = () => {
    attemptConnection(peerId);
  };

  btn.oncontextmenu = (e) => {
    e.preventDefault();
    const name = prompt("Set nickname:", getNickname(peerId) || "");
    if (name !== null) {
      setNickname(peerId, name.trim());
      btn.textContent = displayName(peerId);
      if (currentPeerId === peerId) loadBubble(peerId);
    }
  };

  bubbleList.appendChild(btn);
}

/* =========================
   REBUILD BUBBLES
========================= */

function rebuildBubbles() {
  bubbleList.innerHTML = "";

  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("bubble_")) {
      const peerId = key.replace("bubble_", "");
      addBubble(peerId);
    }
  });

  const last = localStorage.getItem("last_peer");
  if (last) {
    currentPeerId = last;
    loadBubble(last);
  }
}

/* =========================
   INIT
========================= */

rebuildBubbles();
initPeer();
