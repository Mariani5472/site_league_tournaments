import { PlatformAuditRepository } from "./platform-audit.repository";
import type { ListPlatformAuditLogs } from "./platform-audit.types";

export class PlatformAuditService {
    constructor(private readonly audit = new PlatformAuditRepository()) {}

    list(params: ListPlatformAuditLogs) {
        return this.audit.list(params);
    }
}
