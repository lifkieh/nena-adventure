import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BOOKING_ACTIONS, bookingActionMeta, bookingActionLabel, bookingStatusLabel,
  legalActionsFor, formatJakarta, formatRupiah, scheduleStatusLabel, type BookingAction,
} from "@nena/shared";
import { ApiError, bookingsApi, type HistoryItem } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { useConfirm } from "../components/Confirm";
import { BookingStatus } from "../components/StatusPill";
import { Countdown, holdDeadline } from "../components/Countdown";
import { Loading, ErrorState, NoAccess } from "../components/States";

function timelineLabel(action: string): string {
  if (action === "booking_created") return "Booking dibuat";
  if (action === "pii_access") return "Data peserta dibuka";
  if (action.startsWith("booking_")) return bookingActionLabel(action.slice("booking_".length));
  return action;
}

export function BookingDetailPage() {
  const { id = "" } = useParams();
  const { has } = usePermissions();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [err, setErr] = useState<string | null>(null);
  const [pii, setPii] = useState<Record<number, string | null> | null>(null);

  const q = useQuery({ queryKey: ["booking", id], queryFn: () => bookingsApi.detail(id), enabled: has("booking:read") && !!id });
  const hist = useQuery({ queryKey: ["booking-history", id], queryFn: () => bookingsApi.history(id), enabled: has("booking:read") && !!id });

  if (!has("booking:read")) return <NoAccess />;
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message="Tidak bisa memuat detail booking." onRetry={() => q.refetch()} />;

  const d = q.data;
  const b = d.booking;
  const status = String(b.status);
  const legal = new Set(legalActionsFor(status));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["booking", id] }); qc.invalidateQueries({ queryKey: ["booking-history", id] }); qc.invalidateQueries({ queryKey: ["bookings"] }); };

  async function doAction(a: BookingAction) {
    const meta = bookingActionMeta[a];
    let reason: string | undefined;
    const body = <>Booking <b>{String(b.code)}</b> · {bookingStatusLabel(status)} · {formatRupiah(Number(b.total))}</>;
    if (meta.requiresReason) {
      const r = await confirm({ title: `${meta.label}?`, danger: meta.danger, withReason: true, confirmLabel: meta.label, body });
      if (!r.confirmed || !r.reason) return;
      reason = r.reason;
    } else {
      const r = await confirm({ title: `${meta.label}?`, confirmLabel: meta.label, body });
      if (!r.confirmed) return;
    }
    const p = a === "cancel" ? bookingsApi.cancel(id, reason!) : bookingsApi.transition(id, a, reason);
    p.then(() => { setErr(null); refresh(); }).catch((e) => setErr(e instanceof ApiError ? e.message : "Aksi gagal."));
  }

  async function openPii() {
    try {
      const res = await bookingsApi.pii(id);
      const map: Record<number, string | null> = {};
      res.participants.forEach((p, i) => { map[i] = p.idNumber; });
      setPii(map);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Tidak bisa membuka data."); }
  }

  const canWrite = has("booking:write");
  const deadline = holdDeadline(b);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/bookings" className="text-sm text-slate-500 hover:underline">‹ Booking</Link>
        <h2 className="text-xl font-extrabold text-slate-800">{String(b.code)}</h2>
        <BookingStatus status={status} />
        {deadline && <span className="text-sm text-slate-500">Sisa hold: <Countdown deadline={deadline} /></span>}
      </div>
      {err && <div data-testid="detail-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}

      {/* Aksi state-machine */}
      {canWrite && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
          {BOOKING_ACTIONS.map((a) => {
            const allowed = legal.has(a) && (a === "cancel" ? has("booking:cancel") : true);
            const tip = !legal.has(a) ? "Tidak tersedia dari status pesanan saat ini" : a === "cancel" && !has("booking:cancel") ? "Anda tidak punya izin membatalkan" : "";
            if (!allowed && !legal.has(a)) {
              return <button key={a} data-action={a} data-active="false" disabled title={tip} className="cursor-not-allowed rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-300">{bookingActionMeta[a].label}</button>;
            }
            return (
              <button key={a} data-action={a} data-active={String(allowed)} disabled={!allowed} title={tip}
                onClick={() => doAction(a)}
                className={`rounded px-3 py-1.5 text-xs font-bold ${bookingActionMeta[a].danger ? "bg-red-600 text-white" : "bg-laut text-white"} disabled:cursor-not-allowed disabled:opacity-40`}>
                {bookingActionMeta[a].label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Jadwal */}
        <Card title="Tanggal & jadwal">
          {d.schedule ? (
            <dl className="text-sm">
              <Row k="Tanggal" v={formatJakarta(d.schedule.date + "T00:00:00Z", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
              <Row k="Berangkat" v={`${d.schedule.departureTime ?? "07:00"} WIB`} />
              <Row k="Meeting point" v={d.schedule.meetingPoint ?? "-"} />
              <Row k="Status jadwal" v={scheduleStatusLabel(d.schedule.status)} />
            </dl>
          ) : <Empty>Jadwal tidak ditemukan.</Empty>}
        </Card>

        {/* Paket + harga */}
        <Card title="Paket & rincian harga">
          <dl className="text-sm">
            <Row k="Paket" v={d.package?.name ?? String(b.packageType)} />
            <Row k="Peserta" v={`${Number(b.pax)} orang`} />
            <Row k="Skema bayar" v={String(b.paymentScheme) === "dp" ? "DP dulu" : "Lunas"} />
            <Row k="Subtotal" v={formatRupiah(d.breakdown.subtotal)} />
            {d.breakdown.discount > 0 && <Row k="Diskon" v={`- ${formatRupiah(d.breakdown.discount)}`} />}
            <Row k="Biaya layanan" v={formatRupiah(d.breakdown.serviceFee)} />
            <Row k="Total" v={<b>{formatRupiah(d.breakdown.total)}</b>} rawV />
            <Row k="Sudah dibayar" v={formatRupiah(d.breakdown.amountPaid)} />
            <Row k="Sisa tagihan" v={formatRupiah(d.breakdown.outstanding)} />
          </dl>
        </Card>

        {/* Kontak pemesan */}
        <Card title="Kontak pemesan">
          <dl className="text-sm">
            <Row k="Nama" v={String(b.customerName)} />
            <Row k="HP" v={String(b.customerPhone)} />
            <Row k="Email" v={String(b.customerEmail)} />
          </dl>
        </Card>

        {/* Peserta */}
        <Card title="Daftar peserta">
          <ul className="space-y-1 text-sm">
            {d.participants.map((p, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{p.name}{p.isLead ? " (pemesan)" : ""}</span>
                <span className="font-mono text-slate-500" data-testid={`nik-${i}`}>
                  {pii && pii[i] != null ? pii[i] : p.idNumberLast4 ? `•••• ${p.idNumberLast4}` : "—"}
                </span>
              </li>
            ))}
          </ul>
          {has("participant:read_pii") && !pii && (
            <button data-testid="buka-nik" className="mt-2 rounded border border-slate-300 px-3 py-1 text-xs font-semibold" onClick={openPii}>Buka NIK (tercatat audit)</button>
          )}
          {!has("participant:read_pii") && <p data-testid="pii-locked" className="mt-2 text-xs text-slate-400">NIK terkunci — butuh izin.</p>}
        </Card>

        {/* Riwayat pembayaran */}
        <Card title="Riwayat pembayaran">
          {d.payments.length === 0 ? <Empty>Belum ada pembayaran.</Empty> : (
            <ul className="space-y-2 text-sm">
              {d.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  {p.proofUrl && has("payment:read") ? <a href={p.proofUrl} target="_blank" rel="noreferrer"><img src={p.proofUrl} alt="bukti" className="h-12 w-12 rounded object-cover" /></a> : <div className="h-12 w-12 rounded bg-slate-100" />}
                  <div>
                    <div className="font-bold">{formatRupiah(p.amount)} · {p.method}</div>
                    <div className="text-xs text-slate-500">{p.kind} · {p.status === "verified" ? "terverifikasi" : p.status === "rejected" ? "ditolak" : "menunggu"}{p.verifiedAt ? ` · ${formatJakarta(p.verifiedAt)}` : ""}</div>
                    {p.rejectedReason && <div className="text-xs text-red-600">Alasan tolak: {p.rejectedReason}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Timeline */}
        <Card title="Riwayat status">
          {hist.isLoading ? <Loading /> : (hist.data?.items.length ?? 0) === 0 ? <Empty>Belum ada riwayat.</Empty> : (
            <ol className="space-y-2 text-sm">
              {hist.data!.items.map((h: HistoryItem, i) => (
                <li key={i} className="border-l-2 border-slate-200 pl-3">
                  <div className="font-semibold text-slate-700">{timelineLabel(h.action)}</div>
                  <div className="text-xs text-slate-400">{formatJakarta(h.createdAt)} WIB · {h.actorEmail ?? "sistem"}</div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-bold text-slate-600">{title}</h3>
      {children}
    </div>
  );
}
function Row({ k, v, rawV }: { k: string; v: React.ReactNode; rawV?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <dt className="text-slate-400">{k}</dt>
      <dd className="text-right text-slate-700">{rawV ? v : <span>{v}</span>}</dd>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}
