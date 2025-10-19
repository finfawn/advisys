import React from "react";
import { ScrollReveal } from "../lightswind/scroll-reveal";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    number: "1",
    description: "Find your advisor from our network of qualified academic professionals"
  },
  {
    number: "2", 
    description: "Schedule a consultation at a time that works for you, online or in-person"
  },
  {
    number: "3",
    description: "Attend your consultation session and receive personalized guidance"
  },
  {
    number: "4",
    description: "Get a detailed consultation summary with actionable insights and next steps"
  }
];

// Step reveal component
function StepReveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, threshold: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

function HowItWorksSection() {
  return (
    <section className="snap-start shrink-0 w-full h-screen flex items-center px-8 bg-white">
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-16">
          <ScrollReveal size="2xl" align="left" variant="default" baseRotation={0}>
            How does it work?
          </ScrollReveal>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map((step, idx) => (
            <StepReveal key={idx} delay={idx * 0.1}>
              <div className="text-left">
                <div className="text-8xl md:text-9xl font-bold text-gray-900 mb-6 leading-none">
                  {step.number}
                </div>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </StepReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
