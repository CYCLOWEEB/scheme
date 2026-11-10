'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { AudioLines, Loader2, Mic } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { tr } from '@/lib/ui-copy';
import SchemeBotAvatar, { type SchemeBotActivity } from '@/components/SchemeBotAvatar';
import VoiceAIAssistant from '@/components/VoiceAIAssistant';
import { useExperienceMotion } from '@/components/FluidExperience';

interface SchemeBotProps {
  language: string;
  currentSchemeName?: string;
  userProfile: UserProfile;
  isSampleProfile?: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface BotPosition {
  x: number;
  y: number;
}

interface BotDrag {
  pointerId: number;
  startX: number;
  startY: number;
  origin: BotPosition;
  moved: boolean;
}

export default function SchemeBot({ language, currentSchemeName, userProfile, isSampleProfile = false, isOpen, onOpenChange }: SchemeBotProps) {
  const botRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);
  const positionRef = useRef<BotPosition | null>(null);
  const dragRef = useRef<BotDrag | null>(null);
  const suppressClickRef = useRef(false);
  const landingTimeoutRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLanding, setIsLanding] = useState(false);
  const [activity, setActivity] = useState<SchemeBotActivity>('idle');
  const visibleActivity = isOpen ? activity : 'idle';
  const { paused, lightweight } = useExperienceMotion();

  useEffect(() => {
    if (paused || lightweight) return;
    const pointer = window.matchMedia('(pointer: fine)');
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const resetLook = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      botRef.current?.style.removeProperty('--bot-look-x');
      botRef.current?.style.removeProperty('--bot-look-y');
      botRef.current?.style.removeProperty('--bot-head-turn');
    };

    const updateLook = () => {
      frame = 0;
      const bot = botRef.current;
      const stage = stageRef.current;
      if (!bot || !stage || dragRef.current?.moved) return;
      const bounds = stage.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (pointerX - bounds.left - bounds.width / 2) / 240));
      const y = Math.max(-1, Math.min(1, (pointerY - bounds.top - bounds.height / 2) / 200));
      bot.style.setProperty('--bot-look-x', `${x * 3}px`);
      bot.style.setProperty('--bot-look-y', `${y * 2}px`);
      bot.style.setProperty('--bot-head-turn', `${x * 5}deg`);
    };

    const followPointer = (event: globalThis.PointerEvent) => {
      if (!pointer.matches || event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(updateLook);
    };

    window.addEventListener('pointermove', followPointer, { passive: true });
    window.addEventListener('blur', resetLook);
    document.documentElement.addEventListener('pointerleave', resetLook);
    pointer.addEventListener('change', resetLook);
    return () => {
      resetLook();
      window.removeEventListener('pointermove', followPointer);
      window.removeEventListener('blur', resetLook);
      document.documentElement.removeEventListener('pointerleave', resetLook);
      pointer.removeEventListener('change', resetLook);
    };
  }, [paused, lightweight]);

  useEffect(() => () => {
    if (landingTimeoutRef.current !== null) window.clearTimeout(landingTimeoutRef.current);
  }, []);

  const updateLayout = useCallback((nextPosition?: BotPosition) => {
    const bot = botRef.current;
    if (!bot) return;
    const panel = panelRef.current;
    // An untouched, closed launcher is already positioned by CSS. Mobile
    // browser chrome changes must not force a layout read on every scroll.
    if (!nextPosition && !positionRef.current && (!panel || panel.hidden)) return;

    const viewport = window.visualViewport;
    const edge = 16;
    const left = (viewport?.offsetLeft ?? 0) + edge;
    const top = (viewport?.offsetTop ?? 0) + edge;
    const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? document.documentElement.clientWidth) - edge;
    const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - edge;
    const bounds = bot.getBoundingClientRect();
    const desired = nextPosition ?? positionRef.current ?? { x: bounds.left, y: bounds.top };
    const x = Math.min(Math.max(left, desired.x), Math.max(left, right - bounds.width));
    const y = Math.min(Math.max(top, desired.y), Math.max(top, bottom - bounds.height));

    if (nextPosition || positionRef.current) {
      positionRef.current = { x, y };
      bot.style.left = `${x}px`;
      bot.style.top = `${y}px`;
      bot.style.bottom = 'auto';
    }

    if (!panel || panel.hidden) return;

    // Keep the conversation visible even when the launcher is near a screen edge.
    panel.style.maxHeight = `${Math.max(0, bottom - top)}px`;
    panel.style.maxWidth = `${Math.max(0, right - left)}px`;
    let panelLeft = Math.min(Math.max(left, x), Math.max(left, right - panel.offsetWidth));
    const above = y - panel.offsetHeight - 12;
    const below = y + bounds.height + 12;
    const preferredTop = above >= top || below + panel.offsetHeight > bottom ? above : below;
    let panelTop = Math.min(Math.max(top, preferredTop), Math.max(top, bottom - panel.offsetHeight));

    if (above < top && below + panel.offsetHeight > bottom) {
      const spaceLeft = x - left - 12;
      const spaceRight = right - x - bounds.width - 12;
      if (Math.max(spaceLeft, spaceRight) >= panel.offsetWidth) {
        panelLeft = spaceLeft >= spaceRight ? x - panel.offsetWidth - 12 : x + bounds.width + 12;
        panelTop = Math.min(Math.max(top, y), Math.max(top, bottom - panel.offsetHeight));
      }
    }

    panel.style.left = `${panelLeft}px`;
    panel.style.top = `${panelTop}px`;
  }, []);

  useLayoutEffect(() => {
    let frame = 0;
    const syncLayout = () => {
      if (!frame) frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateLayout();
      });
    };
    updateLayout();

    const observer = new ResizeObserver(syncLayout);
    if (botRef.current) observer.observe(botRef.current);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener('resize', syncLayout);
    window.visualViewport?.addEventListener('resize', syncLayout);
    window.visualViewport?.addEventListener('scroll', syncLayout);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', syncLayout);
      window.visualViewport?.removeEventListener('resize', syncLayout);
      window.visualViewport?.removeEventListener('scroll', syncLayout);
    };
  }, [isOpen, updateLayout]);

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || !botRef.current) return;

    if (landingTimeoutRef.current !== null) window.clearTimeout(landingTimeoutRef.current);
    setIsLanding(false);
    const bounds = botRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: bounds.left, y: bounds.top },
      moved: false,
    };
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    // A small movement still counts as a normal tap or click.
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 6) return;

    if (!drag.moved) {
      drag.moved = true;
      suppressClickRef.current = true;
      setIsDragging(true);
    }
    event.preventDefault();
    botRef.current?.style.setProperty('--bot-drag-tilt', `${Math.max(-12, Math.min(12, deltaX / 12))}deg`);
    updateLayout({ x: drag.origin.x + deltaX, y: drag.origin.y + deltaY });
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    const moved = dragRef.current.moved;
    dragRef.current = null;
    setIsDragging(false);
    if (moved) {
      setIsLanding(true);
      landingTimeoutRef.current = window.setTimeout(() => {
        setIsLanding(false);
        landingTimeoutRef.current = null;
      }, 650);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    const launcher = launcherRef.current;
    panel?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing && !event.defaultPrevented) {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (panel?.contains(document.activeElement) || document.activeElement === document.body) {
        const target = previousFocus instanceof HTMLElement && previousFocus.isConnected
          ? previousFocus
          : launcher;
        target?.focus({ preventScroll: true });
      }
    };
  }, [isOpen, onOpenChange]);

  return (
    <div
      ref={botRef}
      className="scheme-bot"
      data-animations="true"
      data-dragging={isDragging}
      data-motion={isDragging ? 'dragging' : isLanding ? 'landing' : isOpen ? 'active' : 'idle'}
      data-activity={visibleActivity}
    >
      <div
        ref={panelRef}
        id="scheme-bot-panel"
        role="dialog"
        aria-labelledby="scheme-bot-heading"
        hidden={!isOpen}
        className="scheme-bot-panel"
      >
        <VoiceAIAssistant
          key={`${currentSchemeName}-${isSampleProfile}-${JSON.stringify(userProfile)}`}
          language={language}
          currentSchemeName={currentSchemeName}
          userProfile={userProfile}
          isSampleProfile={isSampleProfile}
          isActive={isOpen}
          onActivityChange={setActivity}
          onClose={() => onOpenChange(false)}
        />
      </div>
      <button
        ref={launcherRef}
        id="scheme-bot-launcher"
        type="button"
        aria-label={tr(language, isOpen ? 'Close voice chat' : 'Open voice chat')}
        aria-haspopup="dialog"
        aria-controls="scheme-bot-panel"
        aria-expanded={isOpen}
        title={tr(language, 'Drag to move, click to chat')}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onDragStart={(event) => event.preventDefault()}
        onClick={(event) => {
          if (suppressClickRef.current && event.detail !== 0) {
            suppressClickRef.current = false;
            event.preventDefault();
            return;
          }
          onOpenChange(!isOpen);
        }}
        className="scheme-bot-launcher group flex items-center gap-2 rounded-2xl text-blue-900"
      >
        <span ref={stageRef} className="scheme-bot-stage" aria-hidden="true">
          <span className="scheme-bot-spark scheme-bot-spark-one" />
          <span className="scheme-bot-spark scheme-bot-spark-two" />
          <span className="scheme-bot-idle">
            <SchemeBotAvatar className="h-full w-full" animated activity={visibleActivity} />
          </span>
        </span>
        <span className="scheme-bot-prompt inline-flex min-h-11 items-center gap-2 rounded-2xl rounded-bl-md border border-blue-100 px-3.5 py-2 text-sm font-bold group-hover:border-blue-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            {visibleActivity === 'thinking'
              ? <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
              : visibleActivity === 'speaking'
                ? <AudioLines className="h-3.5 w-3.5" aria-hidden="true" />
                : <Mic className="h-3.5 w-3.5" aria-hidden="true" />}
          </span>
          {tr(language, visibleActivity === 'idle' ? 'Ask AI' : visibleActivity === 'listening' ? 'Listening' : visibleActivity === 'thinking' ? 'Thinking' : 'Speaking')}
        </span>
      </button>
    </div>
  );
}
