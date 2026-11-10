import type { Scheme } from './types';
import catalogue from '../data/schemes/catalogue.json';
import trades from '../data/schemes/trades.json';

// One bundled source for the UI, deterministic screening, and every AI tool.
// Static imports also include the knowledge files in Next.js standalone builds.
export const SCHEMES_DATABASE: Scheme[] = catalogue as Scheme[];
export const VISHWAKARMA_TRADES: readonly string[] = trades;
