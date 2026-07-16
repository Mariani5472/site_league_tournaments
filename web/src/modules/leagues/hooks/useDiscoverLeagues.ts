import { useQuery } from "@tanstack/react-query";
import { getDiscoverLeagues } from "../services/leagues.service";

export function useDiscoverLeagues(search?: string) {
  return useQuery({
    queryKey: ["discover-leagues", search],
    queryFn: () => getDiscoverLeagues(search)
  })
}