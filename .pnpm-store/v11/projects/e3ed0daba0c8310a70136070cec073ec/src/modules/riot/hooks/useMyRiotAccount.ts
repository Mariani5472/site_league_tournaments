import { useQuery } from "@tanstack/react-query";

import { getMyRiotAccount } from "../services/riot.service";

export function useMyRiotAccount() {
  return useQuery({
    queryKey: ["my-riot-account"],
    queryFn: getMyRiotAccount
  });
}