"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getDailyPlanning,
  getPeriodPlanning,
  getWeeklyPlanning,
} from "@/features/planning/api";

export const planningKeys = {
  all: ["planning"] as const,
  daily: (day: string) => [...planningKeys.all, "daily", day] as const,
  weekly: (weekStart: string) =>
    [...planningKeys.all, "weekly", weekStart] as const,
  period: (startDate: string, endDate: string) =>
    [...planningKeys.all, "period", startDate, endDate] as const,
};

export function useDailyPlanning(day: string, enabled = true) {
  return useQuery({
    queryKey: planningKeys.daily(day),
    queryFn: () => getDailyPlanning(day),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useWeeklyPlanning(weekStart: string, enabled = true) {
  return useQuery({
    queryKey: planningKeys.weekly(weekStart),
    queryFn: () => getWeeklyPlanning(weekStart),
    enabled,
    refetchInterval: 30_000,
  });
}

export function usePeriodPlanning(
  startDate: string,
  endDate: string,
  enabled = true,
) {
  return useQuery({
    queryKey: planningKeys.period(startDate, endDate),
    queryFn: () => getPeriodPlanning(startDate, endDate),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}
