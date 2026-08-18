import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

export function InlineError({ message, retry }: { message: string; retry?: () => unknown }) {
    return (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-5" role="alert">
            <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
                <div>
                    <p className="font-medium text-danger">{message}</p>
                    {retry && (
                        <Button className="mt-3" size="sm" variant="outline" onClick={retry}>
                            {t("common.retry")}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
