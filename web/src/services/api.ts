import { mySupabase } from "../lib/supabase/supabase";
import axios from "axios";


export const api = axios.create({
  baseURL: "http://localhost:3000"
});

api.interceptors.request.use(async (config) => {
  const { data } = await mySupabase.auth.getSession();
  const token = data.session?.access_token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});