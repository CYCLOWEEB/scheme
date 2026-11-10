'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export type SectionView = 'showcase' | 'wizard' | 'calculator' | 'locator' | 'documents' | 'upload' | 'profile';

/** Snapshot only the content, keeping the live screens and their form state intact. */
export function useSectionNavigation(initialView: SectionView = 'showcase') {
  const [activeView, setActiveView] = useState(initialView);
  const requestedView = useRef(initialView);
  const transitionRef = useRef<ViewTransition | null>(null);
  const requestId = useRef(0);

  const navigate = useCallback((next: SectionView) => {
    if (next === requestedView.current) return;
    const order: SectionView[] = ['showcase', 'wizard', 'calculator', 'locator', 'documents', 'upload', 'profile'];
    document.documentElement.style.setProperty('--section-direction', order.indexOf(next) > order.indexOf(requestedView.current) ? '1' : '-1');
    requestedView.current = next;
    const id = ++requestId.current;
    transitionRef.current?.skipTransition();

    const update = () => {
      // A skipped transition may still invoke its update. Only the latest tap wins.
      if (id !== requestId.current) return;
      const previousFocus = document.activeElement;
      const focusWasInContent = previousFocus instanceof HTMLElement && Boolean(previousFocus.closest('.app-main'));
      flushSync(() => setActiveView(next));
      window.scrollTo({ top: 0, behavior: 'instant' });
      const focused = document.activeElement;
      if (focusWasInContent && (focused === document.body || (focused instanceof HTMLElement && focused.closest('.tab-panel.hidden')))) {
        document.getElementById('main-content')?.focus({ preventScroll: true });
      }
    };

    const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.querySelector('.app-shell')?.getAttribute('data-motion') === 'paused';
    if (!document.startViewTransition || motionOff) {
      document.documentElement.dataset.sectionNavigation = motionOff ? 'instant' : 'fallback';
      delete document.documentElement.dataset.sectionTransition;
      update();
      return;
    }

    // Keep the chosen animation mode after the snapshot finishes. Removing the
    // transient flag must not start the CSS fallback a second time.
    document.documentElement.dataset.sectionNavigation = 'snapshot';
    document.documentElement.dataset.sectionTransition = 'active';
    const transition = document.startViewTransition(update);
    transitionRef.current = transition;
    // Snapshot failures fall back to the ordinary update; they must never block navigation.
    void transition.ready.catch(() => {});
    void transition.finished.catch(() => {}).finally(() => {
      if (id !== requestId.current) return;
      transitionRef.current = null;
      delete document.documentElement.dataset.sectionTransition;
    });
  }, []);

  useEffect(() => {
    const requests = requestId;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      if (media.matches || document.querySelector('.app-shell')?.getAttribute('data-motion') === 'paused') {
        transitionRef.current?.skipTransition();
      }
    };
    const observer = new MutationObserver(stop);
    const shell = document.querySelector('.app-shell');
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['data-motion'] });
    media.addEventListener('change', stop);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', stop);
      ++requests.current;
      transitionRef.current?.skipTransition();
      delete document.documentElement.dataset.sectionTransition;
      delete document.documentElement.dataset.sectionNavigation;
      document.documentElement.style.removeProperty('--section-direction');
    };
  }, []);

  return [activeView, navigate] as const;
}
