/**
 * Mobile-Compatible Attendance Hook
 * Works with React Native and mobile web apps
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const tRPC = require('@/lib/trpc').trpc as any;

export interface MobileAttendanceData {
  dashboardSummary: {
    presentToday: number;
    absentToday: number;
    lateToday: number;
    insideNow: number;
    missingCheckout: number;
    lastSyncTime: string;
  };
  deviceStatus: {
    connected: boolean;
    lastPunch?: string;
    punchCount: number;
  };
  dailyAttendance: {
    empCd: string;
    workDate: string;
    status: string;
    lateMinutes: number;
    overtimeMinutes: number;
  }[];
}

/**
 * Hook: Fetch dashboard summary for mobile
 */
export function useAttendanceDashboard() {
  return useQuery({
    queryKey: ['attendance:mobile:dashboard'],
    queryFn: () => tRPC.attendance.dashboardSummary.query(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Data is stale after 10 seconds
  });
}

/**
 * Hook: Fetch daily attendance by employee
 */
export function useDailyAttendance(empCd: string, fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['attendance:mobile:daily', empCd, fromDate, toDate],
    queryFn: () =>
      tRPC.attendance.dailyByEmployee.query({
        empCd,
        fromDate,
        toDate,
      }),
    enabled: !!empCd && !!fromDate && !!toDate,
  });
}

/**
 * Hook: Fetch recent punches for mobile
 */
export function useRecentPunches(limit: number = 20) {
  return useQuery({
    queryKey: ['attendance:mobile:punches', limit],
    queryFn: () =>
      tRPC.attendance.rawPunches.query({
        limit,
        fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      }),
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook: Device connection status for mobile
 */
export function useDeviceStatus() {
  return useQuery({
    queryKey: ['attendance:mobile:device'],
    queryFn: () => tRPC.attendance.deviceStatus.query(),
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

/**
 * Hook: Manual punch submission for mobile (future)
 */
export function useSubmitPunch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (punchData: {
      empCd: string;
      punchAt: string;
      direction: 'in' | 'out';
    }) => {
      // Future: Create a manual punch submission endpoint
      // For now, return placeholder
      return { success: true, message: 'Punch submitted' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance:mobile:punches'] });
      queryClient.invalidateQueries({ queryKey: ['attendance:mobile:daily'] });
    },
  });
}

/**
 * Hook: Leave request submission for mobile
 */
export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leaveData: {
      empCd: string;
      dateFrom: string;
      dateTo: string;
      type: 'annual' | 'sick' | 'unpaid' | 'other';
      note?: string;
    }) => tRPC.attendance.createLeave.mutate(leaveData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance:mobile:daily'] });
    },
  });
}

/**
 * Hook: Get leave balance for mobile
 */
export function useLeaveBalance(empCd: string, year?: number) {
  return useQuery({
    queryKey: ['attendance:mobile:leaves', empCd, year],
    queryFn: () =>
      tRPC.attendance.leaveBalance.query({
        empCd,
        year: year || new Date().getFullYear(),
      }),
    enabled: !!empCd,
  });
}

/**
 * Offline data sync support
 * Stores data locally for offline access
 */
export async function cacheAttendanceData(data: MobileAttendanceData) {
  try {
    if ('localStorage' in window) {
      localStorage.setItem('attendance:cache', JSON.stringify(data));
      localStorage.setItem('attendance:cache:timestamp', new Date().toISOString());
    }
  } catch (err) {
    console.warn('Failed to cache attendance data:', err);
  }
}

export function getCachedAttendanceData(): MobileAttendanceData | null {
  try {
    if ('localStorage' in window) {
      const data = localStorage.getItem('attendance:cache');
      return data ? JSON.parse(data) : null;
    }
  } catch (err) {
    console.warn('Failed to retrieve cached attendance data:', err);
  }
  return null;
}

export function clearAttendanceCache() {
  try {
    if ('localStorage' in window) {
      localStorage.removeItem('attendance:cache');
      localStorage.removeItem('attendance:cache:timestamp');
    }
  } catch (err) {
    console.warn('Failed to clear attendance cache:', err);
  }
}
