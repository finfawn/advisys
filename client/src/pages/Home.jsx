"use client";

import React, { useState } from "react";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import HowItWorksSection from "../components/HowItWorksSection";
import { useNavigate } from "react-router-dom";
import AuthPage from "./AuthPage";
import "./Home.css";
import HomeSidebar from "../components/HomeSidebar";

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
          <HomeSidebar activeSection={activeSection} onSelect={handleSelect} />

          <main className="flex-1 overflow-y-auto scroll-smooth">
            <div className="snap-y snap-mandatory">
              <div id="hero">
                <HeroSection onGetStarted={() => navigate("/auth")} />
              </div>
              <div id="features">
                <FeaturesSection />
              </div>
              <div id="how-it-works">
                <HowItWorksSection />
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default Home;


