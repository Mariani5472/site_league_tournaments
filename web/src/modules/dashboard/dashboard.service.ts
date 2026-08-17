import { api } from "@/services/api";
import type { DashboardData } from "./types";

export async function getDashboard() {
    return (await api.get<DashboardData>("/dashboard")).data;
}
