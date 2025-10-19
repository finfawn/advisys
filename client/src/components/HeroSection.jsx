import React from "react";
import { BsChatDots, BsLaptop, BsPeople, BsGraphUp, BsLightbulb, BsCalendarCheck, BsCalendarEvent, BsPersonCheck, BsFileText, BsBarChart } from "react-icons/bs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../lightswind/card";
import { ScrollReveal } from "../lightswind/scroll-reveal";

function HeroSection({ onGetStarted }) {
  return (
    <section className="snap-start shrink-0 w-full h-screen flex flex-col relative px-6 md:pl-12 lg:pl-16 xl:pl-20 py-10 bg-[#e1e5f2]">
      {/* Left-aligned Hero Content */}
      <div className="flex items-center h-full">
        <div className="z-10">
          <ScrollReveal size="2xl" align="left" variant="default" className="font-serif" baseRotation={0}>
            AdviSys
          </ScrollReveal>
          <p className="mt-6 text-lg md:text-xl text-gray-700">Where learning meets guidance — connect, consult, and grow together.</p>
          <div className="mt-8">
            <button className="cta-primary-btn" onClick={onGetStarted}>Get started</button>
          </div>
        </div>
      </div>

      {/* Background decorative icons */}
      <div className="absolute right-0 top-0 w-1/2 h-full flex items-center justify-center opacity-10">
        <div className="relative w-full h-full">
          {/* Large chat/consultation icon */}
          <BsChatDots className="absolute top-8 right-8 text-blue-400" size={200} />
          
          {/* Technology/laptop icon */}
          <BsLaptop className="absolute top-16 left-12 text-blue-300" size={180} />
          
          {/* People/connection icon */}
          <BsPeople className="absolute bottom-20 right-16 text-blue-500" size={220} />
          
          {/* Growth/graph icon */}
          <BsGraphUp className="absolute bottom-12 left-8 text-blue-400" size={160} />
          
          {/* Lightbulb/ideas icon */}
          <BsLightbulb className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-300" size={190} />
          
          {/* Calendar/scheduling icon */}
          <BsCalendarCheck className="absolute bottom-1/3 right-1/4 text-blue-500" size={140} />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;


