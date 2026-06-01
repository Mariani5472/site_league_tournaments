import { useQuery } from "@tanstack/react-query";
import { getPublicLeagues } from "../services/leagues.service";

export function usePublicLeagues(search: string) {
  return useQuery({
    queryKey: ["public-leagues", search],
    queryFn: () => getPublicLeagues(search)
  })
}