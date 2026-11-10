import { rmSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const generatedFiles = ['.next', 'out', 'coverage', 'tsconfig.tsbuildinfo'];

for (const file of generatedFiles) {
  const target = resolve(projectRoot, file);
  const relativePath = relative(projectRoot, target);
  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Cleanup target must stay inside the project: ${target}`);
  }
  rmSync(target, { recursive: true, force: true });
}

console.info('Removed generated build, coverage, and TypeScript cache files.');
