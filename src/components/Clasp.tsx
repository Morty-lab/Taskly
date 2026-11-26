/** The string-and-button clasp of a long brown envelope. Decorative; authored SVG. */
export function Clasp({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 44" className={className} aria-hidden="true" focusable="false">
      {/* lower button, on the envelope body */}
      <circle cx="60" cy="30" r="9" fill="#86592a" stroke="#4a3017" strokeWidth="1.2" />
      <circle cx="60" cy="30" r="3" fill="#4a3017" opacity=".55" />
      {/* string wound in a figure-eight, trailing off */}
      <path
        d="M60 30c-9-6-9-18 0-22 9 4 9 16 0 22 7 5 17 4 24-3s16-6 30-2"
        fill="none"
        stroke="#b3261e"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M60 8c-6 0-10 1-14-2" fill="none" stroke="#b3261e" strokeWidth="2.2" strokeLinecap="round" />
      {/* upper button, on the flap */}
      <circle cx="60" cy="8" r="6" fill="#9a6a35" stroke="#4a3017" strokeWidth="1.2" />
    </svg>
  );
}

/** The envelope's printed wordmark, stamped. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`stamp ${className || "text-[1.05rem]"}`} style={{ rotate: "-2deg" }}>
      Job Scraper
    </span>
  );
}
