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

// ===============================
// CORS
// ===============================

const clientUrl = process.env.CLIENT_URL;

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);

app.use(express.json());

// ===============================
// ROUTES
// ===============================

app.get("/", (req, res) => {
  res.json({
    message: "Communication App Backend is running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// ===============================
// SOCKET.IO
// ===============================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ===============================
  // JOIN USER ROOM
  // ===============================

  socket.on("join", (userId) => {
    if (!userId) return;

    socket.join(`user_${userId}`);

    console.log(
      `User ${userId} joined room user_${userId}`
    );
  });

  // ===============================
  // REAL-TIME MESSAGES
  // ===============================

  socket.on("send_message", (data) => {
    const {
      senderId,
      receiverId,
      message,
    } = data;

    if (
      !senderId ||
      !receiverId ||
      !message
    ) {
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

  // ===============================
  // INCOMING CALL
  // ===============================

  socket.on("call_user", (data) => {
    const {
      receiverId,
      callerId,
      callerName,
      callType,
    } = data;

    if (
      !receiverId ||
      !callerId ||
      !callType
    ) {
      return;
    }

    console.log(
      `${callType} call: ${callerId} -> ${receiverId}`
    );

    io.to(`user_${receiverId}`).emit(
      "incoming_call",
      {
        callerId,
        callerName,
        callType,
      }
    );
  });

  // ===============================
  // WEBRTC OFFER
  // ===============================

  socket.on("webrtc_offer", (data) => {
    const {
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

    io.to(`user_${receiverId}`).emit(
      "webrtc_offer",
      {
        offer,
        callType,
      }
    );
  });

  // ===============================
  // WEBRTC ANSWER
  // ===============================

  socket.on("webrtc_answer", (data) => {
    const {
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

    io.to(`user_${receiverId}`).emit(
      "webrtc_answer",
      {
        answer,
        callType,
      }
    );
  });

  // ===============================
  // ICE CANDIDATE
  // ===============================

  socket.on(
    "webrtc_ice_candidate",
    (data) => {
      const {
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
          candidate,
          callType,
        }
      );
    }
  );

  // ===============================
  // END CALL
  // ===============================

  socket.on("end_call", (data) => {
    const {
      receiverId,
      callType,
    } = data;

    if (!receiverId) {
      return;
    }

    io.to(`user_${receiverId}`).emit(
      "call_ended",
      {
        callType,
      }
    );
  });

  // ===============================
  // DISCONNECT
  // ===============================

  socket.on("disconnect", () => {
    console.log(
      "Socket disconnected:",
      socket.id
    );
  });
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});
