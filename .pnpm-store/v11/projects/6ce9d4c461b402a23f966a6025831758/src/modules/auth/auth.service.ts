import { UsersService } from "../users/users.service";
import { UserIdentity } from "../users/users.types";
export class AuthService {
    private usersService = new UsersService();
    async syncAuthenticatedUser(identity: UserIdentity) {
        return this.usersService.ensureExists(identity);
    }
}
