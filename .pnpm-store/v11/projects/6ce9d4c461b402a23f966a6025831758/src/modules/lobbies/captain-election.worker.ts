import { Clock, systemClock } from "../../utils/Clock";
import { CaptainElectionService } from "./captain-election.service";

export class CaptainElectionWorker {
    private timer?: NodeJS.Timeout;
    private running = false;
    private stopping = false;
    private currentRun?: Promise<number>;
    private readonly service: CaptainElectionService;

    constructor(
        clock: Clock = systemClock,
        private readonly intervalMs = 5_000,
        private readonly onError: (error: unknown) => void = console.error
    ) {
        this.service = new CaptainElectionService(clock);
    }

    async runOnce() {
        if (this.running || this.stopping) {
            return 0;
        }
        this.running = true;
        const run = this.service.finalizeDue();
        this.currentRun = run;
        try {
            return await run;
        } finally {
            this.running = false;
            this.currentRun = undefined;
        }
    }

    start() {
        if (this.timer) {
            return;
        }
        this.stopping = false;
        const tick = () => void this.runOnce().catch(this.onError);
        tick();
        this.timer = setInterval(tick, this.intervalMs);
        this.timer.unref();
    }

    async stop() {
        this.stopping = true;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        await this.currentRun;
    }
}
