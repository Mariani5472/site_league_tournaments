import { mySupabase } from "@/lib/supabase/supabase";
import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
});

mySupabase.auth.onAuthStateChange((_event, session) => {
  socket.auth = {
    token: session?.access_token,
  };

  if (session && !socket.connected) {
    socket.connect();
  }

  if (!session && socket.connected) {
    socket.disconnect();
  }
});