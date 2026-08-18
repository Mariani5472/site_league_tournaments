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

type FormData = { email: string; password: string };

export function LoginPage() {
    const { signIn, loading, error } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>();
    const returnTo = params.get("returnTo");
    const submit = handleSubmit(async data => {
        try {
            await signIn(data);
            navigate(safeReturnTo(returnTo), { replace: true });
        } catch {
            /* AuthProvider exposes the localized message. */
        }
    });
    return (
        <AuthShell>
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">{t("auth.loginTitle")}</h1>
                <p className="text-muted-foreground">{t("auth.loginDescription")}</p>
            </div>
            <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
                <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-medium">
                        {t("auth.email")}
                    </label>
                    <div className="relative">
                        <Mail
                            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <Input
                            id="login-email"
                            className="pl-9"
                            type="email"
                            autoComplete="email"
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? "login-email-error" : undefined}
                            {...register("email", { required: t("auth.emailRequired") })}
                        />
                    </div>
                    {errors.email && (
                        <p id="login-email-error" className="text-sm text-destructive" role="alert">
                            {errors.email.message}
                        </p>
                    )}
                </div>
                <PasswordField
                    id="login-password"
                    label={t("auth.password")}
                    autoComplete="current-password"
                    registration={register("password", { required: t("auth.passwordRequired") })}
                    error={errors.password?.message}
                />
                <div className="text-right">
                    <Link
                        className="text-sm text-primary underline-offset-4 hover:underline"
                        to="/forgot-password"
                    >
                        {t("auth.forgotPassword")}
                    </Link>
                </div>
                {error && (
                    <p
                        className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
                <Button className="w-full" size="lg" disabled={loading} type="submit">
                    {loading ? t("auth.loggingIn") : t("auth.login")}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                    {t("auth.noAccount")}{" "}
                    <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        to={`/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                    >
                        {t("auth.createAccount")}
                    </Link>
                </p>
            </form>
        </AuthShell>
    );
}
