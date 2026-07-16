import { useQuery } from "@tanstack/react-query";
import { getMineLeagues } from "../services/leagues.service";

export function useMineLeagues() {
  return useQuery({
    queryKey: ["mine-leagues"],
    queryFn: getMineLeagues
  });
}