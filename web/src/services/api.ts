import { mySupabase } from "../lib/supabase/supabase";
import { getAccessToken } from "../lib/supabase/session";
import axios from "axios";
export class ApiError extends Error {
    readonly status?: number;
    readonly code?: string;
    constructor(message: string, status?: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}
export function mutationErrorMessage(error: unknown) {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 403:
                return "You do not have permission to perform this action.";
            case 404:
                return "The requested resource was not found.";
            case 409:
                return error.message || "This action conflicts with the current state. Refresh and try again.";
            default:
                if (error.status && error.status >= 500) {
                    return "An unexpected server error occurred. Please try again.";
                }
        }
    }
    return error instanceof Error && error.message
        ? error.message
        : "The request could not be completed.";
}
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
});
api.interceptors.request.use(async (config) => {
    const { data } = await mySupabase.auth.getSession();
    const token = getAccessToken(data.session);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use(response => response, error => {
    if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        const code = error.response?.data?.code;
        return Promise.reject(new ApiError(
            typeof message === "string" ? message : "The request could not be completed.",
            error.response?.status,
            typeof code === "string" ? code : undefined
        ));
    }
    return Promise.reject(error);
});
