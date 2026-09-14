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

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

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


  // User joins their personal room
  socket.on("join", (userId) => {
    socket.join(`user_${userId}`);

    console.log(
      `User ${userId} joined room user_${userId}`
    );
  });


  // Send message in real time
  socket.on("send_message", (data) => {
    const {
      senderId,
      receiverId,
      message,
    } = data;

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
    // WEBRTC CALL SIGNALING
    // ===============================

    // Send incoming call
    socket.on("call_user", (data) => {
    const {
        receiverId,
        callerId,
        callerName,
        callType,
    } = data;

    io.to(`user_${receiverId}`).emit(
        "incoming_call",
        {
        callerId,
        callerName,
        callType,
        }
    );
    });

    // Send WebRTC offer
    socket.on("webrtc_offer", (data) => {
    const { receiverId, offer } = data;

    io.to(`user_${receiverId}`).emit(
        "webrtc_offer",
        {
        offer,
        }
    );
    });

    // Send WebRTC answer
    socket.on("webrtc_answer", (data) => {
    const { receiverId, answer } = data;

    io.to(`user_${receiverId}`).emit(
        "webrtc_answer",
        {
        answer,
        }
    );
    });

    // Send ICE candidate
    socket.on("webrtc_ice_candidate", (data) => {
    const {
        receiverId,
        candidate,
    } = data;

    io.to(`user_${receiverId}`).emit(
        "webrtc_ice_candidate",
        {
        candidate,
        }
    );
    });

    // End call
    socket.on("end_call", (data) => {
    const { receiverId } = data;

    io.to(`user_${receiverId}`).emit(
        "call_ended"
    );
    });
  socket.on("disconnect", () => {
    console.log(
      "Socket disconnected:",
      socket.id
    );
  });
});


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});