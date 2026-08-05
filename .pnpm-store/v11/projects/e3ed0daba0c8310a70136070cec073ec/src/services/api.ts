import { mySupabase } from "../lib/supabase/supabase";
import axios from "axios";


export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

api.interceptors.request.use(async (config) => {
  const { data } = await mySupabase.auth.getSession();
  const token = data.session?.access_token;

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
      return Promise.reject(new Error(typeof message === "string" ? message : "The request could not be completed"));
    }
    return Promise.reject(error);
  }
);
