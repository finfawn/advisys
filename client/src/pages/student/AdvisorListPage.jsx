import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import AdvisorCard from "../../components/student/AdvisorCard";
import { motion, AnimatePresence } from "framer-motion";
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../lightswind/collapsible";
import { Checkbox } from "../../lightswind/checkbox";

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
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 0
  );
  const [showLoadMore, setShowLoadMore] = useState(false);
  const navigate = useNavigate();
  const [selectedModes, setSelectedModes] = useState([]);
  const [selectedExpertise, setSelectedExpertise] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

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
        const shaped = Array.isArray(data)
          ? data
              .filter(a => String(a?.userStatus || 'active') === 'active' && String(a?.profileStatus || '') !== 'inactive')
              .map(a => ({ ...a, avatar: resolveAssetUrl(a.avatar) }))
          : [];
        setAllAdvisors(shaped);
        try {
          const enriched = await Promise.allSettled(
            shaped.map(async (a) => {
              const r = await fetch(`${base}/api/advisors/${a.id}`);
              if (!r.ok) return a;
              const d = await r.json();
              return {
                ...a,
                topicsCanHelpWith: Array.isArray(d.topicsCanHelpWith) ? d.topicsCanHelpWith : (a.topicsCanHelpWith || []),
                coursesTaught: Array.isArray(d.coursesTaught) ? d.coursesTaught : (a.coursesTaught || []),
              };
            })
          );
          const merged = enriched.map((x, i) => (x.status === 'fulfilled' ? x.value : shaped[i]));
          setAllAdvisors(merged);
        } catch {
          void 0;
        }
      } catch (err) {
        console.error('Failed to load advisors', err);
      } finally {
        setIsLoadingAdvisors(false);
      }
    };
    fetchAdvisors();
  }, []);

  // Extract expertise/topics strictly from DB field
  const extractCategories = (a) => {
    const raw = a?.topicsCanHelpWith;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((t) => (typeof t === 'string' ? t.trim() : String(t || '').trim()))
      .filter((t) => !!t);
  };

  const extractCourseCodes = (a) => {
    const raw = a?.coursesTaught || [];
    if (!Array.isArray(raw)) return [];
    const CODE_RE = /^[A-Z]{2,}\d{2,}$/;
    const EXTRACT_ANY_RE = /([A-Z]{2,})[- ]?(\d{2,})/i;
    const normalize = (s) => s.toUpperCase().replace(/[-\s]+/g, '');
    const pickField = (obj) => {
      const candidate = obj?.subject_code ?? obj?.code ?? obj?.course_code ?? obj?.courseCode ?? obj?.name ?? obj?.title ?? '';
      return String(candidate || '').trim();
    };
    return raw
      .map((c) => {
        if (typeof c === 'string') {
          const s = c.trim();
          const m = s.toUpperCase().match(EXTRACT_ANY_RE);
          return m ? normalize(`${m[1]}${m[2]}`) : normalize(s);
        }
        const s = pickField(c);
        const m = s.toUpperCase().match(EXTRACT_ANY_RE);
        return m ? normalize(`${m[1]}${m[2]}`) : normalize(s);
      })
      .filter((s) => CODE_RE.test(s));
  };

  // Distinct expertise options across advisors
  const expertiseOptions = useMemo(() => {
    const set = new Set();
    (allAdvisors || []).forEach((a) => {
      extractCategories(a).forEach((c) => set.add(c));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAdvisors]);

  const subjectOptions = useMemo(() => {
    const set = new Set();
    (allAdvisors || []).forEach((a) => {
      extractCourseCodes(a).forEach((c) => set.add(c));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAdvisors]);

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
    let list = allAdvisors || [];
    if (filter.startsWith("mode:")) {
      const modeKey = filter.split(":")[1];
      if (modeKey === "online") list = list.filter((a) => (a.mode || "").includes("Online"));
      else if (modeKey === "in_person") list = list.filter((a) => (a.mode || "").includes("In-person"));
    }
    if (filter.startsWith("expertise:")) {
      const raw = filter.slice("expertise:".length);
      const selected = decodeURIComponent(raw).toLowerCase();
      list = list.filter((a) => {
        const cats = extractCategories(a).map((c) => c.toLowerCase());
        return cats.includes(selected);
      });
    }
    if (filter.startsWith("subject:")) {
      const raw = filter.slice("subject:".length);
      const selected = decodeURIComponent(raw).toLowerCase();
      list = list.filter((a) => {
        const codes = extractCourseCodes(a).map((c) => c.toLowerCase());
        return codes.includes(selected);
      });
    }
    if (selectedModes.length) {
      list = list.filter((a) => {
        const m = String(a.mode || "");
        const hasOnline = m.includes("Online");
        const hasInPerson = m.includes("In-person");
        return (selectedModes.includes("online") && hasOnline) || (selectedModes.includes("in_person") && hasInPerson);
      });
    }
    if (selectedExpertise.length) {
      const sel = selectedExpertise.map((s) => s.toLowerCase());
      list = list.filter((a) => {
        const cats = extractCategories(a).map((c) => c.toLowerCase());
        return sel.some((s) => cats.includes(s));
      });
    }
    if (selectedSubjects.length) {
      const sel = selectedSubjects.map((s) => s.toLowerCase());
      list = list.filter((a) => {
        const codes = extractCourseCodes(a).map((c) => c.toLowerCase());
        return sel.some((s) => codes.includes(s));
      });
    }
    const keyFor = (a) => String(a?.id ?? a?.email ?? a?.name ?? Math.random());
    const deduped = Array.from(new Map((list || []).map((a) => [keyFor(a), a])).values());
    return deduped;
  }, [filter, allAdvisors, selectedModes, selectedExpertise, selectedSubjects]);


  // Pagination logic
  const itemsPerPage = 8;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = showAll ? filteredAdvisors.length : startIndex + itemsPerPage;
  const displayedAdvisors = filteredAdvisors.slice(0, endIndex);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let resizeTimeout = null;
    const handleResize = () => {
      const nextHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }
      resizeTimeout = window.setTimeout(() => {
        setViewportHeight(nextHeight);
      }, 150);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoadingAdvisors) return;
    if (!filteredAdvisors.length) {
      if (showLoadMore) {
        setShowLoadMore(false);
      }
      return;
    }
    const doc = document.documentElement;
    const contentHeight = Math.max(doc.scrollHeight, doc.offsetHeight);
    if (contentHeight <= viewportHeight && endIndex < filteredAdvisors.length) {
      setCurrentPage((prev) => prev + 1);
      return;
    }
    const hasMore = endIndex < filteredAdvisors.length;
    const shouldShow = hasMore && contentHeight > viewportHeight;
    if (showLoadMore !== shouldShow) {
      setShowLoadMore(shouldShow);
    }
  }, [isLoadingAdvisors, filteredAdvisors.length, endIndex, viewportHeight, showLoadMore]);

  const clearFilters = () => {
    setFilter("all");
    setSelectedModes([]);
    setSelectedExpertise([]);
    setSelectedSubjects([]);
    setCurrentPage(1);
    setShowAll(false);
  };

  

  const handleLoadMore = () => {
    if (endIndex >= filteredAdvisors.length) {
      setShowAll(true);
    } else {
      const doc = document.documentElement;
      const startScroll = window.scrollY || doc.scrollTop || 0;
      const currentViewportHeight = viewportHeight || window.innerHeight || doc.clientHeight || 0;
      setCurrentPage(prev => prev + 1);
      window.requestAnimationFrame(() => {
        const targetScroll = Math.max(
          startScroll,
          Math.max(doc.scrollHeight, doc.offsetHeight) - currentViewportHeight
        );
        window.scrollTo({
          top: targetScroll,
          behavior: "smooth",
        });
      });
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
    <div className="dash-wrap advisor-list-wrap">
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
                  <AnimatePresence mode="popLayout">
                    {previousConsultations.map(advisor => (
                      <motion.div
                        key={`previous-${advisor.id}`}
                        initial={{ opacity: 0, y: 8, scale: 0.995 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.995 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      >
                        <AdvisorCard
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
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* All Faculty Section */}
            <section className="advisor-section" id="all-faculty-list">
              <div className="section-header">
                <h2 className="section-title">All Faculty</h2>
                
                <div className="section-controls relative">
                  <Collapsible>
                    <CollapsibleTrigger className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm flex items-center gap-2">
                      <span>Filter</span>
                      <span className="ml-auto text-xs text-gray-500">
                        {(selectedModes.length + selectedExpertise.length + selectedSubjects.length) || 0} selected
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="lw-collapsible-content">
                      <div className="filter-popover">
                        <div className="px-1 py-1">
                          <div className="grid md:grid-cols-[220px_1fr] gap-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Mode</h4>
                            <div className="flex flex-col gap-2">
                                <label className="inline-flex items-center gap-2 text-sm filter-option"><Checkbox checked={selectedModes.includes('online')} onCheckedChange={(checked) => {
                                  setSelectedModes((prev) => checked ? (prev.includes('online') ? prev : [...prev, 'online']) : prev.filter((k) => k !== 'online'));
                                  setCurrentPage(1);
                                  setShowAll(false);
                                }} /> <span className="filter-label-text">Online</span></label>
                                <label className="inline-flex items-center gap-2 text-sm filter-option"><Checkbox checked={selectedModes.includes('in_person')} onCheckedChange={(checked) => {
                                  setSelectedModes((prev) => checked ? (prev.includes('in_person') ? prev : [...prev, 'in_person']) : prev.filter((k) => k !== 'in_person'));
                                  setCurrentPage(1);
                                  setShowAll(false);
                                }} /> <span className="filter-label-text">In-person</span></label>
                              </div>
                          </div>
                          {(expertiseOptions.length > 0 || subjectOptions.length > 0) && (
                            <div>
                              {expertiseOptions.length > 0 && (
                                <>
                              <h4 className="font-semibold text-sm mb-2">Topics</h4>
                                  <div className="filter-list">
                                    {expertiseOptions.map((opt) => (
                                      <label key={opt} className="inline-flex items-center gap-2 text-sm filter-option">
                                    <Checkbox checked={selectedExpertise.includes(opt)} onCheckedChange={(checked) => {
                                      setSelectedExpertise((prev) => checked ? (prev.includes(opt) ? prev : [...prev, opt]) : prev.filter((x) => x !== opt));
                                      setCurrentPage(1);
                                      setShowAll(false);
                                    }} />
                                        <span className="filter-label-text">{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                </>
                              )}
                              {subjectOptions.length > 0 && (
                                <>
                                  <h4 className="font-semibold text-sm mt-4 mb-2">Subject Codes</h4>
                                  <div className="filter-list">
                                    {subjectOptions.map((code) => (
                                      <label key={code} className="inline-flex items-center gap-2 text-sm filter-option">
                                        <Checkbox checked={selectedSubjects.includes(code)} onCheckedChange={(checked) => {
                                          setSelectedSubjects((prev) => checked ? (prev.includes(code) ? prev : [...prev, code]) : prev.filter((x) => x !== code));
                                          setCurrentPage(1);
                                          setShowAll(false);
                                        }} />
                                        <span className="filter-label-text">{code}</span>
                                      </label>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          </div>
                          <div className="mt-3 flex gap-2">
                          <button onClick={clearFilters} className="px-2 py-1 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-100">Clear</button>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
                    <AnimatePresence mode="popLayout">
                      {displayedAdvisors.map(advisor => (
                        <motion.div
                          key={advisor.id}
                          initial={{ opacity: 0, y: 8, scale: 0.995 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.995 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                          <AdvisorCard
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
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  
                  {!showAll && endIndex < filteredAdvisors.length && showLoadMore && (
                    <motion.div
                      className="load-more-section"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <Button
                        variant="default"
                        className="load-more-btn"
                        onClick={handleLoadMore}
                      >
                        Load More ({filteredAdvisors.length - endIndex} remaining)
                      </Button>
                    </motion.div>
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
