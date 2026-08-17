import { useForm } from "react-hook-form";
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
type FormData = {
    email: string;
    password: string;
};
export function LoginPage() {
    const { signIn, signUp, loading, error } = useAuth();
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
    const submit = (mode: "login" | "register") => handleSubmit(async (data) => { try {
        await (mode === "login" ? signIn(data) : signUp(data));
    }
    catch { /* AuthProvider exposes the message. */ } });
    return (
        <main className="grid min-h-screen bg-muted/30 lg:grid-cols-2">
            <section className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
                <Link to="/" className="flex items-center gap-2 text-xl font-bold">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary">L</span>
                    ligas
                </Link>
                <div className="max-w-lg space-y-5">
                    <ShieldCheck className="h-10 w-10"/>
                    <h1 className="text-5xl font-bold leading-tight text-white">{t("auth.heroTitle")}</h1>
                    <p className="text-lg text-white/75">{t("auth.heroDescription")}</p>
                </div>
                <p className="text-sm text-white/60">{t("auth.heroFooter")}</p>
            </section>
    <section className="flex items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl sm:p-9"><Button variant="ghost" className="-ml-3 mb-6" asChild><Link to="/"><ArrowLeft className="h-4 w-4"/> {t("common.back")}</Link></Button><div className="space-y-2"><h1 className="text-3xl font-bold">{t("auth.welcome")}</h1><p className="text-muted-foreground">{t("auth.description")}</p></div><form className="mt-8 space-y-5" onSubmit={submit("login")}><div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">{t("auth.email")}</label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input id="email" className="pl-9" type="email" placeholder={t("auth.emailPlaceholder")} {...register("email", { required: t("auth.emailRequired") })}/></div>{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}</div><div className="space-y-2"><label htmlFor="password" className="text-sm font-medium">{t("auth.password")}</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input id="password" className="pl-9" type="password" placeholder={t("auth.passwordPlaceholder")} {...register("password", { required: t("auth.passwordRequired"), minLength: { value: 6, message: t("auth.passwordMin") } })}/></div>{errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}</div>{error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}<Button className="w-full" size="lg" disabled={loading} type="submit">{loading ? t("auth.loggingIn") : t("auth.login")}</Button><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>{t("auth.or")}<span className="h-px flex-1 bg-border"/></div><Button className="w-full" size="lg" variant="outline" disabled={loading} type="button" onClick={submit("register")}>{t("auth.createMyAccount")}</Button></form></div></section>
  </main>);
}
