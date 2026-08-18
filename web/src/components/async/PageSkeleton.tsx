import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function PageSkeleton({
    rows = 3,
    className,
    label = t("async.page"),
}: {
    rows?: number;
    className?: string;
    label?: string;
}) {
    return (
        <div className={cn("space-y-5", className)} aria-busy="true" aria-live="polite">
            <span className="sr-only">{label}</span>
            <div className="h-28 animate-pulse rounded-2xl bg-muted" />
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/75" />
            ))}
        </div>
    );
}
