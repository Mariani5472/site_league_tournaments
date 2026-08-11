import { Clock, systemClock } from "../../utils/Clock";
import { CaptainElectionService } from "./captain-election.service";

export class CaptainElectionWorker {
    private timer?: NodeJS.Timeout;
    private running = false;
    private readonly service: CaptainElectionService;

    constructor(
        clock: Clock = systemClock,
        private readonly intervalMs = 5_000,
        private readonly onError: (error: unknown) => void = console.error
    ) {
        this.service = new CaptainElectionService(clock);
    }

    async runOnce() {
        if (this.running) {
            return 0;
        }
        this.running = true;
        try {
            return await this.service.finalizeDue();
        } finally {
            this.running = false;
        }
    }

    start() {
        if (this.timer) {
            return;
        }
        const tick = () => void this.runOnce().catch(this.onError);
        tick();
        this.timer = setInterval(tick, this.intervalMs);
        this.timer.unref();
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
}
