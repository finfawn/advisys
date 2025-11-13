import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import AdvisorCard from "../../components/student/AdvisorCard";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import "./AdvisorListPage.css";
import { TemplateCardSkeleton } from "../../lightswind/skeleton";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "../../lightswind/select";

export default function AdvisorListPage() {
  // Normalize asset URLs (absolute, blob, or server-relative)
  const resolveAssetUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const u = url.trim();
    if (!u) return null;
    if (/^(https?:\/\/|blob:)/i.test(u)) return u;
    if (u.startsWith('/')) return `${base}${u}`;
    return `${base}/${u.replace(/^\/*/, '')}`;
  };
  const { collapsed, toggleSidebar } = useSidebar();
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  const handleNavigation = (page) => {
    if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  const [allAdvisors, setAllAdvisors] = useState([]);
  const [isLoadingAdvisors, setIsLoadingAdvisors] = useState(true);
  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${base}/api/advisors`);
        const data = await res.json();
        // Shape avatars to full URLs for card rendering
        const shaped = Array.isArray(data)
          ? data.map(a => ({ ...a, avatar: resolveAssetUrl(a.avatar) }))
          : [];
        setAllAdvisors(shaped);
      } catch (err) {
        console.error('Failed to load advisors', err);
      } finally {
        setIsLoadingAdvisors(false);
      }
    };
    fetchAdvisors();
  }, []);

  // Load student consultations to derive previous advisors (completed consultations)
  const [studentConsultations, setStudentConsultations] = useState([]);
  const [isLoadingPrevConsultations, setIsLoadingPrevConsultations] = useState(true);
  useEffect(() => {
    const fetchStudentConsultations = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const userStr = localStorage.getItem('advisys_user');
        const token = localStorage.getItem('advisys_token');
        const user = userStr ? JSON.parse(userStr) : null;
        if (!user || !user.id) {
          setStudentConsultations([]);
          return;
        }
        const res = await fetch(`${base}/api/consultations/students/${user.id}/consultations`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        setStudentConsultations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load student consultations', err);
        setStudentConsultations([]);
      } finally {
        setIsLoadingPrevConsultations(false);
      }
    };
    fetchStudentConsultations();
  }, []);

  // No department filters for now; only mode filters

  // Filter advisors based on selected filter
  const filteredAdvisors = useMemo(() => {
    if (filter === "all") return allAdvisors;
    if (filter.startsWith("mode:")) {
      const modeKey = filter.split(":")[1];
      if (modeKey === "online") {
        return (allAdvisors || []).filter((a) => (a.mode || "").includes("Online"));
      }
      if (modeKey === "in_person") {
        return (allAdvisors || []).filter((a) => (a.mode || "").includes("In-person"));
      }
    }
    return allAdvisors;
  }, [filter, allAdvisors]);


  // Pagination logic
  const itemsPerPage = 8;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = showAll ? filteredAdvisors.length : startIndex + itemsPerPage;
  const displayedAdvisors = filteredAdvisors.slice(0, endIndex);

  const handleSelectChange = (value) => {
    setFilter(value);
    setCurrentPage(1);
    setShowAll(false);
  };

  const filterLabel = useMemo(() => {
    if (filter === "all") return "All Faculty";
    if (filter.startsWith("mode:")) {
      const key = filter.split(":")[1];
      if (key === "online") return "Online";
      if (key === "in_person") return "In-person";
      return "Mode";
    }
    return "All Faculty";
  }, [filter]);

  const handleLoadMore = () => {
    if (endIndex >= filteredAdvisors.length) {
      setShowAll(true);
    } else {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleBookClick = (advisorName) => {
    console.log(`Book consultation with ${advisorName}`);
    // Add booking logic here
  };

  // Helper to format relative time
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now - then;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    if (minutes < 60) return `${minutes || 1} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    return `${months} month${months === 1 ? '' : 's'} ago`;
  };

  // Derive previous advisors from completed consultations
  const previousConsultations = useMemo(() => {
    if (!Array.isArray(studentConsultations) || studentConsultations.length === 0) return [];
    const completed = studentConsultations.filter(c => (c.status || '').toLowerCase() === 'completed');
    if (completed.length === 0) return [];
    const byAdvisor = new Map();
    completed.forEach(c => {
      const faculty = c.faculty || {};
      const advisorId = faculty.id || c.advisor_id || faculty._id; // fallback keys
      if (!advisorId) return;
      const end = c.end_datetime || c.end || c.end_time; // possible fields
      const start = c.start_datetime || c.start || c.start_time;
      const lastDate = end || start || c.date;
      const current = byAdvisor.get(advisorId) || {
        id: advisorId,
        name: faculty.name || c.advisor_name || 'Unknown Advisor',
        title: faculty.title || c.faculty_title || 'Faculty Advisor',
        consultationCount: 0,
        lastDate: null
      };
      current.consultationCount += 1;
      current.lastDate = !current.lastDate || new Date(lastDate) > new Date(current.lastDate) ? lastDate : current.lastDate;
      byAdvisor.set(advisorId, current);
    });
    // Merge with advisors list for schedule/time/mode when available
      const merged = Array.from(byAdvisor.values()).map(item => {
        const match = (allAdvisors || []).find(a => String(a.id) === String(item.id));
        // Try to derive avatar from latest consultation row or advisors list match
        const matchedConsultation = (Array.isArray(studentConsultations) ? studentConsultations : []).find(
          c => String(c?.advisor_user_id ?? c?.faculty?.id ?? c?.advisor_id) === String(item.id)
        );
        const avatarRaw = matchedConsultation?.advisor_avatar_url 
          ?? matchedConsultation?.faculty?.avatar 
          ?? match?.avatar 
          ?? null;
        return {
          id: item.id,
          name: item.name || (match ? match.name : undefined),
          title: item.title || (match ? match.title : undefined),
          status: 'Available',
          schedule: match?.schedule,
          time: match?.time,
          mode: match?.mode,
          coursesTaught: match?.coursesTaught,
          avatar: resolveAssetUrl(avatarRaw),
          officeLocation: match?.officeLocation || null,
          lastConsultation: formatRelativeTime(item.lastDate),
          consultationCount: item.consultationCount
        };
      });
    // Sort by most recent lastDate
    merged.sort((a, b) => new Date(b.lastConsultationDate || b.lastDate || 0) - new Date(a.lastConsultationDate || a.lastDate || 0));
    return merged;
  }, [studentConsultations, allAdvisors]);

  return (
    <div className="dash-wrap">
      <TopNavbar />

      {/* Body */}
      <div className={`dash-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>

        {/* Content */}
        <main className="dash-main relative">
          <div className="advisor-list-container">
            {/* Page Header */}
            <div className="page-header">
              <div className="page-title-section">
                <h1 className="page-title">Faculty Advisors</h1>
                <p className="page-subtitle">Browse and connect with faculty members for academic consultations</p>
              </div>
            </div>

            {/* Previous Consultations Section (hidden if none) */}
            {(!isLoadingPrevConsultations && previousConsultations.length > 0) && (
              <section className="advisor-section">
                <div className="section-header">
                  <h2 className="section-title">Previous Consultations</h2>
                  <div className="section-controls">
                    <span className="section-count">{previousConsultations.length} advisors</span>
                  </div>
                </div>
                <div className="advisor-grid">
                  {previousConsultations.map(advisor => (
                    <AdvisorCard
                      key={`previous-${advisor.id}`}
                      advisorId={advisor.id}
                      name={advisor.name}
                      title={advisor.title}
                      status={advisor.status}
                      schedule={advisor.schedule}
                      time={advisor.time}
                      mode={advisor.mode}
                      avatar={advisor.avatar}
                      coursesTaught={advisor.coursesTaught}
                      officeLocation={advisor.officeLocation}
                      onBookClick={() => handleBookClick(advisor.name)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Faculty Section */}
            <section className="advisor-section" id="all-faculty-list">
              <div className="section-header">
                <h2 className="section-title">All Faculty</h2>
                
                <div className="section-controls">
                  {/* Filter Dropdown (Lightswind Select) */}
                  <Select value={filter} onValueChange={handleSelectChange}>
                    <SelectTrigger className="filter-dropdown">
                      <span>{filterLabel}</span>
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All Faculty</SelectItem>
                      <SelectSeparator />
                      <SelectLabel>Mode</SelectLabel>
                      <SelectItem value="mode:online">Online</SelectItem>
                      <SelectItem value="mode:in_person">In-person</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <span className="section-count">{filteredAdvisors.length} total</span>
                </div>
              </div>
              
              {isLoadingAdvisors ? (
                <div className="advisor-grid">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <TemplateCardSkeleton key={`skeleton-${idx}`} />
                  ))}
                </div>
              ) : displayedAdvisors.length > 0 ? (
                <>
                  <div className="advisor-grid">
                    {displayedAdvisors.map(advisor => (
                      <AdvisorCard
                        key={advisor.id}
                        advisorId={advisor.id}
                        name={advisor.name}
                        title={advisor.title}
                        status={advisor.status}
                        schedule={advisor.schedule}
                        time={advisor.time}
                        mode={advisor.mode}
                        avatar={advisor.avatar}
                        coursesTaught={advisor.coursesTaught}
                        officeLocation={advisor.officeLocation}
                        onBookClick={() => handleBookClick(advisor.name)}
                      />
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {!showAll && endIndex < filteredAdvisors.length && (
                    <div className="load-more-section">
                      <Button 
                        variant="outline-primary" 
                        className="load-more-btn"
                        onClick={handleLoadMore}
                      >
                        Load More ({filteredAdvisors.length - endIndex} remaining)
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-results">
                  <p>No faculty members found matching your criteria.</p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
