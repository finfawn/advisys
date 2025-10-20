import React from "react";
import { BsCalendarEvent, BsPersonCheck, BsFileText, BsBarChart } from "react-icons/bs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../lightswind/card";
import { ScrollReveal } from "../lightswind/scroll-reveal";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    icon: BsCalendarEvent,
    title: "Easy Scheduling",
    desc: "Students can quickly book or reschedule consultations.",
    bullets: ["Quick booking", "Easy rescheduling"],
  },
  {
    icon: BsPersonCheck,
    title: "Online or In-Person",
    desc: "Flexible options for how consultations happen.",
    bullets: ["Video calls", "Face-to-face meetings"],
  },
  {
    icon: BsFileText,
    title: "Consultation Summaries",
    desc: "Auto-generated notes and session documentation.",
    bullets: ["Auto-generated notes", "Session documentation"],
  },
  {
    icon: BsBarChart,
    title: "Analytics & Reports",
    desc: "Access consultation trends and reports.",
    bullets: ["Trend analysis", "Detailed reports"],
  },
];

// Card reveal component
function CardReveal({ children, delay = 0 }) {
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

function FeaturesSection() {
  return (
    <section className="md:snap-start shrink-0 w-full min-h-screen flex items-center px-8 py-16 bg-white overflow-hidden">
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <ScrollReveal size="2xl" align="center" variant="default" baseRotation={0}>
            Features
          </ScrollReveal>
          <ScrollReveal size="lg" align="center" variant="muted" className="mt-4" baseRotation={0}>
            Everything you need for seamless academic consultation
          </ScrollReveal>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <CardReveal key={idx} delay={idx * 0.1}>
                <div className="w-full h-full">
                  <Card hoverable bordered className="bg-white h-full flex flex-col hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                    <CardHeader spacing="default" className="flex-shrink-0">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Icon className="text-blue-600" size={32} />
                        </div>
                        <CardTitle size="default" className="text-gray-900">{f.title}</CardTitle>
                      </div>
                      <CardDescription className="text-center">{f.desc}</CardDescription>
                    </CardHeader>
                    <CardContent padding="default" className="flex-1 flex flex-col justify-end">
                      <ul className="space-y-3 text-sm text-gray-600">
                        {f.bullets.map((b, i) => (
                          <li key={i} className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-blue-400 mr-3 flex-shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </CardReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;


