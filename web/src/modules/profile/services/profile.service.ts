import { api } from "@/services/api";
import type { Profile, PublicProfile } from "../types/profile";
export async function getMyProfile() {
    const { data } = await api.get<Profile>("/profile");
    return data;
}
export async function getPublicProfile(userId: string) {
    return (await api.get<PublicProfile>(`/players/${userId}`)).data;
}
export async function updateProfile(info: {
    nickname: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
}) {
    const { data } = await api.patch<Profile>("/profile", info);
    return data;
}
