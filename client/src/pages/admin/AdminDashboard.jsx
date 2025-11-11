import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminStudentsConsultedBarCard from "../../components/admin/dashboard/AdminStudentsConsultedBarCard";
import AdminDailyConsultationsCard from "../../components/admin/dashboard/AdminDailyConsultationsCard";
import AdminTopTopicsCard from "../../components/admin/dashboard/AdminTopTopicsCard";
import AdminConsultationModeCard from "../../components/admin/dashboard/AdminConsultationModeCard";
import AdminAverageDurationCard from "../../components/admin/dashboard/AdminAverageDurationCard";
import AdminStatusBreakdownCard from "../../components/admin/dashboard/AdminStatusBreakdownCard";
import "./AdminDashboard.css";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../lightswind/dropdown-menu";
import { Button } from "../../lightswind/button";

// lazy imports for export utilities
let html2canvasPromise = null;
let jsPDFPromise = null;
async function getExportLibs() {
  if (!html2canvasPromise) html2canvasPromise = import("html2canvas");
  if (!jsPDFPromise) jsPDFPromise = import("jspdf");
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([html2canvasPromise, jsPDFPromise]);
  return { html2canvas, jsPDF };
}

async function captureNode(node) {
  const { html2canvas } = await getExportLibs();
  const canvas = await html2canvas(node, {
    scale: Math.min(2, window.devicePixelRatio || 1) * 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  return canvas.toDataURL("image/png");
}

async function exportChartsAsPDF(root) {
  const charts = Array.from(root.querySelectorAll('[data-export="chart"]'));
  if (!charts.length) {
    alert("No charts found to export.");
    return;
  }
  const { jsPDF } = await getExportLibs();
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const titleY = margin + 8;
  pdf.setFontSize(14);
  pdf.text("Admin Dashboard Charts", margin, titleY);
  pdf.setFontSize(10);
  pdf.text(new Date().toLocaleString(), pageWidth - margin - 140, titleY);

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];
    const title = chart.getAttribute("data-export-title") || "Chart";
    const dataUrl = await captureNode(chart);

    if (i > 0) pdf.addPage();
    pdf.setFontSize(12);
    pdf.text(title, margin, margin + 18);
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 3;
    // Assume 16:9 if we cannot read natural size
    const imgW = maxW;
    const imgH = Math.min(maxH, Math.round(maxW * 0.56));
    pdf.addImage(dataUrl, "PNG", margin, margin * 2, imgW, imgH, undefined, "FAST");
  }
  pdf.save("admin_dashboard_charts.pdf");
}

async function exportChartsAsPNGs(root) {
  const charts = Array.from(root.querySelectorAll('[data-export="chart"]'));
  if (!charts.length) {
    alert("No charts found to export.");
    return;
  }
  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];
    const title = chart.getAttribute("data-export-title") || `chart-${i+1}`;
    const dataUrl = await captureNode(chart);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${title.replace(/\s+/g, "_").toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default function AdminDashboard() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [monthlyMode, setMonthlyMode] = useState(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    let cancelled = false;
    async function load() {
      try {
        const [sumRes, modeRes] = await Promise.all([
          fetch(`${apiBase}/api/dashboard/admin/summary`),
          fetch(`${apiBase}/api/dashboard/admin/monthly-mode`),
        ]);
        const sumData = await sumRes.json();
        const modeData = await modeRes.json();
        if (!cancelled) {
          setSummary(sumData);
          setMonthlyMode(modeData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard data', err);
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'dashboard') {
      navigate('/admin-dashboard');
    } else if (page === 'manage-users') {
      navigate('/admin-dashboard/manage-users');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />

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
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="px-4 py-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg border border-blue-700">Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportChartsAsPDF(document.querySelector('.admin-dash-main'))}>PDF (charts)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportChartsAsPNGs(document.querySelector('.admin-dash-main'))}>PNG (charts)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="admin-dashboard-grid">
            <div className="bento-students">
              <AdminStudentsConsultedBarCard loading={isLoading} data={summary?.studentsByYear || null} />
            </div>
            <div className="bento-topics">
              <AdminTopTopicsCard loading={isLoading} topics={summary?.topTopics || null} />
            </div>
            <div className="bento-trend">
              <AdminDailyConsultationsCard loading={isLoading} monthCurrent={summary?.trend?.month?.current || null} monthPrevious={summary?.trend?.month?.previous || null} weekCurrent={summary?.trend?.week?.current || null} weekPrevious={summary?.trend?.week?.previous || null} />
            </div>
            <div className="bento-mode">
              <AdminConsultationModeCard loading={isLoading} data={summary?.modeBreakdown || null} />
            </div>
            <div className="bento-average">
              <AdminAverageDurationCard loading={isLoading} minutes={summary?.averageSessionMinutes || null} />
            </div>
            <div className="bento-status">
              <AdminStatusBreakdownCard loading={isLoading} data={summary?.statusBreakdown || null} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}