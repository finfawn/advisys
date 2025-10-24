"use client";

import React, { useState } from "react";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import HowItWorksSection from "../components/HowItWorksSection";
import { useNavigate } from "react-router-dom";
import AuthPage from "./AuthPage";
import "./Home.css";
import HomeSidebar from "../components/HomeSidebar";
import Footer from "../components/Footer";
import HamburgerMenuOverlay from "../lightswind/hamburger-menu-overlay";

function Home() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("hero");
  const [isManualNavigation, setIsManualNavigation] = useState(false);

  const openAuthModal = (mode) => {
    // Navigate to full auth page instead of modal
    navigate("/auth");
  };

  const handleSelect = (sectionId) => {
    if (sectionId === "auth") {
      navigate("/auth");
      return;
    }
    
    // Set flag to prevent automatic snap during manual navigation
    setIsManualNavigation(true);
    
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: "smooth", 
        block: "start",
        inline: "nearest"
      });
      setActiveSection(sectionId);
      // close handled by overlay component itself
      
      // Reset flag after navigation completes
      setTimeout(() => {
        setIsManualNavigation(false);
      }, 1500);
    }
  };

  // Track which section is in view using Intersection Observer
  React.useEffect(() => {
    // Don't set up observer during manual navigation
    if (isManualNavigation) {
      return;
    }

    const sections = ["hero", "features", "how-it-works"];
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            setActiveSection(sectionId);
            
            // Scroll snap to the section when 1/3 is visible
            entry.target.scrollIntoView({ 
              behavior: "smooth", 
              block: "start",
              inline: "nearest"
            });
          }
        });
      },
      {
        threshold: 0.33, // Trigger when 1/3 (33%) of the section is visible
        rootMargin: "0px 0px -10% 0px" // Add some margin for better detection
      }
    );

    // Observe all sections
    sections.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
      sections.forEach((sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
          observer.unobserve(section);
        }
      });
    };
  }, [isManualNavigation]); // Re-run when manual navigation state changes

  return (
    <>
      <div className="h-screen bg-[#e1e5f2] overflow-hidden">
        <div className="w-full h-full flex">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <HomeSidebar activeSection={activeSection} onSelect={handleSelect} />
          </div>

          <main className="flex-1 overflow-y-auto scroll-smooth relative">
            {/* Mobile Hamburger Overlay */}
            <div className="md:hidden fixed top-0 left-0 w-full z-50">
              <HamburgerMenuOverlay
                items={[
                  { label: "Home", onClick: () => handleSelect("hero") },
                  { label: "What's Inside", onClick: () => handleSelect("features") },
                  { label: "How it Works", onClick: () => handleSelect("how-it-works") },
                  { label: "Sign In", onClick: () => navigate("/auth") },
                ]}
                buttonTop="30px"
                buttonLeft="30px"
                buttonSize="md"
                buttonColor="#111827"
                overlayBackground="#111827"
                textColor="#ffffff"
                fontSize="lg"
                menuAlignment="left"
                enableBlur={false}
                zIndex={40}
              />
            </div>
            <div className="md:snap-y md:snap-mandatory">
              <div id="hero">
                <HeroSection onGetStarted={() => navigate("/auth")} />
              </div>
              <div id="features">
                <FeaturesSection />
              </div>
              <div id="how-it-works">
                <HowItWorksSection />
              </div>
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default Home;


