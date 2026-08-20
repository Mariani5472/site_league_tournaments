import { AppError } from "../utils/AppError";
import { UserContainmentRepository } from "../modules/ops/user-containment.repository";

const repository = new UserContainmentRepository();

export async function assertUserOperationalAccess(userId: string, now = new Date()) {
    const state = await repository.find(userId);
    if (!state) throw new AppError("User not found", 401);
    if (state.operationalStatus === "banned") {
        throw new AppError("Account is banned", 403);
    }
    if (
        state.operationalStatus === "suspended" &&
        (!state.suspendedUntil || state.suspendedUntil > now)
    ) {
        throw new AppError("Account is suspended", 403);
    }
}
