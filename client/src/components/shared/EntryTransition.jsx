import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function EntryTransition({ show = true, onDone }) {
  const LOGO_SIZE = 168;
  const [vw, setVw] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [vh, setVh] = React.useState(typeof window !== "undefined" ? window.innerHeight : 720);
  const SCALE_MS = 900;
  const HOLD_MS = 220;
  const FADE_MS = 350;
  const [fading, setFading] = React.useState(false);
  const startScale = React.useMemo(() => {
    const diag = Math.hypot(vw, vh);
    return Math.max(1, (diag / LOGO_SIZE) * 1.2); // start large enough to cover viewport
  }, [vw, vh]);

  React.useLayoutEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            pointerEvents: "none"
          }}
        >
          {/* Base cover keeps page hidden until fade phase */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: fading ? 0 : 1 }}
            transition={{ duration: FADE_MS / 1000, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (fading) onDone && onDone();
            }}
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, #e9ecf4 0%, #e4e9f4 100%)"
            }}
          />
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${vw} ${vh}`}
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            <defs>
              <mask id="adviLogoMask" maskUnits="userSpaceOnUse">
                {/* Show overlay where mask is white; start big then scale to logo */}
                <rect x="0" y="0" width={vw} height={vh} fill="black" />
                <motion.g
                  initial={{ scale: startScale }}
                  animate={{ scale: 1 }}
                  transition={{ duration: SCALE_MS / 1000, ease: "easeInOut" }}
                  style={{ transformOrigin: "50% 50%" }}
                  onAnimationComplete={() => {
                    setTimeout(() => setFading(true), HOLD_MS);
                  }}
                >
                  {/* Center the logo image */}
                  <image
                    href="/logo-large-transparent.png"
                    x={vw / 2 - LOGO_SIZE / 2}
                    y={vh / 2 - LOGO_SIZE / 2}
                    width={LOGO_SIZE}
                    height={LOGO_SIZE}
                    style={{ imageRendering: "optimizeQuality" }}
                  />
                </motion.g>
              </mask>
              <linearGradient id="adviGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e9ecf4" />
                <stop offset="100%" stopColor="#e4e9f4" />
              </linearGradient>
              <linearGradient id="adviAccent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a51a3" />
                <stop offset="100%" stopColor="#2aa3c8" />
              </linearGradient>
            </defs>
            {/* Masked overlay for logo animation; it also fades along with base cover */}
            <motion.rect
              x="0"
              y="0"
              width={vw}
              height={vh}
              fill="url(#adviAccent)"
              mask="url(#adviLogoMask)"
              initial={{ opacity: 1 }}
              animate={{ opacity: fading ? 0 : 1 }}
              transition={{ duration: FADE_MS / 1000, ease: "easeInOut" }}
            />
          </svg>
          {/* Foreground forming logo (draw + fill reveal), fades with cover */}
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${vw} ${vh}`}
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              pointerEvents: "none"
            }}
          >
            <defs>
              <mask id="logoRevealMask">
                <rect x="0" y="0" width={vw} height={vh} fill="black" />
                <motion.circle
                  cx={vw / 2}
                  cy={vh / 2}
                  r={0}
                  animate={{ r: LOGO_SIZE / 2 }}
                  transition={{ duration: SCALE_MS / 1000, ease: "easeInOut" }}
                  fill="white"
                />
              </mask>
            </defs>
            {/* Logo image revealed by expanding circle mask */}
            <motion.image
              href="/logo-large-transparent.png"
              x={vw / 2 - LOGO_SIZE / 2}
              y={vh / 2 - LOGO_SIZE / 2}
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              mask="url(#logoRevealMask)"
              initial={{ opacity: 1 }}
              animate={{ opacity: fading ? 0 : 1 }}
              transition={{ duration: FADE_MS / 1000, ease: "easeInOut", delay: SCALE_MS / 1000 + HOLD_MS / 1000 }}
              style={{ imageRendering: "optimizeQuality" }}
            />
            {/* Outline draw effect around logo */}
            <motion.circle
              cx={vw / 2}
              cy={vh / 2}
              r={(LOGO_SIZE / 2) * 0.92}
              fill="none"
              stroke="url(#adviAccent)"
              strokeLinecap="round"
              initial={{ pathLength: 1, strokeDasharray: "1", strokeDashoffset: 1, opacity: 1, strokeWidth: 2 }}
              animate={{
                strokeDashoffset: 0,
                strokeWidth: 6,
                opacity: fading ? 0 : 1
              }}
              transition={{
                duration: SCALE_MS / 1000,
                ease: "easeInOut"
              }}
            />
          </svg>
        </div>
      )}
    </AnimatePresence>
  );
}
