import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket-handlers";

let io: Server;

export function initializeSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: '*'
    }
  });

  registerSocketHandlers(io)

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket not initialized");
  }

  return io;
}