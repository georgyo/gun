// Enforces the typing policy of the TypeScript sources:
//
//   * `any` is only allowed where it is genuinely required, and every use must
//     carry a justification comment containing `any:` on the same line or on
//     the line directly above, e.g.
//         // any: user supplied plugin, shape is unknowable.
//   * `@ts-ignore`, `@ts-nocheck` and `@ts-expect-error` are never allowed.
//
// Usage: node --experimental-strip-types scripts/check-types.mts [--list]

import { readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const list = process.argv.includes('--list');

const config = ts.getParsedCommandLineOfConfigFile(join(root, 'tsconfig.json'), {}, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: (d) => {
    throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  },
});
if (!config) {
  throw new Error('could not read tsconfig.json');
}

const problems: string[] = [];
const justified: string[] = [];
let doubleCasts = 0;

for (const file of config.fileNames) {
  const rel = relative(root, file);
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');

  lines.forEach((line, i) => {
    if (/(\/\/|\/\*)\s*@ts-(ignore|nocheck|expect-error)/.test(line)) {
      problems.push(`${rel}:${i + 1}: suppression comments are not allowed`);
    }
  });

  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node: ts.Node): void => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
      const here = lines[line] ?? '';
      const above = lines[line - 1] ?? '';
      const where = `${rel}:${line + 1}: ${here.trim()}`;
      if (/\bany:/.test(here) || /\bany:/.test(above)) {
        justified.push(where);
      } else {
        problems.push(`${where}\n    ^ unjustified \`any\` (add a comment containing "any: <reason>")`);
      }
    }
    if (
      ts.isAsExpression(node) &&
      ts.isAsExpression(node.expression) &&
      node.expression.type.kind === ts.SyntaxKind.UnknownKeyword
    ) {
      doubleCasts++;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

if (list) {
  console.log(justified.join('\n'));
}
console.log(
  `check-types: ${config.fileNames.length} files, ${justified.length} justified \`any\`, ` +
    `${doubleCasts} \`as unknown as\` casts, ${problems.length} problems`,
);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
