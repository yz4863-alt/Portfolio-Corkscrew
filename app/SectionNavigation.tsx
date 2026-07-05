"use client";

import { useEffect, useRef } from "react";

const MIN_SCROLL_DURATION = 220;
const MAX_SCROLL_DURATION = 540;

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function getScrollDuration(distance: number) {
  return Math.min(MAX_SCROLL_DURATION, Math.max(MIN_SCROLL_DURATION, 180 + Math.sqrt(distance) * 8));
}

function getAnchorTarget(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href || !href.startsWith("#") || href === "#") {
    return null;
  }

  const id = decodeURIComponent(href.slice(1));
  const target = document.getElementById(id);

  return target ? { hash: href, target } : null;
}

export default function SectionNavigation() {
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    const cancelAnimation = () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const endNavigation = () => {
      root.classList.remove("is-section-jumping");
      window.dispatchEvent(new Event("portfolio:section-jump-end"));
    };

    const scrollToTarget = (target: HTMLElement, hash: string) => {
      cancelAnimation();
      root.classList.add("is-section-jumping");
      window.dispatchEvent(new Event("portfolio:section-jump-start"));

      const startY = window.scrollY;
      const targetY = Math.max(0, target.getBoundingClientRect().top + startY);
      const distance = targetY - startY;
      const duration = getScrollDuration(Math.abs(distance));
      const startTime = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = easeOutCubic(progress);
        window.scrollTo(0, startY + distance * eased);

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(step);
          return;
        }

        animationFrameRef.current = null;
        window.scrollTo(0, targetY);
        history.pushState(null, "", hash);
        endNavigation();
      };

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#']");

      if (!anchor || anchor.target) {
        return;
      }

      const destination = getAnchorTarget(anchor);

      if (!destination) {
        return;
      }

      event.preventDefault();
      scrollToTarget(destination.target, destination.hash);
    };

    const handleUserInterrupt = () => {
      if (animationFrameRef.current === null) {
        return;
      }

      cancelAnimation();
      endNavigation();
    };

    document.addEventListener("click", handleClick);
    window.addEventListener("wheel", handleUserInterrupt, { passive: true });
    window.addEventListener("touchstart", handleUserInterrupt, { passive: true });
    window.addEventListener("keydown", handleUserInterrupt);

    return () => {
      cancelAnimation();
      root.classList.remove("is-section-jumping");
      document.removeEventListener("click", handleClick);
      window.removeEventListener("wheel", handleUserInterrupt);
      window.removeEventListener("touchstart", handleUserInterrupt);
      window.removeEventListener("keydown", handleUserInterrupt);
    };
  }, []);

  return null;
}
