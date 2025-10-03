'use client';

import React from 'react';

const AnimateLoading = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f7f9fc] font-[Inter]">
      <div
        className="rounded-full p-2"
        style={{
          animation: 'shine-pulse 4s infinite alternate ease-in-out',
          transition: 'all 0.3s ease',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="200" height="200">
          <defs>
            <linearGradient id="rippleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e0ff" />
              <stop offset="100%" stopColor="#ff9d3c" />
            </linearGradient>
            <linearGradient id="glyphGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#33ccff" />
            </linearGradient>
          </defs>

          <circle cx="32" cy="32" r="30" fill="#0d1b2a" />

          <g>
            <circle
              cx="32"
              cy="32"
              r="22"
              stroke="url(#rippleGrad)"
              strokeWidth="2"
              fill="none"
              opacity="1.0"
              className="ripple ripple-1"
              style={{
                transformOrigin: '50% 50%',
                animation: 'ripple-wave 3s infinite cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                animationDelay: '0s',
              }}
            />
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke="url(#rippleGrad)"
              strokeWidth="1.6"
              fill="none"
              opacity="1.0"
              className="ripple ripple-2"
              style={{
                transformOrigin: '50% 50%',
                animation: 'ripple-wave 3s infinite cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                animationDelay: '1s',
              }}
            />
            <circle
              cx="32"
              cy="32"
              r="30"
              stroke="url(#rippleGrad)"
              strokeWidth="1.2"
              fill="none"
              opacity="1.0"
              className="ripple ripple-3"
              style={{
                transformOrigin: '50% 50%',
                animation: 'ripple-wave 3s infinite cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                animationDelay: '2s',
              }}
            />
          </g>

          <path
            d="M20 20 L32 32 L20 44"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M38 44 L46 44"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Keyframes injected inline for Tailwind-only setup */}
      <style jsx>{`
        @keyframes ripple-wave {
          0% {
            transform: scale(1);
            opacity: 0.8;
            stroke-width: 2;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
            stroke-width: 0;
          }
        }

        @keyframes shine-pulse {
          0%,
          100% {
            box-shadow: 0 0 10px rgba(13, 27, 42, 0.4);
          }
          50% {
            box-shadow: 0 0 20px rgba(0, 224, 255, 0.6), 0 0 40px rgba(255, 157, 60, 0.4);
          }
        }
      `}</style>
    </div>
  );
};

export default AnimateLoading;