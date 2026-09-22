import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userRoleSchema, type UserDto, type UserRole } from "@nena/shared";
import { ApiError, usersApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";

const ROLES = userRoleSchema.options;

export function UsersPage() {
  const { has } = usePermissions();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "viewer" as UserRole,
    password: "",
  });

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: usersApi.list });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const wrap = <T,>(p: Promise<T>) =>
    p.then(refresh).catch((e) =>
      setError(e instanceof ApiError ? e.message : "Terjadi kesalahan."),
    );

  const createMut = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      setForm({ email: "", name: "", role: "viewer", password: "" });
      setError(null);
      refresh();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Terjadi kesalahan."),
  });

  if (!has("user:manage")) {
    return (
      <p className="text-sm text-slate-500">
        Anda tidak punya izin untuk mengelola pengguna.
      </p>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">
        Pengguna &amp; peran
      </h2>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Buat pengguna */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate();
        }}
        className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-5"
      >
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Nama"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Password awal"
          type="text"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button
          type="submit"
          disabled={createMut.isPending}
          className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          Tambah
        </button>
      </form>

      {/* Daftar pengguna */}
      <input className="mt-4 w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Cari email/nama/peran" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.data?.filter((u) => { const s = search.trim().toLowerCase(); return !s || u.email.toLowerCase().includes(s) || (u.name ?? "").toLowerCase().includes(s) || u.role.includes(s); }).map((u) => (
              <UserRow key={u.id} user={u} onError={setError} onDone={refresh} wrap={wrap} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserRow({
  user,
  wrap,
}: {
  user: UserDto;
  onError: (m: string) => void;
  onDone: () => void;
  wrap: <T>(p: Promise<T>) => Promise<unknown>;
}) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-2 font-semibold">{user.name}</td>
      <td className="px-4 py-2 text-slate-500">{user.email}</td>
      <td className="px-4 py-2">
        <select
          value={user.role}
          onChange={(e) =>
            wrap(usersApi.updateRole(user.id, e.target.value as UserRole))
          }
          className="rounded border border-slate-300 px-2 py-1 text-xs"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            user.active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {user.active ? "Aktif" : "Nonaktif"}
        </span>
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
            onClick={() => {
              if (
                confirm(
                  `${user.active ? "Nonaktifkan" : "Aktifkan"} ${user.email}?`,
                )
              ) {
                wrap(usersApi.setActive(user.id, !user.active));
              }
            }}
          >
            {user.active ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button
            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
            onClick={() => {
              const pw = prompt(`Password baru untuk ${user.email}:`);
              if (pw) wrap(usersApi.resetPassword(user.id, pw));
            }}
          >
            Reset sandi
          </button>
          <button
            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-red-600"
            onClick={() => {
              if (confirm(`Cabut semua sesi ${user.email}?`)) {
                wrap(usersApi.revokeSessions(user.id));
              }
            }}
          >
            Cabut sesi
          </button>
        </div>
      </td>
    </tr>
  );
}
