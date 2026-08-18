import {
    CheckCircle2,
    CircleDot,
    Clock3,
    Eye,
    Lock,
    Shield,
    Swords,
    UserRound,
    XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { labelJoinPolicy, labelLobbyStatus, labelMatchStatus, labelRole } from "@/i18n/labels";

const tones = {
    neutral: "border-border bg-muted text-muted-foreground",
    info: "border-primary/30 bg-primary/10 text-primary",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/35 bg-warning/15 text-warning-foreground dark:text-warning",
    danger: "border-danger/30 bg-danger/10 text-danger",
} as const;

function TokenBadge({
    label,
    tone = "neutral",
    icon: Icon,
}: {
    label: string;
    tone?: keyof typeof tones;
    icon: typeof CircleDot;
}) {
    return (
        <Badge variant="outline" className={cn("gap-1.5", tones[tone])}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            {label}
        </Badge>
    );
}

export function RoleBadge({ role }: { role: "owner" | "admin" | "player" | "spec" }) {
    const privileged = role === "owner" || role === "admin";
    return (
        <TokenBadge
            label={labelRole(role)}
            tone={privileged ? "info" : "neutral"}
            icon={privileged ? Shield : UserRound}
        />
    );
}

export function JoinPolicyBadge({ policy }: { policy: "open" | "request" | "invite_only" }) {
    return (
        <TokenBadge
            label={labelJoinPolicy(policy)}
            tone={policy === "open" ? "success" : policy === "request" ? "warning" : "neutral"}
            icon={policy === "open" ? Eye : Lock}
        />
    );
}

export function LobbyStatusBadge({ status }: { status: string }) {
    const config =
        status === "waiting"
            ? { tone: "warning" as const, icon: Clock3 }
            : status === "in_game"
              ? { tone: "info" as const, icon: Swords }
              : status === "finished"
                ? { tone: "success" as const, icon: CheckCircle2 }
                : { tone: "danger" as const, icon: XCircle };
    return <TokenBadge label={labelLobbyStatus(status)} {...config} />;
}

export function MatchStatusBadge({ status }: { status: string }) {
    const config =
        status === "finished"
            ? { tone: "success" as const, icon: CheckCircle2 }
            : status === "cancelled"
              ? { tone: "danger" as const, icon: XCircle }
              : { tone: "info" as const, icon: Swords };
    return <TokenBadge label={labelMatchStatus(status)} {...config} />;
}
