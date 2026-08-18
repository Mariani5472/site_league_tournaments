import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { AuthShell } from "../components/AuthShell";

export function ForgotPasswordPage() {
    const { requestPasswordReset, loading, error } = useAuth();
    const [sent, setSent] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<{ email: string }>();
    const submit = handleSubmit(async ({ email }) => {
        try {
            await requestPasswordReset(email);
            setSent(true);
        } catch {
            /* provider exposes error */
        }
    });
    return (
        <AuthShell>
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">{t("auth.forgotTitle")}</h1>
                <p className="text-muted-foreground">{t("auth.forgotDescription")}</p>
            </div>
            {sent ? (
                <div
                    role="status"
                    className="mt-8 space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5"
                >
                    <p>{t("auth.resetEmailSent")}</p>
                    <Button asChild className="w-full">
                        <Link to="/login">{t("auth.backToLogin")}</Link>
                    </Button>
                </div>
            ) : (
                <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
                    <div className="space-y-2">
                        <label htmlFor="reset-email" className="text-sm font-medium">
                            {t("auth.email")}
                        </label>
                        <Input
                            id="reset-email"
                            type="email"
                            autoComplete="email"
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? "reset-email-error" : undefined}
                            {...register("email", { required: t("auth.emailRequired") })}
                        />
                        {errors.email && (
                            <p
                                id="reset-email-error"
                                className="text-sm text-destructive"
                                role="alert"
                            >
                                {errors.email.message}
                            </p>
                        )}
                    </div>
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    <Button className="w-full" disabled={loading}>
                        {loading ? t("auth.sendingReset") : t("auth.sendReset")}
                    </Button>
                </form>
            )}
        </AuthShell>
    );
}
