// Keep this query in sync with the lightweight rules in app/motion.css.
// Include touch devices in landscape, and small windows with a mouse attached.
export const LIGHTWEIGHT_MOTION_QUERY = '(max-width: 767px), (hover: none), (pointer: coarse)';

export const prefersLightweightMotion = () => window.matchMedia(LIGHTWEIGHT_MOTION_QUERY).matches;

// Start conservatively during hydration; desktop enhancements are opt-in.
export const serverLightweightMotion = () => true;

export const subscribeLightweightMotion = (onChange: () => void) => {
  const media = window.matchMedia(LIGHTWEIGHT_MOTION_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
