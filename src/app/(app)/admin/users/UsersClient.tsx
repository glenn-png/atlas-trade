"use client";

import { useState, useTransition } from "react";
import { createUser, updateUser, resetPassword } from "./actions";
import { Plus, Pencil, KeyRound, X, Check } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date;
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
      role === "ADMIN"
        ? "bg-accent/15 text-accent"
        : "bg-navy-700 text-slate-300"
    }`}>
      {role}
    </span>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" as "ADMIN" | "STAFF" });
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await createUser(form);
        onClose();
      } catch {
        setError("Failed to create user. Email may already be in use.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-navy-800 border border-white/10 rounded-[12px] w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[15px] font-bold text-white">Add User</div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text" required placeholder="Full name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-navy-900 border border-white/10 rounded-[8px] text-white text-[14px] px-4 py-2.5 outline-none focus:border-accent"
          />
          <input
            type="email" required placeholder="Email address" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-navy-900 border border-white/10 rounded-[8px] text-white text-[14px] px-4 py-2.5 outline-none focus:border-accent"
          />
          <input
            type="password" required placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full bg-navy-900 border border-white/10 rounded-[8px] text-white text-[14px] px-4 py-2.5 outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            {(["STAFF", "ADMIN"] as const).map((r) => (
              <button
                key={r} type="button"
                onClick={() => setForm({ ...form, role: r })}
                className={`flex-1 py-2 rounded-[6px] text-[12px] font-semibold border transition-colors ${
                  form.role === r
                    ? "bg-accent text-white border-transparent"
                    : "bg-navy-900 text-slate-300 border-white/10 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {error && <div className="text-[12px] text-red-400">{error}</div>}
          <button
            type="submit" disabled={isPending}
            className="w-full bg-accent text-white font-semibold text-[14px] py-3 rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
          >
            {isPending ? "Creating…" : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"details" | "password">("details");
  const [form, setForm] = useState({ name: user.name, role: user.role as "ADMIN" | "STAFF", active: user.active });
  const [newPassword, setNewPassword] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateUser({ id: user.id, ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) return;
    startTransition(async () => {
      await resetPassword({ id: user.id, password: newPassword });
      setNewPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-navy-800 border border-white/10 rounded-[12px] w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[15px] font-bold text-white">{user.name}</div>
            <div className="text-[12px] text-slate-400">{user.email}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          {(["details", "password"] as const).map((t) => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-[6px] text-[12px] font-semibold border transition-colors ${
                tab === t ? "bg-accent text-white border-transparent" : "bg-navy-900 text-slate-300 border-white/10"
              }`}
            >
              {t === "details" ? "Details" : "Reset Password"}
            </button>
          ))}
        </div>

        {tab === "details" ? (
          <form onSubmit={handleSave} className="space-y-3">
            <input
              type="text" required placeholder="Full name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-navy-900 border border-white/10 rounded-[8px] text-white text-[14px] px-4 py-2.5 outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              {(["STAFF", "ADMIN"] as const).map((r) => (
                <button
                  key={r} type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={`flex-1 py-2 rounded-[6px] text-[12px] font-semibold border transition-colors ${
                    form.role === r ? "bg-accent text-white border-transparent" : "bg-navy-900 text-slate-300 border-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[13px] text-slate-300">Active</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, active: !form.active })}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? "bg-success" : "bg-navy-600"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <button
              type="submit" disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold text-[14px] py-3 rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saved ? <><Check size={14} /> Saved</> : isPending ? "Saving…" : "Save Changes"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3">
            <input
              type="password" required placeholder="New password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-navy-900 border border-white/10 rounded-[8px] text-white text-[14px] px-4 py-2.5 outline-none focus:border-accent"
            />
            <button
              type="submit" disabled={isPending || !newPassword}
              className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold text-[14px] py-3 rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saved ? <><Check size={14} /> Password updated</> : isPending ? "Updating…" : <><KeyRound size={14} /> Reset Password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function UsersClient({ users }: { users: User[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  return (
    <div>
      <div className="bg-navy-900 border-b border-white/7 px-6 py-3 flex items-center justify-between">
        <div>
          <div className="text-[15px] font-bold text-white">Users</div>
          <div className="text-[13px] text-slate-400">{users.length} user{users.length !== 1 ? "s" : ""}</div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white text-[12px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity"
        >
          <Plus size={13} /> Add User
        </button>
      </div>

      <div className="p-6 space-y-2 max-w-2xl">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[6px] bg-gradient-to-br from-accent to-purple flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-white">{user.name}</span>
                  <RoleBadge role={user.role} />
                  {!user.active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-danger/15 text-danger uppercase tracking-wider">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-slate-400">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => setEditing(user)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-white text-[12px] border border-white/7 hover:border-white/20 rounded-[6px] transition-colors"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>
        ))}
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
