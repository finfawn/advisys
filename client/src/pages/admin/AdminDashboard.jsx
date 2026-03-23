import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminStudentsConsultedBarCard from "../../components/admin/dashboard/AdminStudentsConsultedBarCard";
import ConsultationTrendCard from "../../components/advisor/dashboard/ConsultationTrendCard";
import AdminTopTopicsCard from "../../components/admin/dashboard/AdminTopTopicsCard";
import AdminConsultationModeCard from "../../components/admin/dashboard/AdminConsultationModeCard";
import AdminAverageDurationCard from "../../components/admin/dashboard/AdminAverageDurationCard";
import AdminStatusBreakdownCard from "../../components/admin/dashboard/AdminStatusBreakdownCard";
import "./AdminDashboard.css";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";

// export functionality temporarily disabled to simplify build

export default function AdminDashboard() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [terms, setTerms] = useState([]);
  const [scope, setScope] = useState("overall");
  const [selectedTermId, setSelectedTermId] = useState("");

  const currentTerm = terms.find((term) => Number(term.is_current) === 1) || null;
  const selectedScopeValue =
    scope === "current"
      ? "current"
      : scope === "term" && selectedTermId
        ? `term:${selectedTermId}`
        : "overall";

  useEffect(() => {
    const fetchTerms = async () => {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const storedToken = localStorage.getItem('advisys_token');
      const headers = storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined;
      try {
        const response = await fetch(`${base}/api/settings/academic/terms`, { headers });
        const data = await response.json();
        setTerms(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load academic terms for dashboard filters', err);
      }
    };
    fetchTerms();
  }, []);

  useEffect(() => {
    if (scope === "current" && !currentTerm && terms.length > 0) {
      setScope("overall");
    }
  }, [scope, currentTerm, terms.length]);

  useEffect(() => {
    if (scope === "term" && !selectedTermId && terms.length > 0) {
      setSelectedTermId(String(currentTerm?.id || terms[0]?.id || ""));
    }
  }, [scope, selectedTermId, terms, currentTerm]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const storedToken = localStorage.getItem('advisys_token');
      const headers = storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined;
      const params = new URLSearchParams();

      if (scope === "current" && currentTerm) {
        params.set("scope", "current");
      } else if (scope === "term" && selectedTermId) {
        params.set("scope", "term");
        params.set("termId", String(selectedTermId));
      }

      const summaryUrl = `${base}/api/dashboard/admin/summary${params.toString() ? `?${params.toString()}` : ''}`;

      try {
        const summaryRes = await fetch(summaryUrl, { headers });

        const summaryData = await summaryRes.json();

        setSummary(summaryData);
      } catch (err) {
        console.error('Failed to load admin dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (scope === "current" && !currentTerm) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    if (scope === "term" && !selectedTermId) {
      return;
    }

    fetchData();
  }, [scope, selectedTermId, currentTerm]);

  const handleNavigation = (page) => {
    if (page === 'dashboard') navigate('/admin-dashboard');
    else if (page === 'manage-users') navigate('/admin-dashboard/manage-students');
    else if (page === 'manage-students') navigate('/admin-dashboard/manage-students');
    else if (page === 'manage-advisors') navigate('/admin-dashboard/manage-advisors');
    else if (page === 'department-settings') navigate('/admin-dashboard/department-settings');
    else if (page === 'logout') navigate('/logout');
  };

  const handleScopeSelect = (value) => {
    if (value === "overall") {
      setScope("overall");
      return;
    }

    if (value === "current") {
      setScope("current");
      return;
    }

    if (value.startsWith("term:")) {
      const termId = value.slice(5);
      setSelectedTermId(termId);
      setScope("term");
    }
  };

  const navbarScopeDropdown = (
    <div className="flex items-center justify-center">
      <Select value={selectedScopeValue} onValueChange={handleScopeSelect}>
        <SelectTrigger
          aria-label="Dashboard scope"
          className="h-11 min-w-[310px] rounded-2xl border-slate-200 bg-white/95 text-sm font-medium text-slate-700 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.35)]"
        >
          <SelectValue placeholder="Select dashboard view" />
        </SelectTrigger>
        <SelectContent align="center">
          <SelectItem value="overall">Overall</SelectItem>
          {currentTerm ? <SelectItem value="current">Current Semester</SelectItem> : null}
          {terms.map((term) => (
            <SelectItem key={term.id} value={`term:${term.id}`}>
              {`SY ${term.year_label} / ${term.semester_label} Semester`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar centerContent={navbarScopeDropdown} />

      {/* Body */}
      <div className={`admin-dash-body ${collapsed ? "collapsed" : ""}`}>
        {/* Sidebar - Hide up to xl; show on ≥1280px */}
        <div className="hidden xl:block">
          <AdminSidebar
            collapsed={collapsed}
            onToggle={toggleSidebar}
            onNavigate={handleNavigation}
          />
        </div>

        {/* Content */}
        <main className="admin-dash-main">
          <div className="admin-bento-grid">
            {/* Row 1–2 left: Students with total indicator */}
            <div style={{ gridColumn: '1 / 3', gridRow: '1 / 3' }}>
              <AdminStudentsConsultedBarCard loading={isLoading} data={summary?.studentsByYear || null} total={summary?.totalCompleted ?? null} height={520} />
            </div>
            {/* Row 1 right-middle: Mode */}
            <div style={{ gridColumn: '4', gridRow: '1' }}>
              <AdminConsultationModeCard loading={isLoading} data={summary?.modeBreakdown || null} />
            </div>
            {/* Row 2 right-middle: Average */}
            <div style={{ gridColumn: '4', gridRow: '2' }}>
              <AdminAverageDurationCard loading={isLoading} minutes={summary?.averageSessionMinutes || null} />
            </div>
            {/* Row 1–2 far right: Status breakdown (replaces upcoming) */}
            <div style={{ gridColumn: '3', gridRow: '1 / 3' }}>
              <AdminStatusBreakdownCard loading={isLoading} data={summary?.statusBreakdown || null} height={520} />
            </div>
            {/* Row 3 bottom: Trend and Top Topics */}
            <div style={{ gridColumn: '1 / 4', gridRow: '3' }}>
              <ConsultationTrendCard loading={isLoading} data={summary?.trend || null} />
            </div>
            <div style={{ gridColumn: '4', gridRow: '3' }}>
              <AdminTopTopicsCard loading={isLoading} topics={summary?.topTopics || null} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
