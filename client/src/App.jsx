import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "./contexts/SidebarContext";
import Home from "./pages/Home";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import AdvisorListPage from "./pages/student/AdvisorListPage";
import AdvisorProfilePage from "./pages/student/AdvisorProfilePage";
import MyConsultationsPage from "./pages/student/MyConsultationsPage";
import ConsultationDetailsPage from "./pages/student/ConsultationDetailsPage";
import OnlineConsultationDetailsPage from "./pages/student/OnlineConsultationDetailsPage";
import HistoryConsultationDetailsPage from "./pages/HistoryConsultationDetailsPage";
import StudentSettingsPage from "./pages/student/StudentSettingsPage";

// Advisor pages
import AdvisorDashboard from "./pages/advisor/AdvisorDashboard";
import AdvisorConsultations from "./pages/advisor/AdvisorConsultations";

function App() {
  return (
    <SidebarProvider>
      <Router>
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Student routes */}
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-dashboard/advisors" element={<AdvisorListPage />} />
          <Route path="/student-dashboard/advisors/:advisorId" element={<AdvisorProfilePage />} />
          <Route path="/student-dashboard/consultations" element={<MyConsultationsPage />} />
          <Route path="/student-dashboard/consultations/:consultationId" element={<ConsultationDetailsPage />} />
          <Route path="/student-dashboard/consultations/online/:consultationId" element={<OnlineConsultationDetailsPage />} />
          <Route path="/student-dashboard/consultations/history/:consultationId" element={<HistoryConsultationDetailsPage />} />
          <Route path="/student-dashboard/settings" element={<StudentSettingsPage />} />

          {/* Advisor routes */}
          <Route path="/advisor-dashboard" element={<AdvisorDashboard />} />
          <Route path="/advisor-dashboard/consultations" element={<AdvisorConsultations />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </SidebarProvider>
  );
}

export default App;
