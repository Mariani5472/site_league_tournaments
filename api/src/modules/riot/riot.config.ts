export type RiotConfiguration = {
    enabled: boolean;
    region: string | null;
};
export function getRiotConfiguration(): RiotConfiguration {
    const token = process.env.RIOT_API_KEY?.trim();
    const region = process.env.RIOT_REGION?.trim();
    return {
        enabled: Boolean(token && region),
        region: token && region ? region : null,
    };
}
export function getRiotCredentials() {
    const configuration = getRiotConfiguration();
    const token = process.env.RIOT_API_KEY?.trim();
    if (!configuration.enabled || !configuration.region || !token)
        return null;
    return { token, region: configuration.region };
}
