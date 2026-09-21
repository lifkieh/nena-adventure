import { createContext, useContext, useState, type ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  withReason?: boolean; // minta alasan (tolak bukti / batal booking)
}
interface ConfirmResult { confirmed: boolean; reason?: string }

type Resolver = (r: ConfirmResult) => void;
const Ctx = createContext<(o: ConfirmOptions) => Promise<ConfirmResult>>(async () => ({ confirmed: false }));
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState("");
  const [resolver, setResolver] = useState<{ fn: Resolver } | null>(null);

  const confirm = (o: ConfirmOptions) =>
    new Promise<ConfirmResult>((resolve) => {
      setReason("");
      setOpts(o);
      setResolver({ fn: resolve });
    });

  function close(r: ConfirmResult) {
    resolver?.fn(r);
    setOpts(null);
    setResolver(null);
  }

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div data-testid="confirm-modal" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">{opts.title}</h3>
            {opts.body && <div data-testid="confirm-body" className="mt-2 text-sm text-slate-600">{opts.body}</div>}
            {opts.withReason && (
              <textarea data-testid="confirm-reason" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Alasan…" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button data-testid="confirm-cancel" onClick={() => close({ confirmed: false })}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Batal</button>
              <button data-testid="confirm-ok"
                disabled={opts.withReason && !reason.trim()}
                onClick={() => close({ confirmed: true, reason: reason.trim() })}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${opts.danger ? "bg-red-600" : "bg-laut"}`}>
                {opts.confirmLabel ?? "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
