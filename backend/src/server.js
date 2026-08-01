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

  const data =
    base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(payload));

  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(data)
    .digest("base64url");

  return data + "." + signature;
}

function code() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createRoom(username) {
  let roomCode = code();

  while (rooms.has(roomCode)) {
    roomCode = code();
  }

  rooms.set(roomCode, { users: [username] });

  return {
    roomCode,
    code: roomCode,
    livekitUrl: process.env.LIVEKIT_URL,
    token: makeToken(roomCode, username)
  };
}

app.get("/", (req, res) => {
  res.json({ ok: true, app: "OyunSesi Backend" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/rooms", (req, res) => {
  const username = req.body.username || "Oyuncu";
  res.json(createRoom(username));
});

app.post("/rooms/create", (req, res) => {
  const username = req.body.username || "Oyuncu";
  res.json(createRoom(username));
});

app.post("/rooms/:code/join", (req, res) => {
  const username = req.body.username || "Oyuncu";
  const roomCode = req.params.code;
  const room = rooms.get(roomCode);

  if (!room) return res.status(404).json({ error: "Oda bulunamadı" });
  if (room.users.length >= 4) return res.status(400).json({ error: "Oda dolu" });

  room.users.push(username);

  res.json({
    roomCode,
    code: roomCode,
    livekitUrl: process.env.LIVEKIT_URL,
    token: makeToken(roomCode, username)
  });
});

app.post("/rooms/join", (req, res) => {
  const username = req.body.username || "Oyuncu";
  const roomCode = req.body.code || req.body.roomCode;
  const room = rooms.get(roomCode);

  if (!room) return res.status(404).json({ error: "Oda bulunamadı" });
  if (room.users.length >= 4) return res.status(400).json({ error: "Oda dolu" });

  room.users.push(username);

  res.json({
    roomCode,
    code: roomCode,
    livekitUrl: process.env.LIVEKIT_URL,
    token: makeToken(roomCode, username)
  });
});

app.post("/rooms/:code/leave", (req, res) => {
  const roomCode = req.params.code;
  const username = req.body.username;
  const room = rooms.get(roomCode);

  if (!room) return res.json({ ok: true });

  room.users = room.users.filter((user) => user !== username);

  if (room.users.length === 0) {
    rooms.delete(roomCode);
  }

  res.json({ ok: true });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("OyunSesi backend çalışıyor");
});
