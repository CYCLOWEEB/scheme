'use client';

import { useId } from 'react';

export type SchemeBotActivity = 'idle' | 'listening' | 'thinking' | 'speaking';

interface SchemeBotAvatarProps {
  className?: string;
  animated?: boolean;
  activity?: SchemeBotActivity;
}

export default function SchemeBotAvatar({ className = '', animated = false, activity = 'idle' }: SchemeBotAvatarProps) {
  const id = useId();
  const paint = (name: string) => `url(#${id}-${name})`;

  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true" focusable="false" data-animated={animated} data-activity={activity} className={`scheme-bot-avatar ${className}`}>
      <defs>
        <linearGradient id={`${id}-shell`} x1="24" y1="19" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset="0.42" stopColor="#eff7ff" />
          <stop offset="0.76" stopColor="#bfdbfe" />
          <stop offset="1" stopColor="#6095e6" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="21" y1="34" x2="79" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93c5fd" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="31" y1="27" x2="65" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor="#234a7b" />
          <stop offset="0.48" stopColor="#102c55" />
          <stop offset="1" stopColor="#071b38" />
        </linearGradient>
        <linearGradient id={`${id}-reflection`} x1="36" y1="26" x2="48" y2="47" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.26" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="34" y1="64" x2="63" y2="89" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="0.45" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id={`${id}-limb`} x1="0" y1="0" x2="1" y2="0.8">
          <stop stopColor="#fff" />
          <stop offset="0.55" stopColor="#dbeafe" />
          <stop offset="1" stopColor="#7ba9e9" />
        </linearGradient>
        <radialGradient id={`${id}-light`} cx="0.32" cy="0.25" r="0.8">
          <stop stopColor="#ecfeff" />
          <stop offset="0.4" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#0ea5e9" />
        </radialGradient>
        <radialGradient id={`${id}-eye`} cx="0.4" cy="0.25" r="0.9">
          <stop stopColor="#ecfeff" />
          <stop offset="0.5" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#22d3ee" />
        </radialGradient>
      </defs>

      <rect x="42" y="60" width="14" height="9" rx="4" fill="#1e40af" />
      <g className="scheme-bot-arm scheme-bot-arm-left">
        <rect x="17" y="66" width="11" height="18" rx="5.5" transform="rotate(18 22.5 75)" fill={paint('limb')} />
      </g>
      <g className="scheme-bot-arm scheme-bot-arm-right">
        <rect x="70" y="64" width="11" height="18" rx="5.5" transform="rotate(-23 75.5 73)" fill={paint('limb')} />
      </g>
      <path d="M31 76C31 68.82 36.82 63 44 63H53C60.18 63 66 68.82 66 76V78C66 85.18 60.18 90 53 90H44C36.82 90 31 85.18 31 78V76Z" fill={paint('body')} />
      <path d="M35 73C35 68.58 38.58 66 43 66H53C57.42 66 61 68.58 61 73V76C61 80.42 57.42 84 53 84H43C38.58 84 35 80.42 35 76V73Z" fill={paint('shell')} />
      <path d="M39 68C41 67 43 67 47 67" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="43" y="72" width="10" height="6" rx="3" fill="#2563eb" />
      <circle className="scheme-bot-heart" cx="46" cy="75" r="1.4" fill="#a5f3fc" />
      <path d="M44 87H53" stroke="#93c5fd" strokeOpacity="0.65" strokeWidth="1.5" strokeLinecap="round" />

      <g className="scheme-bot-head">
        <g className="scheme-bot-antenna">
          <path d="M48 21V12" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M47.2 19V12" stroke="#bfdbfe" strokeWidth="1.2" strokeLinecap="round" />
          <circle className="scheme-bot-antenna-glow" cx="48" cy="9" r="6" fill="#67e8f9" fillOpacity="0.28" />
          <circle cx="48" cy="9" r="4" fill={paint('light')} />
          <ellipse cx="46.9" cy="7.8" rx="1.3" ry="0.9" fill="white" fillOpacity="0.85" />
        </g>
        <rect x="8" y="34" width="10" height="20" rx="5" fill={paint('edge')} />
        <rect x="9" y="36" width="3" height="12" rx="1.5" fill="#bfdbfe" fillOpacity="0.9" />
        <rect x="77" y="34" width="10" height="20" rx="5" fill={paint('edge')} />
        <rect x="82" y="37" width="2" height="10" rx="1" fill="#93c5fd" fillOpacity="0.5" />
        <rect x="16" y="21" width="65" height="49" rx="19" fill={paint('edge')} />
        <rect x="14.5" y="18.5" width="65" height="49" rx="19" fill={paint('shell')} stroke="#dbeafe" />
        <path d="M21 31C22.6 25.9 27.1 22 34 22H58" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.9" />
        <rect x="21" y="26" width="52" height="34" rx="13" fill="#7ba6dc" />
        <rect x="22" y="26.5" width="50" height="32" rx="12" fill={paint('glass')} stroke="#0f2b52" strokeWidth="0.75" />
        <path d="M35 28H59C63.7 28 67.6 30.9 69 35C56 33 43 35 24 45V39C24 32.9 28.9 28 35 28Z" fill={paint('reflection')} />
        <g className="scheme-bot-gaze">
          <g className="scheme-bot-eyes">
            <rect x="32" y="36" width="7" height="10" rx="3.5" fill="#22d3ee" fillOpacity="0.12" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="3" />
            <rect x="55" y="36" width="7" height="10" rx="3.5" fill="#22d3ee" fillOpacity="0.12" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="3" />
            <rect x="32" y="36" width="7" height="10" rx="3.5" fill={paint('eye')} />
            <rect x="55" y="36" width="7" height="10" rx="3.5" fill={paint('eye')} />
          </g>
          <path className="scheme-bot-smile" d="M42 49C44.8 51.8 49.2 51.8 52 49" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" />
          <ellipse className="scheme-bot-speaking-mouth" cx="47" cy="50" rx="3.5" ry="2.5" fill="#67e8f9" />
        </g>
        <ellipse cx="28.5" cy="47" rx="2.5" ry="1.3" fill="#38bdf8" fillOpacity="0.3" />
        <ellipse cx="65.5" cy="47" rx="2.5" ry="1.3" fill="#38bdf8" fillOpacity="0.3" />
        <path d="M35 63.5H58" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
