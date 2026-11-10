'use client';

import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';

const motionPreference = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const serverMotionPreference = () => false;
const MotionControlsContext = createContext({ paused: false });
export const useExperienceMotion = () => useContext(MotionControlsContext);
const subscribeMotionPreference = (onChange: () => void) => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

/** Adds motion without remounting screens or changing their document flow. */
export default function FluidExperience({ children, activeView }: { children: ReactNode; activeView: string }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const seen = useRef(new WeakSet<HTMLElement>());
  const systemReduced = useSyncExternalStore(subscribeMotionPreference, motionPreference, serverMotionPreference);
  const motionOff = systemReduced;

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const header = shell.querySelector<HTMLElement>('.app-header');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const previousHeaderHeight = document.documentElement.style.getPropertyValue('--app-header-height');
    let scrollFrame = 0;
    let pointerFrame = 0;
    let pointerTarget: HTMLElement | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const updateScroll = () => {
      scrollFrame = 0;
      const headerHeight = header?.offsetHeight ?? 0;
      const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollRange > 0 ? Math.max(0, Math.min(1, window.scrollY / scrollRange)) : 0;
      shell.style.setProperty('--page-progress', String(progress));
      shell.dataset.scrolled = String(window.scrollY > 20);
      document.documentElement.style.setProperty('--app-header-height', `${headerHeight}px`);

      if (!motionOff && finePointer.matches) {
        shell.style.setProperty('--hero-drift', `${Math.min(window.scrollY * 0.13, 65)}px`);
        shell.querySelectorAll<HTMLElement>('.tab-panel:not(.hidden) .goal-card').forEach(card => {
          const bounds = card.getBoundingClientRect();
          if (bounds.bottom > headerHeight && bounds.top < window.innerHeight) {
            const offset = (window.innerHeight / 2 - bounds.top - bounds.height / 2) * 0.025;
            card.style.setProperty('--image-scroll', `${Math.max(-7, Math.min(7, offset))}px`);
          }
        });
      }
    };
    const scheduleScroll = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScroll);
    };

    const resetPointer = () => {
      if (!pointerTarget) return;
      ['--pointer-x', '--pointer-y', '--image-x', '--image-y', '--tilt-x', '--tilt-y', '--magnet-x', '--magnet-y'].forEach(property => pointerTarget?.style.removeProperty(property));
      delete pointerTarget.dataset.pointer;
      pointerTarget = null;
    };
    const updatePointer = () => {
      pointerFrame = 0;
      shell.style.setProperty('--camera-x', `${(pointerX / window.innerWidth - .5) * 22}px`);
      shell.style.setProperty('--camera-y', `${(pointerY / window.innerHeight - .5) * 14}px`);
      if (!pointerTarget) return;
      const bounds = pointerTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (pointerX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (pointerY - bounds.top) / bounds.height));
      pointerTarget.dataset.pointer = 'true';
      pointerTarget.style.setProperty('--pointer-x', `${x * 100}%`);
      pointerTarget.style.setProperty('--pointer-y', `${y * 100}%`);
      if (pointerTarget.classList.contains('goal-card')) {
        pointerTarget.style.setProperty('--image-x', `${(x - 0.5) * -8}px`);
        pointerTarget.style.setProperty('--image-y', `${(y - 0.5) * -6}px`);
        pointerTarget.style.setProperty('--tilt-x', `${(0.5 - y) * 7}deg`);
        pointerTarget.style.setProperty('--tilt-y', `${(x - 0.5) * 7}deg`);
      }
      if (pointerTarget.classList.contains('primary-cta')) {
        pointerTarget.style.setProperty('--magnet-x', `${(x - 0.5) * 6}px`);
        pointerTarget.style.setProperty('--magnet-y', `${(y - 0.5) * 4}px`);
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (motionOff || !finePointer.matches || event.pointerType === 'touch') return;
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.goal-card, .ai-feature-card, .primary-cta, .goal-intro')
        : null;
      if (target !== pointerTarget) {
        resetPointer();
        pointerTarget = target;
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(updatePointer);
    };
    const onPress = (event: PointerEvent) => {
      if (motionOff || !event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>('button:not(:disabled), .scheme-card');
      if (!target || target.closest('.scheme-bot')) return;
      target.querySelectorAll('.tap-wave').forEach(wave => wave.remove());
      const bounds = target.getBoundingClientRect();
      const wave = document.createElement('span');
      wave.className = 'tap-wave';
      wave.setAttribute('aria-hidden', 'true');
      wave.style.left = `${event.clientX - bounds.left}px`;
      wave.style.top = `${event.clientY - bounds.top}px`;
      const size = Math.max(bounds.width, bounds.height) * 2;
      wave.style.width = wave.style.height = `${size}px`;
      target.appendChild(wave);
      const animation = wave.animate([
        { transform: 'translate(-50%, -50%) scale(0)', opacity: 0.35 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
      ], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' });
      animation.onfinish = () => wave.remove();
      animation.oncancel = () => wave.remove();
    };
    const resizeObserver = new ResizeObserver(scheduleScroll);
    const hero = shell.querySelector('.goal-intro');
    const heroObserver = new IntersectionObserver(entries => {
      shell.dataset.heroVisible = String(entries[0]?.isIntersecting ?? false);
    });
    if (hero) heroObserver.observe(hero);
    const onVisibility = () => { shell.dataset.pageHidden = String(document.hidden); };
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    resizeObserver.observe(shell);
    if (header) resizeObserver.observe(header);
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll, { passive: true });
    shell.addEventListener('pointermove', onPointerMove, { passive: true });
    shell.addEventListener('pointerdown', onPress, { passive: true });
    shell.addEventListener('pointerleave', resetPointer);
    window.addEventListener('blur', resetPointer);
    scheduleScroll();

    return () => {
      window.cancelAnimationFrame(scrollFrame);
      window.cancelAnimationFrame(pointerFrame);
      window.removeEventListener('scroll', scheduleScroll);
      window.removeEventListener('resize', scheduleScroll);
      shell.removeEventListener('pointermove', onPointerMove);
      shell.removeEventListener('pointerdown', onPress);
      shell.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('blur', resetPointer);
      resizeObserver.disconnect();
      heroObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      resetPointer();
      ['--camera-x', '--camera-y', '--hero-drift'].forEach(property => shell.style.removeProperty(property));
      shell.querySelectorAll<HTMLElement>('.goal-card').forEach(card => card.style.removeProperty('--image-scroll'));
      shell.querySelectorAll('.tap-wave').forEach(wave => wave.remove());
      document.documentElement.style.setProperty('--app-header-height', previousHeaderHeight);
    };
  }, [motionOff]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || motionOff || !('IntersectionObserver' in window)) return;
    const targets = new Set<HTMLElement>();
    let registerFrame = 0;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.reveal = 'visible';
        seen.current.add(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

    const registerTargets = () => {
      registerFrame = 0;
      shell.querySelectorAll<HTMLElement>('.tab-panel:not(.hidden) :is(.entry-stack > :not(.goal-section), .goal-card, .ai-feature-card, .scheme-results-grid > .scheme-card)').forEach(target => {
        if (targets.has(target) || !target.getClientRects().length) return;
        targets.add(target);
        const siblings = target.parentElement ? Array.from(target.parentElement.children) : [];
        const isSection = target.parentElement?.classList.contains('entry-stack');
        const order = Math.max(0, siblings.indexOf(target));
        target.dataset.revealKind = isSection ? 'section' : 'card';
        target.style.setProperty('--viewport-delay', `${(isSection ? 70 : 0) + Math.min(order, 5) * 65}ms`);
        // Navigation owns the entrance of visible content; do not reveal it again.
        const bounds = target.getBoundingClientRect();
        const enteringWithScreen = Boolean(document.documentElement.dataset.sectionNavigation)
          && bounds.top < window.innerHeight && bounds.bottom > 0;
        target.dataset.reveal = seen.current.has(target) || enteringWithScreen || bounds.bottom <= 0 ? 'settled' : 'pending';
        if (target.dataset.reveal === 'settled') seen.current.add(target);
        if (target.dataset.reveal === 'pending') observer.observe(target);
      });
    };
    const scheduleRegister = () => {
      if (!registerFrame) registerFrame = window.requestAnimationFrame(registerTargets);
    };
    const showFocusedContent = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      let target: HTMLElement | null = event.target.closest('[data-reveal]');
      while (target) {
        target.dataset.reveal = 'settled';
        seen.current.add(target);
        observer.unobserve(target);
        target = target.parentElement?.closest<HTMLElement>('[data-reveal]') ?? null;
      }
    };
    const mutations = new MutationObserver(records => {
      targets.forEach(target => { if (!target.isConnected) { observer.unobserve(target); targets.delete(target); } });
      if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === Node.ELEMENT_NODE))) scheduleRegister();
    });
    mutations.observe(shell, { childList: true, subtree: true });
    shell.addEventListener('focusin', showFocusedContent);
    scheduleRegister();

    return () => {
      window.cancelAnimationFrame(registerFrame);
      observer.disconnect();
      mutations.disconnect();
      shell.removeEventListener('focusin', showFocusedContent);
      targets.forEach(target => {
        delete target.dataset.reveal;
        delete target.dataset.revealKind;
        target.style.removeProperty('--viewport-delay');
      });
    };
  }, [activeView, motionOff]);

  return (
    <MotionConfig reducedMotion={motionOff ? 'always' : 'user'} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
      <MotionControlsContext.Provider value={{ paused: motionOff }}>
      <div ref={shellRef} className="app-shell fluid-experience min-h-screen flex flex-col text-slate-900" data-view={activeView} data-motion={motionOff ? 'paused' : 'active'}>
        <div className="ambient-light" aria-hidden="true"><div className="ambient-wash" /><div className="ambient-grid" /></div>
        {children}
      </div>
      </MotionControlsContext.Provider>
    </MotionConfig>
  );
}
