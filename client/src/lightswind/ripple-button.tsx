import React from "react";

interface RippleButtonProps {
  text?: string;
  bgColor?: string;
  circleColor?: string;
  width?: string;  // e.g., "200px" or "100%"
  height?: string; // e.g., "50px"
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const RippleButton: React.FC<RippleButtonProps> = ({
  text = "Click Me",
  bgColor,
  circleColor,
  width,
  height,
  loading = false,
  disabled = false,
  onClick,
}) => {
  const isDisabled = loading || disabled;

  return (
    <>
      <button
        className={`ripple-btn text-white dark:text-black dark:bg-white bg-black ${loading ? "is-loading" : ""}`}
        style={{
          backgroundColor: bgColor,
          width: width,
          height: height,
        }}
        type="submit"
        disabled={isDisabled}
        aria-busy={loading}
        onClick={onClick}
      >
        <span className="circle1"></span>
        <span className="circle2"></span>
        <span className="circle3"></span>
        <span className="circle4"></span>
        <span className="circle5"></span>
        {loading ? <span className="loading-bar" aria-hidden="true"></span> : null}
        <span className="text">
          {loading ? <span className="loading-spinner" aria-hidden="true"></span> : null}
          <span>{text}</span>
        </span>
      </button>

      <style>{`
        .ripple-btn {
          font-family: Arial, Helvetica, sans-serif;
          font-weight: bold;
          padding: 1em 2em;
          border: none;
          border-radius: 0.6rem;
          position: relative;
          cursor: pointer;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .ripple-btn:disabled {
          cursor: wait;
          opacity: 0.98;
        }

        .ripple-btn span:not(.text):not(.loading-bar) {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          height: 30px;
          width: 30px;
          background-color: ${circleColor || "#173eff"};
          border-radius: 50%;
          transition: 0.6s ease;
          pointer-events: none;
        }

        .ripple-btn .text {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .ripple-btn .circle1 {
          transform: translate(-3.3em, -4em);
        }

        .ripple-btn .circle2 {
          transform: translate(-6em, 1.3em);
        }

        .ripple-btn .circle3 {
          transform: translate(-0.2em, 1.8em);
        }

        .ripple-btn .circle4 {
          transform: translate(3.5em, 1.4em);
        }

        .ripple-btn .circle5 {
          transform: translate(3.5em, -3.8em);
        }

        .ripple-btn:hover span:not(.text):not(.loading-bar) {
          transform: translate(-50%, -50%) scale(4);
          transition: 1.5s ease;
        }

        .ripple-btn.is-loading span:not(.text):not(.loading-bar) {
          animation: loadingPulse 2.4s ease-in-out infinite;
        }

        .ripple-btn.is-loading .text {
          position: relative;
          z-index: 2;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.28);
          border-top-color: rgba(255, 255, 255, 0.95);
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }

        .loading-bar {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 7px;
          height: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          overflow: hidden;
          z-index: 1;
        }

        .loading-bar::after {
          content: "";
          position: absolute;
          top: 0;
          left: -30%;
          width: 30%;
          height: 100%;
          background: rgba(255, 255, 255, 0.88);
          animation: loadingSlide 1.15s ease-in-out infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes loadingSlide {
          0% {
            left: -30%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes loadingPulse {
          0%,
          100% {
            opacity: 0.58;
          }
          50% {
            opacity: 0.9;
          }
        }
      `}</style>
    </>
  );
};

export default RippleButton;
