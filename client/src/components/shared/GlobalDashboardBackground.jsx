import React from "react";

export default function GlobalDashboardBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: '#e9ecf4'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.7,
          backgroundImage: `
            linear-gradient(#cfd7e61f 1px, transparent 1px),
            linear-gradient(90deg, #cfd7e61f 1px, transparent 1px),
            linear-gradient(#b5c0d81a 1px, transparent 1px),
            linear-gradient(90deg, #b5c0d81a 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px, 24px 24px, 120px 120px, 120px 120px'
        }}
      />
      <img
        src="/logo-large-transparent.png"
        alt=""
        style={{
          position: 'absolute',
          width: 'min(68vw, 1100px)',
          height: 'auto',
          opacity: 0.06,
          filter: 'grayscale(100%)',
          left: '74%',
          top: '58%',
          transform: 'translate(-50%, -50%)',
          userSelect: 'none'
        }}
      />
    </div>
  );
}

