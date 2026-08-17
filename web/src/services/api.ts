import { mySupabase } from "../lib/supabase/supabase";
import { getAccessToken } from "../lib/supabase/session";
import axios from "axios";
import { ApiError } from "./api-errors";
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});
api.interceptors.request.use(async config => {
    const { data } = await mySupabase.auth.getSession();
    const token = getAccessToken(data.session);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use(
    response => response,
    error => {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message;
            const code = error.response?.data?.code;
            return Promise.reject(
                new ApiError(
                    typeof message === "string" ? message : "The request could not be completed.",
                    error.response?.status,
                    typeof code === "string" ? code : undefined
                )
            );
        }
        return Promise.reject(error);
    }
);
