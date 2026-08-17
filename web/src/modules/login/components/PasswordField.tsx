import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";

type Props = { id: string; label: string; autoComplete: "current-password" | "new-password"; registration: UseFormRegisterReturn; error?: string };

export function PasswordField({ id, label, autoComplete, registration, error }: Props) {
    const [visible, setVisible] = useState(false);
    const toggleLabel = visible ? t("auth.hidePassword") : t("auth.showPassword");
    return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label><div className="relative">
        <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
        <Input id={id} className="px-9" type={visible ? "text" : "password"} autoComplete={autoComplete} {...registration}/>
        <button type="button" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={toggleLabel} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
    </div>{error && <p className="text-sm text-destructive">{error}</p>}</div>;
}
