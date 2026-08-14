import type { ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
type Props = {
    children: ReactNode;
};
const queryClient = new QueryClient();
export function AppProviders({ children }: Props) {
    return (<QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>);
}
