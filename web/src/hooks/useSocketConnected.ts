import { useSyncExternalStore } from "react";
import { socket } from "@/services/socket";

function subscribe(onConnectionChange: () => void) {
    socket.on("connect", onConnectionChange);
    socket.on("disconnect", onConnectionChange);
    return () => {
        socket.off("connect", onConnectionChange);
        socket.off("disconnect", onConnectionChange);
    };
}

export function useSocketConnected() {
    return useSyncExternalStore(subscribe, () => socket.connected, () => false);
}
