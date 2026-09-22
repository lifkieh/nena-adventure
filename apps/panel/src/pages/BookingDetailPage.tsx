import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BOOKING_ACTIONS, bookingActionMeta, auditActionLabel, bookingStatusLabel,
  legalActionsFor, formatJakarta, formatRupiah, normalizeWa, scheduleStatusLabel, type BookingAction,
} from "@nena/shared";
import { ApiError, bookingsApi, notifApi, type HistoryItem, type NotifTemplate } from "../lib/api";
import { useQuery as useRQ } from "@tanstack/react-query";
import { usePermissions } from "../lib/useAuth";
import { useConfirm } from "../components/Confirm";
import { BookingStatus } from "../components/StatusPill";
import { Countdown, holdDeadline, deadlineLabel } from "../components/Countdown";
import { Loading, ErrorState, NoAccess } from "../components/States";

const timelineLabel = auditActionLabel;

export function BookingDetailPage() {
  const { id = "" } = useParams();
  const { has } = usePermissions();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pii, setPii] = useState<Record<number, string | null> | null>(null);
  const [phoneEdit, setPhoneEdit] = useState<{ pid: string; val: string } | null>(null);

  const notifQ = useRQ({ queryKey: ["notif-templates"], queryFn: notifApi.list, enabled: has("booking:write") });
  const smtpQ = useRQ({ queryKey: ["smtp-status"], queryFn: notifApi.smtpStatus, enabled: has("booking:write") });
  const q = useQuery({ queryKey: ["booking", id], queryFn: () => bookingsApi.detail(id), enabled: has("booking:read") && !!id });
  const hist = useQuery({ queryKey: ["booking-history", id], queryFn: () => bookingsApi.history(id), enabled: has("booking:read") && !!id });
  const emailsQ = useQuery({ queryKey: ["booking-emails", id], queryFn: () => bookingsApi.emails(id), enabled: has("booking:read") && !!id });

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

  // #8: email = kanal utama. Konfirmasi (tampilkan tujuan + preview) sebelum kirim.
  async function sendEmail(key: string, label: string) {
    try {
      const pv = await notifApi.preview(id, key);
      if (!pv.emailTo) { setErr("Booking ini tidak punya alamat email."); return; }
      const r = await confirm({
        title: `Kirim email: ${label}?`,
        confirmLabel: "Kirim email",
        body: (
          <div className="space-y-1 text-sm">
            <div><span className="text-slate-400">Ke:</span> <b>{pv.emailTo}</b></div>
            <div><span className="text-slate-400">Subjek:</span> {pv.subject}</div>
            <div className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">{pv.body}</div>
          </div>
        ),
      });
      if (!r.confirmed) return;
      const res = await notifApi.sendEmail(id, key);
      setErr(null);
      setMsg(`Email "${label}" terkirim ke ${res.to}.`);
      qc.invalidateQueries({ queryKey: ["booking-emails", id] });
      qc.invalidateQueries({ queryKey: ["booking-history", id] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal mengirim email."); setMsg(null); }
  }

  // WhatsApp = aksi sekunder manual (buka wa.me di tab baru).
  async function openWa(key: string) {
    try {
      const pv = await notifApi.preview(id, key);
      if (pv.waLink) window.open(pv.waLink, "_blank", "noopener");
      else setErr("Nomor WhatsApp pemesan tidak tersedia.");
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal menyiapkan WhatsApp."); }
  }

  async function savePhone() {
    if (!phoneEdit) return;
    try {
      await bookingsApi.updateParticipantPhone(id, phoneEdit.pid, phoneEdit.val.trim() || null);
      setPhoneEdit(null); setErr(null); setMsg("Nomor peserta tersimpan.");
      qc.invalidateQueries({ queryKey: ["booking", id] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal menyimpan nomor."); }
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
        {deadline && <span className="text-sm text-slate-500">{deadlineLabel(status)}: <Countdown deadline={deadline} /></span>}
      </div>
      {err && <div data-testid="detail-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}

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

      {/* Kirim notifikasi: email = kanal utama (SMTP), WhatsApp = aksi sekunder manual. */}
      {canWrite && (notifQ.data?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="mb-2 font-semibold text-slate-500">Kirim notifikasi</div>
          <div className="space-y-2">
            {notifQ.data!.map((t: NotifTemplate) => {
              const smtpReady = smtpQ.data?.configured ?? false;
              return (
                <div key={t.key} className="flex flex-wrap items-center gap-2">
                  <span className="w-40 text-slate-600">{t.label}</span>
                  <button
                    disabled={!smtpReady}
                    title={smtpReady ? "" : "Atur SMTP dulu di pengaturan"}
                    className="rounded bg-laut px-3 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => sendEmail(t.key, t.label)}
                  >Kirim email</button>
                  <button
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    onClick={() => openWa(t.key)}
                  >WhatsApp (manual)</button>
                </div>
              );
            })}
          </div>
          {!(smtpQ.data?.configured ?? false) && (
            <p className="mt-2 text-xs text-slate-400">SMTP belum dikonfigurasi — tombol "Kirim email" nonaktif. Atur SMTP di environment server.</p>
          )}
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
            <Row k="Sudah dibayar" v={formatRupiah(d.breakdown.amountPaidGross)} />
            <Row k="Sisa tagihan" v={formatRupiah(d.breakdown.outstanding)} />
            {d.cancellation && (d.cancellation.refundAmount > 0 || d.cancellation.cancelReason) && (
              <>
                <div className="my-1 border-t border-slate-100" />
                {d.cancellation.refundAmount > 0 && <Row k="Refund (uang keluar)" v={<span className="text-red-600">{formatRupiah(-d.cancellation.refundAmount)}</span>} rawV />}
                {d.cancellation.cancelReason && <Row k="Alasan pembatalan" v={d.cancellation.cancelReason} />}
                {d.cancellation.cancelledByEmail && <Row k="Dibatalkan oleh" v={d.cancellation.cancelledByEmail} />}
              </>
            )}
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
          {/* Pemesan dari data booking (bukan tebakan isLead). */}
          <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-400">Pemesan:</span> <b>{String(b.customerName)}</b>
            {b.customerPhone ? <> · <a className="text-laut underline" href={`https://wa.me/${normalizeWa(String(b.customerPhone))}`} target="_blank" rel="noreferrer">{String(b.customerPhone)}</a></> : null}
          </div>
          <ul className="space-y-2 text-sm">
            {d.participants.map((p, i) => {
              const wa = p.phone ? normalizeWa(p.phone) : "";
              return (
                <li key={p.id} className="border-b border-slate-100 pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span>{p.name}{p.isLead ? " (pemesan)" : ""}</span>
                    <span className="font-mono text-slate-500" data-testid={`nik-${i}`}>
                      {pii && pii[i] != null ? pii[i] : p.idNumberLast4 ? `•••• ${p.idNumberLast4}` : "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="text-slate-400">No. HP:</span>
                    {p.phone ? (
                      <a className="text-laut underline" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">{wa}</a>
                    ) : <span className="text-slate-400">belum ada</span>}
                    {canWrite && phoneEdit?.pid !== p.id && (
                      <button className="text-slate-500 underline" onClick={() => setPhoneEdit({ pid: p.id, val: p.phone ?? "" })}>ubah</button>
                    )}
                  </div>
                  {canWrite && phoneEdit?.pid === p.id && (
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        className="w-40 rounded border border-slate-300 px-2 py-1 text-xs"
                        placeholder="08xx / 62xx (8–15 digit)"
                        value={phoneEdit.val}
                        onChange={(e) => setPhoneEdit({ pid: p.id, val: e.target.value })}
                      />
                      <button className="rounded bg-laut px-2 py-1 text-xs font-bold text-white" onClick={savePhone}>Simpan</button>
                      <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => setPhoneEdit(null)}>Batal</button>
                    </div>
                  )}
                </li>
              );
            })}
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
                    <div className={`font-bold ${p.amount < 0 ? "text-red-600" : ""}`}>{formatRupiah(p.amount)} · {p.method === "refund" ? "refund (uang keluar)" : p.method}</div>
                    <div className="text-xs text-slate-500">{p.kind} · {p.status === "verified" ? "terverifikasi" : p.status === "rejected" ? "ditolak" : p.status === "refunded" ? "dikembalikan" : "menunggu"}{p.verifiedAt ? ` · ${formatJakarta(p.verifiedAt)}` : ""}</div>
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

        {/* Riwayat email terkirim */}
        <Card title="Riwayat email">
          {emailsQ.isLoading ? <Loading /> : (emailsQ.data?.items.length ?? 0) === 0 ? <Empty>Belum ada email terkirim.</Empty> : (
            <ul className="space-y-2 text-sm">
              {emailsQ.data!.items.map((e) => (
                <li key={e.id} className="border-b border-slate-100 pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">{e.subject ?? e.key ?? "email"}</span>
                    <span className={`text-xs font-bold ${e.status === "success" ? "text-emerald-600" : "text-red-600"}`}>
                      {e.status === "success" ? "berhasil" : "gagal"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {e.to ?? "-"} · {formatJakarta(e.createdAt)} WIB · {e.actorEmail ?? "sistem"}
                  </div>
                  {e.error && <div className="text-xs text-red-600">Galat: {e.error}</div>}
                </li>
              ))}
            </ul>
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
