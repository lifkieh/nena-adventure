import { useQuery } from "@tanstack/react-query";
import type { MeResponse } from "@nena/shared";
import { authApi } from "./api";

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: authApi.me,
    retry: false,
    staleTime: 60_000,
  });
}

/** Hook cek izin efektif dari sesi saat ini. */
export function usePermissions(): {
  has: (perm: string) => boolean;
  permissions: string[];
} {
  const { data } = useMe();
  const permissions = data?.permissions ?? [];
  return { has: (perm) => permissions.includes(perm), permissions };
}
