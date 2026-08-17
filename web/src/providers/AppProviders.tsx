import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { createAppQueryClient } from "@/lib/queryClient";
import { ThemeProvider } from "./ThemeProvider";
type Props = {
    children: ReactNode;
};
const queryClient = createAppQueryClient();
export function AppProviders({ children }: Props) {
    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>{children}</AuthProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}
