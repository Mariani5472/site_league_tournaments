import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";

type FormData = { password: string; passwordConfirmation: string };

export function ResetPasswordPage() {
    const { updatePassword, loading, error } = useAuth();
    const [updated, setUpdated] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>();
    const submit = handleSubmit(async ({ password }) => {
        try {
            await updatePassword(password);
            setUpdated(true);
        } catch {
            /* provider exposes error */
        }
    });
    return (
        <AuthShell>
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">{t("auth.resetTitle")}</h1>
                <p className="text-muted-foreground">{t("auth.resetDescription")}</p>
            </div>
            {updated ? (
                <div
                    role="status"
                    className="mt-8 space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5"
                >
                    <p>{t("auth.passwordUpdated")}</p>
                    <Button asChild className="w-full">
                        <Link to="/main">{t("auth.continue")}</Link>
                    </Button>
                </div>
            ) : (
                <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
                    <PasswordField
                        id="new-password"
                        label={t("auth.newPassword")}
                        autoComplete="new-password"
                        registration={register("password", {
                            required: t("auth.passwordRequired"),
                            minLength: { value: 10, message: t("auth.passwordMin") },
                        })}
                        error={errors.password?.message}
                    />
                    <PasswordField
                        id="new-password-confirmation"
                        label={t("auth.confirmPassword")}
                        autoComplete="new-password"
                        registration={register("passwordConfirmation", {
                            required: t("auth.confirmPasswordRequired"),
                            validate: (value, values) =>
                                value === values.password || t("auth.passwordMismatch"),
                        })}
                        error={errors.passwordConfirmation?.message}
                    />
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    <Button className="w-full" disabled={loading}>
                        {loading ? t("common.saving") : t("auth.savePassword")}
                    </Button>
                </form>
            )}
        </AuthShell>
    );
}
