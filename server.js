const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

// ======================================================
// CORS
// ======================================================

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

// ======================================================
// SOCKET.IO
// ======================================================

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ======================================================
// ROUTES
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message: "Communication App Backend is running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// ======================================================
// SOCKET CONNECTION
// ======================================================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ====================================================
  // JOIN USER ROOM
  // ====================================================

  socket.on("join", (userId) => {
    if (!userId) return;

    const room = `user_${userId}`;

    socket.join(room);

    socket.userId = String(userId);

    console.log(`User ${userId} joined ${room}`);
  });

  // ====================================================
  // CHAT MESSAGE
  // ====================================================

  socket.on("send_message", (data = {}) => {
    const {
      senderId,
      receiverId,
      message,
    } = data;

    if (!senderId || !receiverId || !message) {
      return;
    }

    io.to(`user_${receiverId}`).emit(
      "receive_message",
      {
        senderId,
        receiverId,
        message,
      }
    );
  });

  // ====================================================
  // START CALL
  // ====================================================

  socket.on("call_user", (data = {}) => {
    const {
      callerId,
      receiverId,
      callerName,
      callerAvatar,
      callType,
    } = data;

    if (
      !callerId ||
      !receiverId ||
      !callType
    ) {
      return;
    }

    console.log(
      `📞 ${callType} call: ${callerId} -> ${receiverId}`
    );

    io.to(`user_${receiverId}`).emit(
      "incoming_call",
      {
        callerId,
        receiverId,
        callerName: callerName || "Unknown",
        callerAvatar: callerAvatar || null,
        callType,
      }
    );
  });

  // ====================================================
  // CALL ACCEPTED
  // ====================================================

  socket.on("call_accepted", (data = {}) => {
    const {
      callerId,
      receiverId,
      callType,
    } = data;

    if (
      !callerId ||
      !receiverId ||
      !callType
    ) {
      return;
    }

    console.log(
      `✅ ${callType} call accepted`
    );

    io.to(`user_${callerId}`).emit(
      "call_accepted",
      {
        callerId,
        receiverId,
        callType,
      }
    );
  });

  // ====================================================
  // CALL REJECTED
  // ====================================================

  socket.on("call_rejected", (data = {}) => {
    const {
      callerId,
      receiverId,
      callType,
    } = data;

    if (
      !callerId ||
      !receiverId ||
      !callType
    ) {
      return;
    }

    console.log(
      `❌ ${callType} call rejected`
    );

    io.to(`user_${callerId}`).emit(
      "call_rejected",
      {
        callerId,
        receiverId,
        callType,
      }
    );
  });

  // ====================================================
  // WEBRTC OFFER
  // ====================================================

  socket.on("webrtc_offer", (data = {}) => {
    const {
      callerId,
      receiverId,
      offer,
      callType,
    } = data;

    if (
      !receiverId ||
      !offer ||
      !callType
    ) {
      return;
    }

    console.log(
      `📤 WebRTC ${callType} offer`
    );

    io.to(`user_${receiverId}`).emit(
      "webrtc_offer",
      {
        callerId:
          callerId || socket.userId,
        receiverId,
        offer,
        callType,
      }
    );
  });

  // ====================================================
  // WEBRTC ANSWER
  // ====================================================

  socket.on("webrtc_answer", (data = {}) => {
    const {
      callerId,
      receiverId,
      answer,
      callType,
    } = data;

    if (
      !receiverId ||
      !answer ||
      !callType
    ) {
      return;
    }

    console.log(
      `📥 WebRTC ${callType} answer`
    );

    io.to(`user_${receiverId}`).emit(
      "webrtc_answer",
      {
        callerId:
          callerId || socket.userId,
        receiverId,
        answer,
        callType,
      }
    );
  });

  // ====================================================
  // WEBRTC ICE
  // ====================================================

  socket.on(
    "webrtc_ice_candidate",
    (data = {}) => {
      const {
        callerId,
        receiverId,
        candidate,
        callType,
      } = data;

      if (
        !receiverId ||
        !candidate ||
        !callType
      ) {
        return;
      }

      io.to(`user_${receiverId}`).emit(
        "webrtc_ice_candidate",
        {
          callerId:
            callerId || socket.userId,
          receiverId,
          candidate,
          callType,
        }
      );
    }
  );

  // ====================================================
  // END CALL
  // ====================================================

  socket.on("end_call", (data = {}) => {
    const {
      callerId,
      receiverId,
      callType,
    } = data;

    if (!receiverId) {
      return;
    }

    console.log(
      `📴 Ending ${callType || "unknown"} call`
    );

    io.to(`user_${receiverId}`).emit(
      "call_ended",
      {
        callerId:
          callerId || socket.userId,
        receiverId,
        callType,
      }
    );
  });

  // ====================================================
  // CALL BUSY
  // ====================================================

  socket.on("call_busy", (data = {}) => {
    const {
      callerId,
      receiverId,
      callType,
    } = data;

    if (
      !callerId ||
      !receiverId ||
      !callType
    ) {
      return;
    }

    io.to(`user_${callerId}`).emit(
      "call_busy",
      {
        callerId,
        receiverId,
        callType,
      }
    );
  });

  // ====================================================
  // DISCONNECT
  // ====================================================

  socket.on("disconnect", (reason) => {
    console.log(
      "Socket disconnected:",
      socket.id,
      reason
    );
  });
});

// ======================================================
// START SERVER
// ======================================================

server.listen(PORT, () => {
  console.log("======================================");
  console.log("🚀 SERVER STARTED");
  console.log(`Port: ${PORT}`);
  console.log(`Client: ${CLIENT_URL}`);
  console.log("======================================");
});
