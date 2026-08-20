import { z } from "zod";
const optionalImageUrl = z
    .string()
    .trim()
    .max(2048)
    .refine(value => {
        if (!value) return true;
        try {
            return ["http:", "https:"].includes(new URL(value).protocol);
        } catch {
            return false;
        }
    }, "Use uma URL de imagem HTTP ou HTTPS válida");
export const leagueSettingsSchema = z.object({
    name: z.string().trim().min(3).max(50),
    description: z.string().trim().max(500),
    visibility: z.enum(["public", "private"]),
    joinPolicy: z.enum(["open", "request", "invite_only"]),
    maxPlayers: z.number().min(2).max(128),
    lobbyCreationPolicy: z.enum(["admins", "members"]),
    autoStartLobby: z.boolean(),
    avatarUrl: optionalImageUrl,
    bannerUrl: optionalImageUrl,
});
export type LeagueSettingsForm = z.infer<typeof leagueSettingsSchema>;
