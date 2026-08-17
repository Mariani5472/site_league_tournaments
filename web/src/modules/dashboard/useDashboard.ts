import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getDashboard } from "./dashboard.service";

export function useDashboard() {
    return useQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboard });
}
