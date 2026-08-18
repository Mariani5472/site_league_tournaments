import { LoaderCircle } from "lucide-react";
import { t } from "@/i18n";

export function BackgroundRefresh({ active }: { active: boolean }) {
    if (!active) return null;
    return (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            {t("async.refreshing")}
        </p>
    );
}
