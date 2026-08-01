import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const rooms = new Map();

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function makeToken(roomCode, username) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: apiKey,
    sub: username + "-" + Date.now(),
    nbf: now,
    exp: now + 3600,
    video: {
      roomJoin: true,
      room: roomCode,
      canPublish: true,
      canSubscribe: true
    }
  };

  const data = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", apiSecret).update(data).digest("base64url");

  return data + "." + signature;
}

function code() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function response(roomCode, username) {
  const participantToken = makeToken(roomCode, username);
  const serverUrl = process.env.LIVEKIT_URL;

  return {
    ok: true,
    roomCode,
    code: roomCode,
    livekitUrl: serverUrl,
    liveKitUrl: serverUrl,
    url: serverUrl,
    serverUrl,
    token: participantToken,
    participantToken
  };
}

function createRoom(username) {
  let roomCode = code();

  while (rooms.has(roomCode)) {
    roomCode = code();
  }

  rooms.set(roomCode, { users: [username] });

  return response(roomCode, username);
}

function joinRoom(roomCode, username) {
  const room = rooms.get(roomCode);

  if (!room) {
    return { status: 404, body: { error: "Oda bulunamadı" } };
  }

  if (room.users.length >= 4) {
    return { status: 400, body: { error: "Oda dolu" } };
  }

  room.users.push(username);

  return {
    status: 200,
    body: response(roomCode, username)
  };
}

app.get("/", (req, res) => {
  res.json({ ok: true, app: "OyunSesi Backend" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/rooms", (req, res) => {
  res.json(createRoom(req.body.username || "Oyuncu"));
});

app.post("/rooms/create", (req, res) => {
  res.json(createRoom(req.body.username || "Oyuncu"));
});

app.post("/api/rooms", (req, res) => {
  res.json(createRoom(req.body.username || "Oyuncu"));
});

app.post("/api/rooms/create", (req, res) => {
  res.json(createRoom(req.body.username || "Oyuncu"));
});

app.post("/create-room", (req, res) => {
  res.json(createRoom(req.body.username || "Oyuncu"));
});

app.post("/api/create-room", (req, res) => {
  res.json(createRoom(req.body.username || "Oyuncu"));
});

app.post("/room/create", (req, res) => {
  res.json(createRoom(req.body.username || "Oyuncu"));
});

app.post("/api/room/create", (req, res) => {
  res.json(createRoom(req.body.username || "Oyuncu"));
});

app.post("/rooms/:code/join", (req, res) => {
  const result = joinRoom(req.params.code, req.body.username || "Oyuncu");
  res.status(result.status).json(result.body);
});

app.post("/api/rooms/:code/join", (req, res) => {
  const result = joinRoom(req.params.code, req.body.username || "Oyuncu");
  res.status(result.status).json(result.body);
});

app.post("/rooms/join", (req, res) => {
  const roomCode = req.body.code || req.body.roomCode;
  const result = joinRoom(roomCode, req.body.username || "Oyuncu");
  res.status(result.status).json(result.body);
});

app.post("/api/rooms/join", (req, res) => {
  const roomCode = req.body.code || req.body.roomCode;
  const result = joinRoom(roomCode, req.body.username || "Oyuncu");
  res.status(result.status).json(result.body);
});

app.post("/join-room", (req, res) => {
  const roomCode = req.body.code || req.body.roomCode;
  const result = joinRoom(roomCode, req.body.username || "Oyuncu");
  res.status(result.status).json(result.body);
});

app.post("/api/join-room", (req, res) => {
  const roomCode = req.body.code || req.body.roomCode;
  const result = joinRoom(roomCode, req.body.username || "Oyuncu");
  res.status(result.status).json(result.body);
});

app.post("/rooms/:code/leave", (req, res) => {
  const roomCode = req.params.code;
  const username = req.body.username;
  const room = rooms.get(roomCode);

  if (!room) return res.json({ ok: true });

  room.users = room.users.filter((user) => user !== username);

  if (room.users.length === 0) rooms.delete(roomCode);

  res.json({ ok: true });
});

app.use((req, res) => {
  const path = req.path.toLowerCase();
  const username = req.body?.username || req.query?.username || "Oyuncu";
  const roomCode = req.body?.code || req.body?.roomCode || req.query?.code || req.query?.roomCode;

  if (path.includes("join")) {
    const result = joinRoom(roomCode, username);
    return res.status(result.status).json(result.body);
  }

  if (path.includes("room") || path.includes("create")) {
    return res.json(createRoom(username));
  }

  res.status(404).json({
    error: "Yol bulunamadı",
    path: req.path
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("OyunSesi backend çalışıyor");
});
