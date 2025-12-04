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

export default function SessionHandler() {
  const navigate = useNavigate();
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const isLogoutProcessing = useRef(false);
  
  useEffect(() => {
    let timer;

    // Define handleLogout inside useEffect to avoid closure/dependency issues
    const handleLogout = (isExpiry) => {
      if (isLogoutProcessing.current) return;
      
      const token = localStorage.getItem('advisys_token');
      // If we have a token, or if it's a 401, we should clean up
      if (token || !isExpiry) {
        isLogoutProcessing.current = true;
        localStorage.removeItem('advisys_token');
        localStorage.removeItem('advisys_user');
        
        // Show the persistent modal instead of toast
        setShowExpiredModal(true);
        // Do NOT navigate immediately; wait for user to click "Log In"
      }
    };
    
    // 1. Check token expiry logic
    const checkToken = () => {

      const token = localStorage.getItem('advisys_token');
      if (!token) return;

      try {
        // Base64Url decode
        const parts = token.split('.');
        if (parts.length !== 3) return;
        
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const exp = payload.exp * 1000; // convert to ms
        const now = Date.now();

        // console.log("Session check:", { now, exp, diff: exp - now });

        if (now >= exp) {
          handleLogout(true);
        } else {
          const delay = exp - now;
          // Ensure delay is positive and reasonable (e.g. < 24 days)
          if (delay > 0 && delay < 2147483647) {
             timer = setTimeout(() => handleLogout(true), delay);
          }
        }
      } catch (e) {
        console.error("SessionHandler: Token parse error", e);
      }
    };

    checkToken();

    // 2. Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status === 401) {
          // Ignore 401s from login/verify endpoints to avoid loops
          const url = args[0] instanceof Request ? args[0].url : String(args[0]);
          if (!url.includes('/auth/login') && !url.includes('/auth/verify')) {
             handleLogout(false); // Don't need to verify token again, server said no
          }
        }
        return response;
      } catch (err) {
        throw err;
      }
    };

    return () => {
      window.fetch = originalFetch;
      if (timer) clearTimeout(timer);
    };
  }, [navigate]);

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
