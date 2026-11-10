'use client';

import type { CSSProperties } from 'react';

/** Keep the full sentence accessible; animate words without breaking Indic glyphs. */
export default function RevealText({ text }: { text: string }) {
  return <span className="reveal-text" key={text}>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true">{text.split(' ').map((word, index) => (
      <span className="word-mask" key={`${index}-${word}`}>
        <span className="word-rise" style={{ '--word-index': index } as CSSProperties}>{word}</span>{' '}
      </span>
    ))}</span>
  </span>;
}
