'use client';

import { useEffect, useRef } from 'react';
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useExperienceMotion } from './FluidExperience';

/** The accessible value changes immediately; only the decorative digits count. */
export default function AnimatedNumber({ value, format = String, className }: { value: number; format?: (value: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const inView = useInView(ref, { once: true });
  const reducedMotion = useReducedMotion();
  const { paused, lightweight } = useExperienceMotion();
  const counter = useMotionValue(value);
  const text = useTransform(counter, current => format(Math.round(current)));

  useEffect(() => {
    if (reducedMotion || paused || lightweight || !inView) {
      counter.set(value);
      if (reducedMotion || paused || lightweight) previous.current = value;
      return;
    }
    counter.set(previous.current);
    const animation = animate(counter, value, { duration: 0.85, ease: [0.22, 1, 0.36, 1] });
    previous.current = value;
    return () => animation.stop();
  }, [counter, inView, reducedMotion, paused, lightweight, value]);

  return <span ref={ref} className={className} aria-label={format(value)}><motion.span aria-hidden="true">{text}</motion.span></span>;
}
