import { useQuery } from "@tanstack/react-query";

import { getMyProfile } from "../services/profile.service";

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile
  });
}