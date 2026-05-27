import { useQuery } from "@tanstack/react-query";
import { getPublicLeagues } from "../services/leagues.service";

export function usePublicLeagues() {
  return useQuery({
    queryKey: ["public-leagues"],
    queryFn: getPublicLeagues
  })
}