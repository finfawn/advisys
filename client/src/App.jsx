import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SidebarProvider } from "./contexts/SidebarContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { Toaster } from "./lightswind/toaster";
import SessionHandler from "./components/SessionHandler";
import AuthPage from "./pages/AuthPage";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import GlobalDashboardBackground from "./components/shared/GlobalDashboardBackground";
import EntryTransition from "./components/shared/EntryTransition";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import AdvisorListPage from "./pages/student/AdvisorListPage";
import AdvisorProfilePage from "./pages/student/AdvisorProfilePage";
import MyConsultationsPage from "./pages/student/MyConsultationsPage";
import StudentThreadPage from "./pages/student/StudentThreadPage";
import ConsultationDetailsPage from "./pages/student/ConsultationDetailsPage";
import OnlineConsultationDetailsPage from "./pages/student/OnlineConsultationDetailsPage";
import HistoryConsultationDetailsPage from "./pages/HistoryConsultationDetailsPage";
import StudentSettingsPage from "./pages/student/StudentSettingsPage";

  // Advisor pages
  import AdvisorDashboard from "./pages/advisor/AdvisorDashboard";
  import AdvisorConsultations from "./pages/advisor/AdvisorConsultations";
  import AdvisorThreadPage from "./pages/advisor/AdvisorThreadPage";
  import AdvisorAvailability from "./pages/advisor/AdvisorAvailability";
  import AdvisorSettingsPage from "./pages/advisor/AdvisorSettingsPage";
  import AdvisorConsultationDetailsPage from "./pages/advisor/ConsultationDetailsPage";
  import AdvisorOnlineConsultationDetailsPage from "./pages/advisor/OnlineConsultationDetailsPage";
  import CallWindow from "./pages/call/CallWindow";
  import AdvisorStudents from "./pages/advisor/AdvisorStudents";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminManageUsers from "./pages/admin/AdminManageUsers";
import AdminManageStudents from "./pages/admin/AdminManageStudents";
import AdminManageAdvisors from "./pages/admin/AdminManageAdvisors";
import AdminDepartmentSettings from "./pages/admin/AdminDepartmentSettings";

// Simple auth guard to protect routes
function RequireAuth({ allowedRoles = [] }) {
  const location = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("advisys_token") : null;
  let userRole = null;
  try {
    const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("advisys_user") || "null") : null;
    userRole = user?.role || null;
  } catch (_) {
    userRole = null;
  }

  if (!token) {
    // No token: redirect to auth, preserve intended path
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }


  if (allowedRoles.length && !allowedRoles.includes(userRole)) {
    // Has token but wrong role: send to their dashboard or home
    const redirect = userRole === "student"
      ? "/student-dashboard"
      : userRole === "advisor"
      ? "/advisor-dashboard"
      : userRole === "admin"
      ? "/admin-dashboard"
      : "/";
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}

// Logout route component: clears auth and returns to sign-in
function Logout() {
  React.useEffect(() => {
    try {
      localStorage.removeItem("advisys_token");
      localStorage.removeItem("advisys_user");
    } catch (_) {}
  }, []);
  return <Navigate to="/auth" replace />;
}

// Generic dashboard alias: redirects to role-specific dashboard
function DashboardRedirect() {
  let role = null;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("advisys_user") : null;
    const user = raw ? JSON.parse(raw) : null;
    role = user?.role || null;
  } catch (_) {
    role = null;
  }
  const target = role === "student" ? "/student-dashboard"
    : role === "advisor" ? "/advisor-dashboard"
    : role === "admin" ? "/admin-dashboard"
    : "/auth";
  return <Navigate to={target} replace />;
}

function App() {
  return (
    <NotificationProvider>
      <SidebarProvider>
        <Router>
          <SessionHandler />
          <AnimatedRoutes />
        </Router>
        <Toaster />
      </SidebarProvider>
    </NotificationProvider>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const showDashBg = /^\/(student-dashboard|advisor-dashboard|admin-dashboard)(\/|$)/.test(location.pathname || "");
  const [entryTransition, setEntryTransition] = React.useState(false);
  React.useEffect(() => {
    try {
      const flag = localStorage.getItem("advisys_pending_entry_transition");
      if (flag === "1" && showDashBg) {
        localStorage.removeItem("advisys_pending_entry_transition");
        setEntryTransition(true);
      }
    } catch (_) {}
  }, [location.pathname, showDashBg]);
  return (
    <>
      {showDashBg ? <GlobalDashboardBackground /> : null}
      {entryTransition && showDashBg ? (
        <EntryTransition show={entryTransition} onDone={() => setEntryTransition(false)} />
      ) : null}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <Routes location={location}>
            <Route path="/" element={<DashboardRedirect />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/logout" element={<Logout />} />
            <Route element={<RequireAuth allowedRoles={["student"]} />}> 
              <Route path="/student-dashboard" element={<StudentDashboard />} />
              <Route path="/student-dashboard/advisors" element={<AdvisorListPage />} />
              <Route path="/student-dashboard/advisors/:advisorId" element={<AdvisorProfilePage />} />
              <Route path="/student-dashboard/consultations" element={<MyConsultationsPage />} />
              <Route path="/student-dashboard/history/thread/:advisorId" element={<StudentThreadPage />} />
              <Route path="/student-dashboard/consultations/:consultationId" element={<ConsultationDetailsPage />} />
              <Route path="/student-dashboard/consultations/online/:consultationId" element={<OnlineConsultationDetailsPage />} />
              <Route path="/student-dashboard/consultations/history/:consultationId" element={<HistoryConsultationDetailsPage />} />
              <Route path="/student-dashboard/settings" element={<StudentSettingsPage />} />
              <Route path="/student-dashboard/profile" element={<StudentSettingsPage />} />
            </Route>
            <Route element={<RequireAuth allowedRoles={["advisor"]} />}> 
              <Route path="/advisor-dashboard" element={<AdvisorDashboard />} />
              <Route path="/advisor-dashboard/consultations" element={<AdvisorConsultations />} />
              <Route path="/advisor-dashboard/history/thread/:studentId" element={<AdvisorThreadPage />} />
              <Route path="/advisor-dashboard/consultations/:consultationId" element={<AdvisorConsultationDetailsPage />} />
              <Route path="/advisor-dashboard/consultations/online/:consultationId" element={<AdvisorOnlineConsultationDetailsPage />} />
              <Route path="/advisor-dashboard/availability" element={<AdvisorAvailability />} />
              <Route path="/advisor-dashboard/profile" element={<AdvisorSettingsPage />} />
              <Route path="/advisor-dashboard/students" element={<AdvisorStudents />} />
            </Route>
            <Route element={<RequireAuth allowedRoles={["student", "advisor"]} />}> 
              <Route path="/call" element={<CallWindow />} />
            </Route>
            <Route element={<RequireAuth allowedRoles={["admin"]} />}> 
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin-dashboard/settings" element={<AdminSettings />} />
              <Route path="/admin-dashboard/manage-students" element={<AdminManageStudents />} />
              <Route path="/admin-dashboard/manage-advisors" element={<AdminManageAdvisors />} />
              <Route path="/admin-dashboard/manage-users" element={<Navigate to="/admin-dashboard/manage-students" replace />} />
              <Route path="/admin-dashboard/department-settings" element={<AdminDepartmentSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export default App;
