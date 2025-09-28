import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "./contexts/SidebarContext";
import Home from "./pages/Home";
import StudentDashboard from "./pages/student/StudentDashboard";
import AdvisorListPage from "./pages/student/AdvisorListPage";
import AdvisorProfilePage from "./pages/student/AdvisorProfilePage";
import MyConsultationsPage from "./pages/student/MyConsultationsPage";

function App() {
  return (
    <SidebarProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-dashboard/advisors" element={<AdvisorListPage />} />
          <Route path="/student-dashboard/advisors/:advisorId" element={<AdvisorProfilePage />} />
          <Route path="/student-dashboard/consultations" element={<MyConsultationsPage />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </SidebarProvider>
  );
}

export default App;
