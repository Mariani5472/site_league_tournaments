import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateTopology } from "../src/config/topology";

describe("deployment topology", () => {
    it("accepts the supported single-instance local revocation topology", () => {
        assert.deepEqual(validateTopology({
            INSTANCE_COUNT: "1",
            REALTIME_REVOCATION_MODE: "local"
        }), { instanceCount: 1, realtimeRevocationMode: "local" });
    });

    it("blocks horizontal scale while revocation remains process-local", () => {
        assert.throws(() => validateTopology({
            INSTANCE_COUNT: "2",
            REALTIME_REVOCATION_MODE: "local"
        }), /horizontal scale is unsafe/i);
    });

    it("does not allow a distributed flag before the strategy exists", () => {
        assert.throws(() => validateTopology({
            INSTANCE_COUNT: "2",
            REALTIME_REVOCATION_MODE: "distributed"
        }), /distributed.*not implemented/i);
    });

    it("rejects ambiguous instance counts", () => {
        assert.throws(() => validateTopology({ INSTANCE_COUNT: "auto" }), /positive integer/i);
    });
});
