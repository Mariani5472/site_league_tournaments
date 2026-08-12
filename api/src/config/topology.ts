export type RealtimeRevocationMode = "local" | "distributed";

export type TopologyConfig = {
    instanceCount: number;
    realtimeRevocationMode: RealtimeRevocationMode;
};

function positiveInteger(value: string | undefined, fallback: number) {
    if (value === undefined || value === "") return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        throw new Error("INSTANCE_COUNT must be a positive integer");
    }
    return parsed;
}

export function validateTopology(environment: NodeJS.ProcessEnv = process.env): TopologyConfig {
    const instanceCount = positiveInteger(environment.INSTANCE_COUNT, 1);
    const realtimeRevocationMode = environment.REALTIME_REVOCATION_MODE ?? "local";
    if (realtimeRevocationMode !== "local" && realtimeRevocationMode !== "distributed") {
        throw new Error("REALTIME_REVOCATION_MODE must be local or distributed");
    }
    if (instanceCount > 1 && realtimeRevocationMode !== "distributed") {
        throw new Error(
            "Horizontal scale is unsafe: Socket grants and revocations are process-local. " +
            "Keep INSTANCE_COUNT=1 until a distributed adapter/bus with global revocation is implemented and tested."
        );
    }
    if (realtimeRevocationMode === "distributed") {
        throw new Error(
            "REALTIME_REVOCATION_MODE=distributed is not implemented. " +
            "Add and test a shared Socket.IO adapter/revocation bus before enabling it."
        );
    }
    return { instanceCount, realtimeRevocationMode };
}
