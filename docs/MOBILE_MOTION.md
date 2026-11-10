# Mobile motion

Small viewports (up to 767px), devices without hover, and coarse pointers use
lightweight motion. The pointer checks also cover phones in landscape and touch
tablets. Keep `LIGHTWEIGHT_MOTION_QUERY` in `lib/motion-preferences.ts` and the
matching media query in `app/motion.css` aligned.

On these devices:

- Navigation updates the existing panels immediately with a short opacity fade.
  It does not capture full-page View Transition snapshots or remount saved forms.
- The header is opaque; large backdrop blurs and moving background layers are
  disabled. Touch feedback uses short transform transitions.
- Scroll parallax, pointer tracking, tap-wave DOM insertion, delayed reveals,
  shared-layout highlights, and per-frame number counting are skipped.
- The assistant uses one small floating layer instead of independently animated
  SVG parts and a shadow. Its controls, activity indicators, and drag behavior
  remain available.

Desktop motion remains enabled. Header geometry is measured when the layout
changes, and scroll-related properties are written to their specific elements.
Reduced-motion preferences disable animations on both device classes, including
when the preference changes while the app is open.

## Regression checks

Run `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build`.
Test the production preview in a browser with touch emulation at 320px and 390px,
phone landscape, a tablet viewport, a small mouse-driven window, and desktop:

1. Scroll the Lens page and select each goal. Content must remain visible.
2. Change calculator values, switch sections, and return. Values must persist.
3. Tap several destinations rapidly. Only the last requested panel should show.
4. Edit a profile, leave, and return. Check English and Hindi for overflow.
5. Open and close the assistant, and check its position at viewport edges.
6. Enable reduced motion, including after loading. Decorative animations should
   stop. Resize between desktop and phone widths and repeat navigation.
7. Disable `document.startViewTransition` before loading to check the desktop
   fallback. Navigation must remain usable without snapshots.

The November 10, 2026 validation passed these checks in Chromium emulation across
nine configurations, along with 111 existing unit tests. A production-browser
comparison at 390px with 4x CPU throttling showed a large reduction in delayed
frames during scrolling and tab changes. Emulation does not reproduce a phone's
GPU, thermal throttling, or Safari; confirm the experience on physical devices
before claiming a guaranteed frame rate.
