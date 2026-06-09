import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";
import type { patientPortalRouter } from "../../../server/routers/patientPortal";
import type { externalDoctorsRouter } from "../../../server/routers/externalDoctors";
import type { doctorPortalRouter } from "../../../server/routers/doctorPortal";
import type { inferRouterOutputs, inferRouterInputs } from "@trpc/server";

const _trpc = createTRPCReact<AppRouter>();

// TypeScript struggles to auto-resolve `patientPortal` in the full AppRouter type due to
// type-instantiation depth. We inject it explicitly here using inferred I/O types.
type PortalOut = inferRouterOutputs<typeof patientPortalRouter>;
type PortalIn = inferRouterInputs<typeof patientPortalRouter>;
type TRPCError = { message: string };
type UseQ<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: TRPCError | null;
  refetch: () => void;
};
type UseMut<TIn, TOut> = {
  mutate: (input: TIn) => void;
  mutateAsync: (input: TIn) => Promise<TOut>;
  isPending: boolean;
  reset: () => void;
};

type PortalProcedures = {
  login: {
    useMutation: (opts?: {
      onSuccess?: (d: PortalOut["login"]) => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<{ phone: string; patientCode: string }, PortalOut["login"]>;
  };
  getMyProfile: {
    useQuery: (opts?: object) => UseQ<PortalOut["getMyProfile"]>;
  };
  getMyScans: { useQuery: (opts?: object) => UseQ<PortalOut["getMyScans"]> };
  getAvailableDates: {
    useQuery: (
      input: PortalIn["getAvailableDates"],
      opts?: object,
    ) => UseQ<PortalOut["getAvailableDates"]>;
  };
  createBooking: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<PortalIn["createBooking"], PortalOut["createBooking"]>;
  };
  createGuestBooking: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<
      PortalIn["createGuestBooking"],
      PortalOut["createGuestBooking"]
    >;
  };
  getMyBookings: {
    useQuery: (opts?: object) => UseQ<PortalOut["getMyBookings"]>;
  };
  getNotifications: {
    useQuery: (opts?: object) => UseQ<PortalOut["getNotifications"]>;
  };
  listBookings: {
    useQuery: (
      input: PortalIn["listBookings"],
      opts?: object,
    ) => UseQ<PortalOut["listBookings"]>;
  };
  registerPatientPushToken: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<
      PortalIn["registerPatientPushToken"],
      PortalOut["registerPatientPushToken"]
    >;
  };
  deleteBooking: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<PortalIn["deleteBooking"], PortalOut["deleteBooking"]>;
  };
  updateBooking: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<PortalIn["updateBooking"], PortalOut["updateBooking"]>;
  };
  createStaffBooking: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<
      PortalIn["createStaffBooking"],
      PortalOut["createStaffBooking"]
    >;
  };
  getSchedule: { useQuery: (opts?: object) => UseQ<PortalOut["getSchedule"]> };
  updateSchedule: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<PortalIn["updateSchedule"], PortalOut["updateSchedule"]>;
  };
};

type ExtDocOut = inferRouterOutputs<typeof externalDoctorsRouter>;
type ExtDocIn = inferRouterInputs<typeof externalDoctorsRouter>;
type DrPortalOut = inferRouterOutputs<typeof doctorPortalRouter>;
type DrPortalIn = inferRouterInputs<typeof doctorPortalRouter>;

type ExternalDoctorsProcedures = {
  listDoctors: { useQuery: (opts?: object) => UseQ<ExtDocOut["listDoctors"]> };
  createDoctor: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<ExtDocIn["createDoctor"], ExtDocOut["createDoctor"]>;
  };
  updateDoctor: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<ExtDocIn["updateDoctor"], ExtDocOut["updateDoctor"]>;
  };
  resetPassword: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<ExtDocIn["resetPassword"], ExtDocOut["resetPassword"]>;
  };
  listReferrals: {
    useQuery: (
      input?: ExtDocIn["listReferrals"],
      opts?: object,
    ) => UseQ<ExtDocOut["listReferrals"]>;
  };
  createReferral: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<ExtDocIn["createReferral"], ExtDocOut["createReferral"]>;
  };
  toggleReferral: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<ExtDocIn["toggleReferral"], ExtDocOut["toggleReferral"]>;
  };
  deleteReferral: {
    useMutation: (opts?: {
      onSuccess?: () => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<ExtDocIn["deleteReferral"], ExtDocOut["deleteReferral"]>;
  };
  listAccessLogs: {
    useQuery: (
      input?: ExtDocIn["listAccessLogs"],
      opts?: object,
    ) => UseQ<ExtDocOut["listAccessLogs"]>;
  };
};

type DoctorPortalProcedures = {
  login: {
    useMutation: (opts?: {
      onSuccess?: (d: DrPortalOut["login"]) => void;
      onError?: (e: TRPCError) => void;
    }) => UseMut<DrPortalIn["login"], DrPortalOut["login"]>;
  };
  getMyPatients: {
    useQuery: (opts?: object) => UseQ<DrPortalOut["getMyPatients"]>;
  };
  getPatientImages: {
    useQuery: (
      input: DrPortalIn["getPatientImages"],
      opts?: object,
    ) => UseQ<DrPortalOut["getPatientImages"]>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = _trpc as typeof _trpc & {
  patientPortal: PortalProcedures;
  externalDoctors: ExternalDoctorsProcedures;
  doctorPortal: DoctorPortalProcedures;
};
export const transformer = superjson;
