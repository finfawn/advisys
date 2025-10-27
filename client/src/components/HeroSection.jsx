import React from "react";
import { ScrollReveal } from "../lightswind/scroll-reveal";

function HeroSection({ onGetStarted }) {
  return (
    <section className="md:snap-start shrink-0 w-full h-screen flex flex-col relative px-6 py-10 bg-[#e1e5f2]">
      {/* Left-aligned Hero Content */}
      <div className="flex items-center justify-start h-full">
        <div className="z-10 max-w-2xl">
          <ScrollReveal
            size="2xl"
            align="left"
            variant="default"
            className="font-serif"
            baseRotation={0}
          >
            AdviSys
          </ScrollReveal>
          <p className="mt-6 text-lg md:text-xl text-gray-700">
            Where learning meets guidance — connect, consult, and grow together.
          </p>
          <div className="mt-8">
            <button className="cta-primary-btn" onClick={onGetStarted}>
              Get started
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
