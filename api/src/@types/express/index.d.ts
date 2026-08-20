import { UserIdentity } from "../../modules/users/users.types";
declare global {
    namespace Express {
        interface Request {
            user: UserIdentity;
            platformRole?: "super_admin";
            requestId: string;
        }
    }
}
export {};
