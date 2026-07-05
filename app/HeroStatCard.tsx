"use client";

import { useState, type CSSProperties } from "react";

type HeroStatIconType = "publication" | "device" | "validation";

type HeroStatCardProps = {
  icon: HeroStatIconType;
  title: string;
  summary: string;
  detail: string;
};

function HeroStatIcon({ type }: { type: HeroStatIconType }) {
  if (type === "publication") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 4h8.5L18 7.5V20H6V4Z" />
        <path d="M14 4v4h4" />
        <path d="M8.5 12h7" />
        <path d="M8.5 15.5h5.5" />
      </svg>
    );
  }

  if (type === "device") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3c-3.2 2.1-3.2 4.1 0 6.1s3.2 4 0 6-3.2 3.9 0 5.9" />
        <path d="M8.3 6.2h7.4" />
        <path d="M8.3 12h7.4" />
        <path d="M8.3 17.8h7.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 19h16" />
      <path d="M6 16l4-5 3 3 5-8" />
      <path d="M15.5 6H18v2.5" />
      <path d="M6 7v9" />
    </svg>
  );
}

export default function HeroStatCard({ icon, title, summary, detail }: HeroStatCardProps) {
  const [isActive, setIsActive] = useState(false);
  const titleStyle: CSSProperties | undefined = isActive ? { transform: "translateY(-8px)" } : undefined;
  const summaryStyle: CSSProperties | undefined = isActive ? { opacity: 0, transform: "translateY(-10px)" } : undefined;
  const detailStyle: CSSProperties | undefined = isActive ? { opacity: 1, transform: "translateY(0)" } : undefined;

  return (
    <article
      className={`hero-stat${isActive ? " is-active" : ""}`}
      tabIndex={0}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      aria-label={`${title}: ${summary}. ${detail}`}
    >
      <span className="hero-stat-icon">
        <HeroStatIcon type={icon} />
      </span>
      <div className="hero-stat-copy">
        <b style={titleStyle}>{title}</b>
        <span className="hero-stat-summary" style={summaryStyle}>
          {summary}
        </span>
        <span className="hero-stat-detail" style={detailStyle}>
          {detail}
        </span>
      </div>
    </article>
  );
}