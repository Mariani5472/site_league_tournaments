import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <section className="rounded-xl border border-dashed bg-card p-8 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            {description && (
                <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{description}</p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </section>
    );
}
