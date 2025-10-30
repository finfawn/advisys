import React from "react";
import { ScrollReveal } from "../lightswind/scroll-reveal";
import "./HeroSection.css";

function HeroSection({ onGetStarted }) {
  return (
    <section className="md:snap-start shrink-0 w-full h-screen flex flex-col relative px-6 py-10 bg-gradient-to-br from-[#e1e5f2] to-[#d8e1f3] overflow-hidden">
      {/* Floating Blur Orbs - Subtle Background Effects */}
      {/* Large orb - top right */}
      <div className="absolute w-[32rem] h-[32rem] bg-blue-400/20 rounded-full blur-3xl top-10 right-20 animate-float-slow" />

      {/* Medium orb - bottom left */}
      <div className="absolute w-[28rem] h-[28rem] bg-indigo-400/20 rounded-full blur-3xl bottom-20 left-32 animate-float-slower" />

      {/* Small orb - center */}
      <div className="absolute w-80 h-80 bg-purple-400/15 rounded-full blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" />

      {/* Radial Fade Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue-50/30" />

      {/* Decorative Elements */}
      <div className="absolute top-20 right-40 w-32 h-32 border border-blue-200/40 rounded-full" />
      <div className="absolute bottom-40 left-20 w-48 h-48 border-2 border-indigo-200/30 rounded-full" />
      <div className="absolute top-1/3 left-1/4 w-16 h-16 border border-sky-300/20 rounded-full animate-spin-slow" />
      
      {/* Geometric Patterns */}
      <div className="absolute top-1/4 right-1/3 w-24 h-24 bg-gradient-to-br from-blue-400/5 to-indigo-400/5 rotate-45 transform" />
      <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-gradient-to-tr from-sky-300/5 to-purple-300/5 rounded-lg rotate-12 transform" />
      
      {/* Modern grid lines */}
      <div className="absolute inset-0 opacity-25">
        <div className="absolute left-1/4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-blue-400 to-transparent"></div>
        <div className="absolute left-2/4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-indigo-400 to-transparent"></div>
        <div className="absolute left-3/4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-blue-400 to-transparent"></div>
        <div className="absolute top-1/4 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
        <div className="absolute top-2/4 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent"></div>
        <div className="absolute top-3/4 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
      </div>

      {/* Left-aligned Hero Content */}
      <div className="flex items-center justify-start h-full relative z-10">
        <div className="max-w-2xl">
          <ScrollReveal
            size="2xl"
            align="left"
            variant="default"
            className="font-sans text-sky-900"
            baseRotation={0}
          >
            AdviSys
          </ScrollReveal>
          <p className="mt-6 text-lg md:text-xl text-gray-700">
            Where learning meets guidance — connect, consult, and grow together in a seamless educational experience.
          </p>
          <div className="mt-8">
            <button 
               onClick={onGetStarted} 
               className="group relative h-16 w-64 bg-sky-800 hover:bg-sky-300 border border-sky-800 hover:border-sky-300 
                          text-gray-50 hover:text-sky-900 text-base font-bold rounded-lg overflow-hidden 
                          text-left p-3 underline underline-offset-2 hover:underline-offset-4 hover:decoration-2 
                          transition-all duration-500 origin-left active:scale-95 
                          focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2" 
             > 
               <span className="relative z-10">Get started</span> 
 
               {/* Hover overlay */} 
               <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" /> 
               {/* Floating blur orb 1 - top right */} 
               <div 
                 className="absolute w-12 h-12 bg-sky-400 rounded-full blur-lg 
                            right-1 top-1 z-10 
                            transition-all duration-500 
                            group-hover:top-8 group-hover:right-16 group-hover:-bottom-8 group-hover:blur-none" 
               /> 
 
               {/* Animated shine effect */} 
               <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" /> 
               {/* Floating blur orb 2 - center right */} 
               <div 
                 className="absolute w-20 h-20 bg-cyan-600 rounded-full blur 
                            right-8 top-3 z-10 
                            transition-all duration-1000 after:duration-500 
                            group-hover:-right-2 group-hover:scale-150 group-hover:blur-none" 
               /> 
            </button>
          </div>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-blue-400/40 rounded-full animate-float-particle-1"></div>
        <div className="absolute top-2/3 left-1/5 w-3 h-3 bg-indigo-400/50 rounded-full animate-float-particle-2"></div>
        <div className="absolute top-1/2 right-1/4 w-5 h-5 bg-sky-400/40 rounded-full animate-float-particle-3"></div>
        <div className="absolute bottom-1/3 right-1/3 w-3 h-3 bg-purple-400/50 rounded-full animate-float-particle-1"></div>
        <div className="absolute top-1/6 right-1/6 w-4 h-4 bg-cyan-400/40 rounded-full animate-float-particle-2"></div>
        <div className="absolute bottom-1/4 left-1/4 w-5 h-5 bg-blue-300/40 rounded-full animate-float-particle-3"></div>
        <div className="absolute top-2/5 left-1/6 w-3 h-3 bg-indigo-300/50 rounded-full animate-float-particle-1"></div>
        <div className="absolute bottom-1/5 right-1/5 w-4 h-4 bg-sky-300/40 rounded-full animate-float-particle-2"></div>
        <div className="absolute top-1/3 right-1/2 w-3 h-3 bg-blue-400/40 rounded-full animate-float-particle-3"></div>
        <div className="absolute bottom-2/5 left-1/3 w-4 h-4 bg-indigo-300/50 rounded-full animate-float-particle-1"></div>
        <div className="absolute top-3/5 right-1/3 w-5 h-5 bg-sky-300/40 rounded-full animate-float-particle-2"></div>
        <div className="absolute bottom-3/4 right-2/5 w-3 h-3 bg-purple-300/50 rounded-full animate-float-particle-3"></div>
        <div className="absolute top-2/3 right-2/3 w-4 h-4 bg-cyan-300/40 rounded-full animate-float-particle-1"></div>
        <div className="absolute bottom-2/3 left-2/3 w-3 h-3 bg-blue-400/50 rounded-full animate-float-particle-2"></div>
        <div className="absolute top-4/5 left-2/5 w-5 h-5 bg-indigo-400/40 rounded-full animate-float-particle-3"></div>
        <div className="absolute bottom-1/6 right-1/4 w-4 h-4 bg-sky-400/50 rounded-full animate-float-particle-1"></div>
      </div>
      
      {/* Abstract shapes */}
      <div className="absolute top-20 left-1/2 w-40 h-40 border-t-2 border-l-2 border-blue-300/20 rotate-12"></div>
      <div className="absolute bottom-20 right-1/3 w-32 h-32 border-b-2 border-r-2 border-indigo-300/20 -rotate-12"></div>
      <div className="absolute top-1/3 right-20 w-24 h-24 border-t-2 border-r-2 border-sky-300/20 rotate-45"></div>
    </section>
  );
}

export default HeroSection;
