import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../lightswind/alert-dialog";
import {
  ADVISYS_SESSION_ACTIVITY_KEY,
  ADVISYS_SESSION_LOGOUT_KEY,
  publishSessionActivity,
  publishSessionLogout,
} from "../lib/sessionSync";

export default function SessionHandler() {
  const navigate = useNavigate();
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const isLogoutProcessing = useRef(false);
  const idleTimer = useRef(null);
  const lastActivityBroadcastRef = useRef(0);
  const idleMs = (Number(import.meta.env.VITE_SESSION_IDLE_MINUTES || 20) || 20) * 60 * 1000;
  
  useEffect(() => {
    let tokenTimer;

    // Define handleLogout inside useEffect to avoid closure/dependency issues
    const handleLogout = (isExpiry, origin = "local") => {
      if (isLogoutProcessing.current) return;
      
      const token = localStorage.getItem('advisys_token');
      // If we have a token, or if it's a 401, we should clean up
      if (token || !isExpiry) {
        isLogoutProcessing.current = true;
        localStorage.removeItem('advisys_token');
        localStorage.removeItem('advisys_user');
        if (origin !== "remote") {
          publishSessionLogout(isExpiry ? "expiry" : "auth-failure");
        }
        
        // Show the persistent modal instead of toast
        setShowExpiredModal(true);
        // Do NOT navigate immediately; wait for user to click "Log In"
      }
    };
    
    const resetIdle = (shouldBroadcast = true) => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => handleLogout(true), idleMs);
      if (shouldBroadcast) {
        const now = Date.now();
        if (now - lastActivityBroadcastRef.current > 15000) {
          lastActivityBroadcastRef.current = now;
          publishSessionActivity("interaction");
        }
      }
    };

    const checkToken = () => {

      const token = localStorage.getItem('advisys_token');
      if (!token) return;

      try {
        // Base64Url decode
        const parts = token.split('.');
        if (parts.length !== 3) return;
        
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const exp = payload.exp * 1000;
        const now = Date.now();

        // console.log("Session check:", { now, exp, diff: exp - now });

        if (now >= exp) handleLogout(true);
        else {
          const delay = exp - now;
          if (delay > 0 && delay < 2147483647) tokenTimer = setTimeout(() => handleLogout(true), delay);
        }
      } catch (e) {
        console.error("SessionHandler: Token parse error", e);
      }
    };

    checkToken();
    resetIdle();

    // 2. Intercept fetch to detect auth failures (do not reset idle on network)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const url = args[0] instanceof Request ? args[0].url : String(args[0]);
        if (!url.includes('/auth/login') && !url.includes('/auth/verify')) {
           handleLogout(false);
        }
      }
      return response;
    };

    const events = ['mousemove','mousedown','keydown','touchstart','scroll'];
    const handleLocalActivity = () => resetIdle(true);
    events.forEach((ev) => window.addEventListener(ev, handleLocalActivity, { passive: true }));

    const handleStorage = (event) => {
      if (event.key === ADVISYS_SESSION_ACTIVITY_KEY && event.newValue) {
        resetIdle(false);
      }
      if (
        (event.key === ADVISYS_SESSION_LOGOUT_KEY && event.newValue) ||
        (event.key === "advisys_token" && event.newValue === null)
      ) {
        handleLogout(true, "remote");
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.fetch = originalFetch;
      if (tokenTimer) clearTimeout(tokenTimer);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((ev) => window.removeEventListener(ev, handleLocalActivity));
      window.removeEventListener("storage", handleStorage);
    };
  }, [navigate, idleMs]);

  const handleConfirmLogout = () => {
    setShowExpiredModal(false);
    isLogoutProcessing.current = false;
    navigate('/auth');
  };

  return (
    <AlertDialog open={showExpiredModal} onOpenChange={setShowExpiredModal}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has expired due to inactivity. Please log in again to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:items-center sm:justify-between">
          <AlertDialogCancel className="min-w-[96px] mt-0 mr-auto">Close</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmLogout} className="min-w-[96px]">
            Log In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
