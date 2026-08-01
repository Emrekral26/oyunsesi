import express from "express";
import cors from "cors";
import { AccessToken } from "@livekit/server-sdk";

const app = express();

app.use(cors());
app.use(express.json());

const rooms = new Map();

function makeRoomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getLiveKitToken(roomCode, username) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit API bilgileri eksik");
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: `${username}-${Date.now()}`
  });

  token.addGrant({
    roomJoin: true,
    room: roomCode,
    canPublish: true,
    canSubscribe: true
  });

  return token.toJwt();
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "OyunSesi Backend"
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/rooms", (req, res) => {
  const username = req.body.username || "Oyuncu";

  let code = makeRoomCode();
  while (rooms.has(code)) {
    code = makeRoomCode();
  }

  rooms.set(code, {
    code,
    users: [username],
    createdAt: Date.now()
  });

  const token = getLiveKitToken(code, username);

  res.json({
    roomCode: code,
    code,
    livekitUrl: process.env.LIVEKIT_URL,
    token
  });
});

app.post("/rooms/:code/join", (req, res) => {
  const code = req.params.code;
  const username = req.body.username || "Oyuncu";

  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ error: "Oda bulunamadı" });
  }

  if (room.users.length >= 4) {
    return res.status(400).json({ error: "Oda dolu" });
  }

  room.users.push(username);

  const token = getLiveKitToken(code, username);

  res.json({
    roomCode: code,
    code,
    livekitUrl: process.env.LIVEKIT_URL,
    token
  });
});

app.post("/rooms/:code/leave", (req, res) => {
  const code = req.params.code;
  const username = req.body.username;

  const room = rooms.get(code);

  if (!room) {
    return res.json({ ok: true });
  }

  room.users = room.users.filter((user) => user !== username);

  if (room.users.length === 0) {
    rooms.delete(code);
  }

  res.json({ ok: true });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`OyunSesi backend ${port} portunda çalışıyor`);
});
