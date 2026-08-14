import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { createAppQueryClient } from "@/lib/queryClient";
type Props = {
    children: ReactNode;
};
const queryClient = createAppQueryClient();
export function AppProviders({ children }: Props) {
    return (<QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>);
}
