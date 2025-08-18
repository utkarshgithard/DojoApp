import { verifySocketToken } from "../middleware/authMiddleware";

export default function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const userId = verifySocketToken(token);
    if (!userId) return next(new Error("Unauthorized"));
    socket.userId = String(userId);
    next();
  });

  io.on("connection", (socket) => {
    // Join a private room for this user
    socket.join(socket.userId);

    socket.on("disconnect", () => {
      // cleanup if needed
    });
  });
}