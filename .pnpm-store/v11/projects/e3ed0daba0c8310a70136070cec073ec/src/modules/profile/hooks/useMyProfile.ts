import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

import { getMyProfile } from "../services/profile.service";

export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: getMyProfile
  });
}
