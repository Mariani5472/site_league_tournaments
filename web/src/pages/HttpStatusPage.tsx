import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

export function HttpStatusPage({ kind }: { kind: "notFound" | "forbidden" | "sessionExpired" }) {
    const content = {
        notFound: {
            code: "404",
            title: t("status.notFound.title"),
            description: t("status.notFound.description"),
            action: t("status.notFound.action"),
        },
        forbidden: {
            code: "403",
            title: t("status.forbidden.title"),
            description: t("status.forbidden.description"),
            action: t("status.forbidden.action"),
        },
        sessionExpired: {
            code: "401",
            title: t("status.sessionExpired.title"),
            description: t("status.sessionExpired.description"),
            action: t("status.sessionExpired.action"),
        },
    }[kind];
    return (
        <main className="grid min-h-screen place-items-center bg-background p-6" id="main-content">
            <section className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
                <p className="text-sm font-bold text-primary">{content.code}</p>
                <h1 className="mt-2 text-3xl font-bold">{content.title}</h1>
                <p className="mt-3 text-muted-foreground">{content.description}</p>
                <Button className="mt-6" asChild>
                    <Link to={kind === "sessionExpired" ? "/login" : "/main"}>
                        {content.action}
                    </Link>
                </Button>
            </section>
        </main>
    );
}
