import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronRight, BsChevronDown } from "react-icons/bs";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../lightswind/collapsible";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import TotalConsultationsCard from "../../components/advisor/dashboard/TotalConsultationsCard";
import ConsultationModeCard from "../../components/advisor/dashboard/ConsultationModeCard";
import AverageSessionCard from "../../components/advisor/dashboard/AverageSessionCard";
import UpcomingConsultationsCard from "../../components/advisor/UpcomingConsultationsCard";
import ConsultationTrendCard from "../../components/advisor/dashboard/ConsultationTrendCard";
import TopTopicsCard from "../../components/advisor/dashboard/TopTopicsCard";
import { useSidebar } from "../../contexts/SidebarContext";
import "./AdvisorDashboard.css";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../lightswind/alert-dialog";
import ConsultationSetupGate from "../../components/advisor/ConsultationSetupGate";

export default function AdvisorDashboard() {
  const { collapsed, toggleSidebar } = useSidebar();  
  const navigate = useNavigate();
  const [consultationProfileReady, setConsultationProfileReady] = useState(true);
  const [consultationPromptOpen, setConsultationPromptOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL
          || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
          || 'http://localhost:8080';
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id;
        if (!advisorId) return;

        const onboardingKey = 'advisys_advisor_consultation_onboarded';
        const already = typeof window !== 'undefined' ? localStorage.getItem(onboardingKey) : null;
        if (already === 'true') {
          setConsultationProfileReady(true);
          setConsultationPromptOpen(false);
          return;
        }

        const res = await fetch(`${base}/api/advisors/${advisorId}`);
        if (!res.ok) return;
        const data = await res.json();
        const topics = Array.isArray(data.topicsCanHelpWith) ? data.topicsCanHelpWith : [];
        const guidelines = Array.isArray(data.consultationGuidelines) ? data.consultationGuidelines : [];
        const courses = Array.isArray(data.coursesTaught) ? data.coursesTaught : [];
        const complete = topics.length > 0 && guidelines.length > 0 && courses.length > 0;

        if (!complete) {
          setConsultationProfileReady(false);
          setConsultationPromptOpen(true);
          try {
            const onceKey = 'advisys_notify_consultation_incomplete';
            const seen = typeof window !== 'undefined' ? localStorage.getItem(onceKey) : null;
            if (seen !== 'true') {
              const payload = {
                user_id: advisorId,
                type: 'advisor_consultation_incomplete',
                title: 'Complete Your Consultation Profile',
                message: 'Add at least one topic, guideline, and subject to unlock your dashboard.',
                data: { missing: { topics: topics.length, guidelines: guidelines.length, courses: courses.length } }
              };
              await fetch(`${base}/api/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              }).catch(()=>{});
              localStorage.setItem(onceKey, 'true');
            }
          } catch (_) {}
          return;
        }

        try {
          localStorage.setItem(onboardingKey, 'true');
          setConsultationProfileReady(true);
          setConsultationPromptOpen(false);
        } catch (_) {}
      } catch (_) {}
    })();
  }, [navigate]);

  // Onboarding: if advisor profile lacks consultation settings, redirect to settings on first login
  // useEffect(() => {
  //   const checkOnboarding = async () => {
  //     try {
  //       const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  //       const storedUser = localStorage.getItem('advisys_user');
  //       const parsed = storedUser ? JSON.parse(storedUser) : null;
  //       const advisorId = parsed?.id;
  //       if (!advisorId) return; // no advisor context

  //       // Avoid re-checking in same session if already completed
  //       const already = localStorage.getItem('advisys_advisor_onboarding_complete');
  //       if (already === 'true') return;

  //       const res = await fetch(`${base}/api/advisors/${advisorId}`);
  //       if (!res.ok) return;
  //       const data = await res.json();
  //       const topics = Array.isArray(data.topicsCanHelpWith) ? data.topicsCanHelpWith : [];
  //       const guidelines = Array.isArray(data.consultationGuidelines) ? data.consultationGuidelines : [];
  //       let modes = Array.isArray(data.consultationMode) ? data.consultationMode : [];
  //       const weekly = data.weeklySchedule || {};
  //       let hasAvailability = Object.values(weekly).some(v => typeof v === 'string' && v !== 'Unavailable');

  //       // If mode or availability are missing, infer from upcoming slots
  //       if (modes.length === 0 || !hasAvailability) {
  //         try {
  //           const pad = (n) => String(n).padStart(2, '0');
  //           const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  //           const today = new Date();
  //           const future = new Date();
  //           future.setDate(today.getDate() + 30);
  //           const sRes = await fetch(`${base}/api/advisors/${advisorId}/slots?start=${fmtDate(today)}&end=${fmtDate(future)}`);
  //           if (sRes.ok) {
  //             const slots = await sRes.json();
  //             const arr = Array.isArray(slots) ? slots : [];
  //             const availableSlots = arr.filter(s => String(s.status).toLowerCase() === 'available');
  //             const hasAnySlots = availableSlots.length > 0;
  //             const hasOnline = availableSlots.some(s => {
  //               const m = String(s.mode || '').toLowerCase();
  //               return m === 'online' || m === 'hybrid';
  //             });
  //             const hasInPerson = availableSlots.some(s => {
  //               const m = String(s.mode || '').toLowerCase();
  //               return m === 'face_to_face' || m === 'in_person' || m === 'hybrid';
  //             });
  //             if (hasAnySlots) hasAvailability = true;
  //             if (modes.length === 0 && (hasOnline || hasInPerson)) {
  //               const derived = [];
  //               if (hasInPerson) derived.push('In-person');
  //               if (hasOnline) derived.push('Online');
  //               modes = derived;
  //             }
  //           }
  //         } catch (_) {}
  //       }

  //       const incomplete = topics.length === 0 || guidelines.length === 0 || modes.length === 0 || !hasAvailability;
  //       if (incomplete) {
  //         // Do not redirect; show banner on dashboard to encourage completion
  //         localStorage.setItem('advisys_advisor_onboarding_complete', 'false');
  //       } else {
  //         localStorage.setItem('advisys_advisor_onboarding_complete', 'true');
  //       }
  //     } catch (_) {}
  //   };
  //   checkOnboarding();
  // }, [navigate]);

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'home') {
      navigate('/');
    } else if (page === 'dashboard') {
      navigate('/advisor-dashboard');
    } else if (page === 'consultations') {
      navigate('/advisor-dashboard/consultations');
    } else if (page === 'availability') {
      navigate('/advisor-dashboard/availability');
    } else if (page === 'students') {
      navigate('/advisor-dashboard/students');
    } else if (page === 'profile') {
      navigate('/advisor-dashboard/profile');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };


  const menuItems = [
    { 
      label: "Home", 
      icon: <HomeIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('home') 
    },
    { 
      label: "Dashboard", 
      icon: <ChartBarIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('dashboard') 
    },
    { 
      label: "Consultations", 
      icon: <CalendarDaysIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('consultations') 
    },
    { 
      label: "Availability", 
      icon: <ClockIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('availability') 
    },
    { 
      label: "Students", 
      icon: <CalendarDaysIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('students') 
    },
    { 
      label: "Profile", 
      icon: <Cog6ToothIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('profile') 
    },
    { 
      label: "Logout", 
      icon: <ArrowRightOnRectangleIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('logout') 
    },
  ];

  return (
    <>
    <div className="advisor-dash-wrap">
      <AdvisorTopNavbar />

      {/* Hamburger Menu Overlay - Mobile & Tablet */}
      <div className="xl:hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
        <style>{`
          .square-hamburger-btn {
            border-radius: 8px !important;
            pointer-events: auto !important;
          }
          .square-hamburger-btn * {
            pointer-events: auto !important;
          }
          .hamburger-overlay-9999 {
            pointer-events: auto !important;
          }
          .hamburger-button-9999 {
            pointer-events: auto !important;
          }
        `}</style>
        <HamburgerMenuOverlay
          items={menuItems}
          buttonTop="12px"
          buttonLeft="16px"
          buttonSize="md"
          buttonColor="#111827"
          buttonColorMobile="#111827"
          overlayBackground="#111827"
          overlayBackgroundMobile="#111827"
          textColor="#ffffff"
          fontSize="md"
          fontWeight="normal"
          animationDuration={0.5}
          staggerDelay={0.08}
          menuAlignment="left"
          enableBlur={false}
          zIndex={9999}
          buttonSizeMobile="md"
          buttonClassName="square-hamburger-btn"
        />
      </div>

      {/* Body */}
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <AdvisorSidebar 
            collapsed={collapsed} 
            onToggle={toggleSidebar} 
            onNavigate={handleNavigation}
          />
        </div>

        {/* Content */}
        <main className="advisor-dash-main">

          {/* Mobile Sticky Upcoming Consultations - visible on mobile & tablets */}
      <div className="xl:hidden mobile-upcoming-sticky">
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="mobile-upcoming-trigger">
                <div className="flex items-center justify-between w-full">
                  <h3 className="font-semibold text-base">Upcoming Consultations</h3>
                  <BsChevronDown className="chevron-icon" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mobile-upcoming-content">
                  <UpcomingConsultationsCard />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {consultationProfileReady && (
            <div className="dashboard-bento-grid">
              {!collapsed && (
                <div className="bento-item-tall-wide" style={{ gridColumn: '1 / 3', gridRow: '1 / 3' }}>
                  <TotalConsultationsCard />
                </div>
              )}
              {!collapsed && (
                <div className="bento-item-small" style={{ gridColumn: '3', gridRow: '1' }}>
                  <ConsultationModeCard />
                </div>
              )}
              <div className="bento-item-small" style={{ gridColumn: '3', gridRow: '2' }}>
                <AverageSessionCard />
              </div>
              <div className="bento-item-tall hidden xl:block" style={{ gridColumn: '4', gridRow: '1 / 3' }}>
                <UpcomingConsultationsCard />
              </div>
              {!collapsed && (
                <div className="bento-item-extra-wide" style={{ gridColumn: '1 / 4', gridRow: '3' }}>
                  <ConsultationTrendCard />
                </div>
              )}
              <div className="bento-item-small" style={{ gridColumn: '4', gridRow: '3' }}>
                <TopTopicsCard />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
    {consultationPromptOpen ? (
      (() => {
        const missing = { topics: [], guidelines: [], courses: [] };
        return (
          <ConsultationSetupGate
            open={true}
            missing={missing}
            onProceed={()=>{
              setConsultationPromptOpen(false);
              navigate('/advisor-dashboard/profile', { state: { focusConsultation: true, autoEditConsultation: true } });
            }}
          />
        );
      })()
    ) : null}
    </>
  );
}
