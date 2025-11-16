import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');

  const valid = () => {
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    if (password !== confirm) { setError('Passwords do not match'); return false; }
    setError('');
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) { setError('Invalid or missing token'); return; }
    if (!valid()) return;
    setSubmitting(true);
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${base}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to reset password');
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h1>
        <p className="text-sm text-gray-500 mb-6">Create a new password for your account.</p>
        {!done ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e)=> setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white"
                autoComplete="new-password"
              />
              <p className="mt-1 text-[11px] text-gray-500">At least 6 characters.</p>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e)=> setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" className="h-10 px-4 rounded-xl border border-gray-300 text-sm bg-white hover:bg-gray-50" onClick={()=> navigate('/auth')}>Cancel</button>
              <button type="submit" disabled={submitting} className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-70">{submitting ? 'Saving…' : 'Reset Password'}</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">Your password has been reset successfully.</p>
            <div className="flex items-center justify-end">
              <button className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700" onClick={()=> navigate('/auth')}>Go to Sign in</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}