import { Socket } from "socket.io";
import { supabase } from "../lib/supabase";

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Token missing"));
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return next(new Error("Invalid token"));
    }

    socket.data.user = {
      id: data.user.id,
      email: data.user.email,
    };

    next();
  } catch {
    next(new Error("Authentication failed"));
  }
}