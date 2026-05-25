import { useQuery } from "@tanstack/react-query";
import { getMyLeagues } from "../services/leagues.service";

export function useMyLeagues() {
  return useQuery({
    queryKey: ["my-leagues"],
    queryFn: getMyLeagues
  });
}