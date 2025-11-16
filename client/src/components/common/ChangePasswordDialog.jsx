import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../lightswind/dialog";
import { Button } from "react-bootstrap";
import { toast } from "../../components/hooks/use-toast";

export default function ChangePasswordDialog({ open, onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const token = typeof window !== "undefined" ? localStorage.getItem("advisys_token") : null;

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