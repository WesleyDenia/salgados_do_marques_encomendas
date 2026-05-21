"use client";

import { useQuery } from "@tanstack/react-query";

import { getDailyPlanning } from "@/features/planning/api";

export const planningKeys = {
  all: ["planning"] as const,
  daily: (day: string) => [...planningKeys.all, "daily", day] as const,
};

export function useDailyPlanning(day: string, enabled = true) {
  return useQuery({
    queryKey: planningKeys.daily(day),
    queryFn: () => getDailyPlanning(day),
    enabled,
    refetchInterval: 30_000,
  });
}
