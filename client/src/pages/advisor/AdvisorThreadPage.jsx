import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Button } from "../../lightswind/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import { Card, CardContent } from "../../lightswind/card";
import { BsDownload, BsCameraVideo, BsGeoAlt, BsChevronDown, BsChevronUp } from "react-icons/bs";
import InitialsAvatar from "../../components/common/InitialsAvatar";
import { downloadLinesAsPdf } from "../../lib/pdfExport";
import "../student/StudentThreadPage.css";

const AI_ENABLED = false;

export default function AdvisorThreadPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const { studentId } = useParams();
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const token = typeof window !== "undefined" ? localStorage.getItem("advisys_token") : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState("current");
  const [advisorId, setAdvisorId] = useState(null);
  const [advisorName, setAdvisorName] = useState(null);
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("advisys_user") || "null");
      setAdvisorId(user?.id || null);
      setAdvisorName(user?.name || null);
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${base}/api/settings/academic/terms`);
        const data = await response.json();
        if (Array.isArray(data)) setTerms(data);
      } catch {}
    };
    load();
  }, [base]);

  const loadThread = async () => {
    if (!advisorId) return;
    setLoading(true);
    try {
      const url = new URL(`${base}/api/consultations/thread`);
      url.searchParams.set("studentId", String(studentId));
      url.searchParams.set("advisorId", String(advisorId));
      if (termId === "all") {
        url.searchParams.set("term", "all");
      } else if (termId !== "current") {
        url.searchParams.set("termId", String(termId));
      }
      const res = await fetch(url.toString(), { headers: { ...authHeader } });
      const data = await res.json();
      setThread(Array.isArray(data) ? data : []);
    } catch {
      setThread([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThread();
  }, [advisorId, termId, studentId]);

  const studentMeta = useMemo(() => {
    const first = thread[0];
    if (!first) return null;
    return {
      name: first.student_name || "Student",
      program: first.student_program || null,
      year: first.student_year || null,
    };
  }, [thread]);

  const getStartDate = React.useCallback((c) => {
    const value = c?.start_datetime || (c?.date && c?.time ? `${c.date} ${c.time}` : c?.date);
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }, []);

  const isWithinTimeFilter = React.useCallback(
    (date) => {
      if (!date || Number.isNaN(date.getTime())) return false;
      const now = new Date();
      const startOfWeek = (() => {
        const start = new Date(now);
        const day = start.getDay();
        const diff = (day === 0 ? -6 : 1) - day;
        start.setDate(start.getDate() + diff);
        start.setHours(0, 0, 0, 0);
        return start;
      })();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const daysAgo = (count) => {
        const start = new Date(now);
        start.setDate(start.getDate() - count);
        start.setHours(0, 0, 0, 0);
        return start;
      };

      switch (timeFilter) {
        case "this_week":
          return date >= startOfWeek;
        case "this_month":
          return date >= startOfMonth;
        case "last_7":
          return date >= daysAgo(7);
        case "last_30":
          return date >= daysAgo(30);
        default:
          return true;
      }
    },
    [timeFilter]
  );

  const filteredThread = useMemo(() => {
    let items = Array.isArray(thread) ? thread : [];
    // Only show history statuses
    items = items.filter((c) => {
      const status = String(c?.status || "").toLowerCase();
      return !["approved", "pending", "room_ready", "scheduled"].includes(status);
    });
    if (modeFilter !== "all") {
      items = items.filter((c) => String(c?.mode || "").toLowerCase() === (modeFilter === "online" ? "online" : "in-person"));
    }
    if (timeFilter !== "all") {
      items = items.filter((c) => {
        const date = getStartDate(c);
        return isWithinTimeFilter(date);
      });
    }
    if (selectedStatuses.length > 0) {
      const statusSet = new Set(selectedStatuses.map((s) => String(s).toLowerCase()));
      items = items.filter((c) => {
        const status = String(c?.status || "").toLowerCase();
        const canonical = status === "canceled" ? "cancelled" : status;
        return statusSet.has(canonical);
      });
    }
    return items;
  }, [thread, modeFilter, timeFilter, isWithinTimeFilter, selectedStatuses, getStartDate]);

  const groupedThread = useMemo(() => {
    const groups = {};
    filteredThread.forEach((c) => {
      const date = new Date(c.start_datetime);
      const key = date.toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [filteredThread]);

  const exportPdf = async () => {
    const lines = [];
    const advisorLabel = advisorName ? `Advisor: ${advisorName}` : "";
    const studentLabel = studentMeta?.name ? `Student: ${studentMeta.name}` : "";
    const termLabel = (() => {
      if (termId === "all") return "All Terms";
      if (termId === "current") {
        const currentTerm = terms.find((t) => Number(t.is_current) === 1);
        return currentTerm ? `${currentTerm.year_label} - ${currentTerm.semester_label} Semester` : "Current Term";
      }
      const term = terms.find((t) => String(t.id) === String(termId));
      return term ? `${term.year_label} - ${term.semester_label} Semester` : "Current Term";
    })();
    const timeLabels = {
      all: "All Time",
      this_week: "This Week",
      this_month: "This Month",
      last_7: "Last 7 Days",
      last_30: "Last 30 Days",
    };

    lines.push("AdviSys - Consultation Thread");
    if (advisorLabel) lines.push(advisorLabel);
    if (studentLabel) lines.push(studentLabel);
    if (termLabel) lines.push(`Term: ${termLabel}`);
    lines.push(`Filters: Mode=${modeFilter}, Time=${timeLabels[timeFilter] || "All Time"}, Status=${selectedStatuses.length ? selectedStatuses.join(", ") : "All"}`);
    lines.push("");

    filteredThread.forEach((c, idx) => {
      const dateStr = new Date(c.start_datetime).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      });
      const modeStr = c.mode === "online" ? "Online" : "In-Person";
      const statusStr = String(c.status || "").charAt(0).toUpperCase() + String(c.status || "").slice(1);
      const topic = c.category || c.topic || "---";
      const consultationAdvisor = c.advisor_name || advisorName || "";
      const location = c.location || "";
      const summary = c.summary_notes || c.ai_summary || "";
      const cancelReason = c.cancel_reason || "";

      lines.push(`Consultation ${idx + 1}`);
      if (consultationAdvisor) lines.push(`  Advisor: ${consultationAdvisor}`);
      lines.push(`  Topic: ${topic}`);
      lines.push(`  Date/Time: ${dateStr}`);
      lines.push(`  Mode: ${modeStr}`);
      lines.push(`  Status: ${statusStr}`);
      if (location) lines.push(`  Location: ${location}`);
      if (cancelReason) lines.push(`  Cancellation Reason: ${cancelReason}`);
      if (summary) lines.push(`  Summary: ${summary}`);
      lines.push("");
    });

    await downloadLinesAsPdf(
      lines,
      `Consultations_${advisorName || "Advisor"}_${studentMeta?.name || "Student"}_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="advisor-dash-wrap">
      <AdvisorTopNavbar />
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
        <div className="hidden xl:block">
          <AdvisorSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={(path) => navigate(path)} />
        </div>
        <main className="advisor-dash-main">
          <div className="consultations-container">
            <div className="consultations-header">
              <h1 className="consultations-title">Consultation Thread</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={termId} onValueChange={setTermId}>
                  <SelectTrigger className="filter-dropdown">
                    <SelectValue placeholder="Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Term</SelectItem>
                    <SelectItem value="all">All Terms</SelectItem>
                    {terms.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.year_label} - {t.semester_label} Semester
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Button variant="outline" onClick={() => setStatusMenuOpen((value) => !value)}>
                    Status
                  </Button>
                  {statusMenuOpen && (
                    <div className="absolute mt-2 w-52 bg-white border border-gray-200 rounded-md shadow-sm p-2 z-20">
                      {[
                        { k: "declined", label: "Declined" },
                        { k: "expired", label: "Expired" },
                        { k: "completed", label: "Completed" },
                        { k: "cancelled", label: "Cancelled" },
                        { k: "missed", label: "Missed" },
                        { k: "incomplete", label: "Incomplete" },
                      ].map((opt) => {
                        const checked = selectedStatuses.includes(opt.k);
                        return (
                          <label key={opt.k} className="flex items-center gap-2 px-1 py-1 text-xs">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedStatuses((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(opt.k)) next.delete(opt.k);
                                  else next.add(opt.k);
                                  return Array.from(next);
                                });
                              }}
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedStatuses([])}>
                          Clear
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setStatusMenuOpen(false)}>
                          Done
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="filter-dropdown">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="in-person">In-Person</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="filter-dropdown">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_7">Last 7 Days</SelectItem>
                    <SelectItem value="last_30">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setModeFilter("all");
                    setTimeFilter("all");
                    setSelectedStatuses([]);
                    setStatusMenuOpen(false);
                  }}
                >
                  Clear Filters
                </Button>
                <Button onClick={exportPdf} disabled={!thread.length}>
                  <BsDownload className="w-4 h-4 mr-1" />
                  Download PDF
                </Button>
              </div>
            </div>

            {studentMeta && (
              <div className="thread-profile-strip">
                <InitialsAvatar name={studentMeta.name} size={56} className="rounded-full flex-shrink-0" />
                <div className="thread-profile-text">
                  <div className="thread-profile-title">{studentMeta.name}</div>
                  <div className="thread-profile-subtitle">
                    {studentMeta.program ? `${studentMeta.program}` : ""}
                    {studentMeta.year ? ` - Year ${studentMeta.year}` : ""}
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div>Loading...</div>
            ) : filteredThread.length === 0 ? (
              <div className="text-sm text-gray-600">No consultations for this selection.</div>
            ) : (
              <div className="thread-grouped-list">
                {Object.entries(groupedThread).map(([monthYear, items]) => (
                  <div key={monthYear} className="thread-month-group">
                    <h2 className="thread-month-header">{monthYear}</h2>
                    <div className="thread-grid">
                      {items.map((c) => {
                        const dateObj = new Date(c.start_datetime);
                        const day = dateObj.getDate();
                        const monthStr = dateObj.toLocaleString("en-US", { month: "short" });
                        const yearStr = dateObj.getFullYear();
                        const timeStr = dateObj.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
                        const statusKey = String(c.status || "scheduled").toLowerCase();
                        return (
                          <Card key={c.id} className={`thread-grid-card border-status-${statusKey}`}>
                            <span className={`thread-grid-badge badge-${statusKey}`}>{c.status || "Scheduled"}</span>
                            <div className="thread-grid-card-body">
                              <div className="thread-grid-main">
                                <div className="thread-grid-date-block">
                                  <div className="date-day">{day}</div>
                                  <div className="date-month-year">
                                    {monthStr} {yearStr}
                                  </div>
                                </div>
                                <div className="thread-grid-details">
                                  <h3 className="thread-grid-title">{c.category || c.topic || "No Topic"}</h3>
                                  <div className="thread-grid-meta">
                                    <span className="meta-time">{timeStr}</span> &bull; 
                                    <span className="meta-mode">
                                      {c.mode === "online" ? " Online" : " In-Person"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
