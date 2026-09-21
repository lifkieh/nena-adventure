import { bookingStatusMeta, scheduleStatusMeta, type StatusMeta } from "@nena/shared";

const CLASS: Record<StatusMeta["color"], string> = {
  slate: "bg-slate-100 text-slate-600",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
};

function Pill({ meta, raw }: { meta: StatusMeta | undefined; raw: string }) {
  const m = meta ?? { label: raw, color: "slate" as const };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${CLASS[m.color]}`}>{m.label}</span>;
}

export function BookingStatus({ status }: { status: string }) {
  return <Pill meta={(bookingStatusMeta as Record<string, StatusMeta>)[status]} raw={status} />;
}
export function ScheduleStatus({ status }: { status: string }) {
  return <Pill meta={(scheduleStatusMeta as Record<string, StatusMeta>)[status]} raw={status} />;
}
