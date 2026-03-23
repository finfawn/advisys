import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../lightswind/dialog";
import { Button } from "react-bootstrap";
import { toast } from "../../components/hooks/use-toast";

export default function ChangePasswordDialog({ open, onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotErr, setForgotErr] = useState("");

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const token = typeof window !== "undefined" ? localStorage.getItem("advisys_token") : null;
  useEffect(() => {
    if (!open) return;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("advisys_user") : null;
      const u = raw ? JSON.parse(raw) : null;
      if (u?.email) setForgotEmail(String(u.email));
    } catch (_) {}
    setForgotOpen(false);
    setForgotDone(false);
    setForgotErr("");
    setForgotSubmitting(false);
  }, [open]);

  const handleSubmit = async () => {
    if (!current || !next || !confirm) {
      toast.warning({ title: "Incomplete", description: "Please fill in all fields" });
      return;
    }
    if (next.length < 6) {
      toast.warning({ title: "Weak password", description: "New password must be at least 6 characters" });
      return;
    }
    if (next !== confirm) {
      toast.warning({ title: "Mismatch", description: "New password and confirmation do not match" });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${apiBase}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to change password");
      toast.success({ title: "Password changed" });
      try {
        const stored = typeof window !== "undefined" ? localStorage.getItem("advisys_user") : null;
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Object.prototype.hasOwnProperty.call(parsed, "must_change_password")) {
            parsed.must_change_password = false;
          }
          localStorage.setItem("advisys_user", JSON.stringify(parsed));
        }
      } catch (_) {}
      onClose?.();
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      toast.destructive({ title: "Change failed", description: err?.message || "Unable to change password" });
    } finally {
      setSubmitting(false);
    }
  };

  const onForgot = async () => {
    const email = String(forgotEmail || "").trim();
    if (!email) {
      setForgotErr("Enter your email.");
      return;
    }
    setForgotSubmitting(true);
    setForgotErr("");
    try {
      await fetch(`${apiBase}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      setForgotDone(true);
    } catch {
      setForgotDone(true);
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" hideClose>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" autoComplete="off" aria-autocomplete="none">
          <div style={{position:'absolute', left:'-9999px', top:'-9999px', width:0, height:0, overflow:'hidden'}} aria-hidden>
            <input type="email" tabIndex={-1} autoComplete="username" value="" onChange={()=>{}} />
            <input type="password" tabIndex={-1} autoComplete="current-password" value="" onChange={()=>{}} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
            <input
              type="text"
              className="w-full border rounded-md px-3 py-2"
              value={current}
              onChange={(e)=>setCurrent(e.target.value)}
              autoComplete="off"
              name="cpw_block"
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-autocomplete="none"
              data-lpignore="true"
              data-1p-ignore
              data-form-type="other"
              readOnly
              onKeyDown={(e)=>e.currentTarget.removeAttribute('readonly')}
              onMouseDown={(e)=>e.currentTarget.removeAttribute('readonly')}
              onTouchStart={(e)=>e.currentTarget.removeAttribute('readonly')}
              style={{ WebkitTextSecurity: 'disc' }}
            />
            <div className="mt-1 text-right">
              <a
                href="#"
                className="text-xs text-blue-700 hover:underline"
                onClick={(e)=>{ e.preventDefault(); setForgotOpen(v=>!v); }}
              >
                Forgot password?
              </a>
            </div>
            {forgotOpen && (
              <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                {!forgotDone ? (
                  <>
                    <input
                      type="email"
                      placeholder="Email"
                      value={forgotEmail}
                      onChange={(e)=> setForgotEmail(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white"
                    />
                    {forgotErr ? <div className="text-xs text-red-600">{forgotErr}</div> : null}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="h-9 px-3 rounded-lg border border-gray-300 text-xs bg-white hover:bg-gray-100"
                        onClick={()=>{ setForgotOpen(false); setForgotErr(""); }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={forgotSubmitting}
                        className="h-9 px-3 rounded-lg bg-[#3360c2] text-white text-xs hover:bg-[#2a51a3] disabled:opacity-70"
                        onClick={onForgot}
                      >
                        {forgotSubmitting ? "Sending…" : "Send link"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-700">If an account exists for this email, we've sent a reset link.</p>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="h-9 px-3 rounded-lg bg-[#3360c2] text-white text-xs hover:bg-[#2a51a3]"
                        onClick={()=> setForgotOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
            <input
              type="text"
              className="w-full border rounded-md px-3 py-2"
              value={next}
              onChange={(e)=>setNext(e.target.value)}
              autoComplete="off"
              name="npw_block"
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-autocomplete="none"
              data-lpignore="true"
              data-1p-ignore
              data-form-type="other"
              readOnly
              onKeyDown={(e)=>e.currentTarget.removeAttribute('readonly')}
              onMouseDown={(e)=>e.currentTarget.removeAttribute('readonly')}
              onTouchStart={(e)=>e.currentTarget.removeAttribute('readonly')}
              style={{ WebkitTextSecurity: 'disc' }}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="text"
              className="w-full border rounded-md px-3 py-2"
              value={confirm}
              onChange={(e)=>setConfirm(e.target.value)}
              autoComplete="off"
              name="npw_confirm_block"
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-autocomplete="none"
              data-lpignore="true"
              data-1p-ignore
              data-form-type="other"
              readOnly
              onKeyDown={(e)=>e.currentTarget.removeAttribute('readonly')}
              onMouseDown={(e)=>e.currentTarget.removeAttribute('readonly')}
              onTouchStart={(e)=>e.currentTarget.removeAttribute('readonly')}
              style={{ WebkitTextSecurity: 'disc' }}
            />
          </div>
        </form>
        <DialogFooter className="mt-4">
          <Button variant="outline-secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Update Password"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
