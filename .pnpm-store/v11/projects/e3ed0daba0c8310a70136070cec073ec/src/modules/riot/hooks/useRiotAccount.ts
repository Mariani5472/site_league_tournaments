import { useQuery } from "@tanstack/react-query";
import { linkRiotAccount } from "../services/riot.service";

export function useLinkRiotAccount(gameName: string, tagLine: string) {
  return useQuery({
    queryKey: ["riot-account", gameName, tagLine],
    queryFn: () => linkRiotAccount({ gameName, tagLine }),
    enabled: !!gameName && !!tagLine
  });
}