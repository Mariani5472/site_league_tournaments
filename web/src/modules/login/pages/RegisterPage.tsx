import { useState } from "react";
import { useForm } from "react-hook-form";
import { Mail } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";
import { safeReturnTo } from "../return-to";

type FormData = { email: string; password: string; passwordConfirmation: string };
const PASSWORD_MIN_LENGTH = 10;

export function RegisterPage() {
    const { signUp, loading, error } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [confirmationEmail, setConfirmationEmail] = useState<string>();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>();
    const submit = handleSubmit(async ({ email, password }) => {
        try {
            const result = await signUp({ email, password });
            if (result.status === "confirmation_required") setConfirmationEmail(result.email);
            else navigate(safeReturnTo(params.get("returnTo")), { replace: true });
        } catch {
            /* AuthProvider exposes the localized message. */
        }
    });
    if (confirmationEmail)
        return (
            <AuthShell>
                <div
                    role="status"
                    className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5"
                >
                    <h1 className="text-2xl font-bold">{t("auth.confirmationTitle")}</h1>
                    <p>{t("auth.confirmationDescription", { email: confirmationEmail })}</p>
                    <p className="text-sm text-muted-foreground">{t("auth.confirmationHint")}</p>
                    <Button asChild className="w-full">
                        <Link to="/login">{t("auth.backToLogin")}</Link>
                    </Button>
                </div>
            </AuthShell>
        );
    return (
        <AuthShell>
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">{t("auth.registerTitle")}</h1>
                <p className="text-muted-foreground">{t("auth.registerDescription")}</p>
            </div>
            <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
                <div className="space-y-2">
                    <label htmlFor="register-email" className="text-sm font-medium">
                        {t("auth.email")}
                    </label>
                    <div className="relative">
                        <Mail
                            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <Input
                            id="register-email"
                            className="pl-9"
                            type="email"
                            autoComplete="email"
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? "register-email-error" : undefined}
                            {...register("email", { required: t("auth.emailRequired") })}
                        />
                    </div>
                    {errors.email && (
                        <p
                            id="register-email-error"
                            className="text-sm text-destructive"
                            role="alert"
                        >
                            {errors.email.message}
                        </p>
                    )}
                </div>
                <PasswordField
                    id="register-password"
                    label={t("auth.password")}
                    autoComplete="new-password"
                    registration={register("password", {
                        required: t("auth.passwordRequired"),
                        minLength: { value: PASSWORD_MIN_LENGTH, message: t("auth.passwordMin") },
                    })}
                    error={errors.password?.message}
                />
                <PasswordField
                    id="register-password-confirmation"
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
                    <p
                        className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
                <Button className="w-full" size="lg" disabled={loading} type="submit">
                    {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                    {t("auth.hasAccount")}{" "}
                    <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        to="/login"
                    >
                        {t("auth.login")}
                    </Link>
                </p>
            </form>
        </AuthShell>
    );
}
