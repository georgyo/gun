// Enforces the typing policy of the TypeScript sources:
//
//   * `any` is only allowed where it is genuinely required, and every use must
//     carry a justification comment containing `any:` on the same line or on
//     the line directly above, e.g.
//         // any: user supplied plugin, shape is unknowable.
//   * `@ts-ignore`, `@ts-nocheck` and `@ts-expect-error` are never allowed.
//   * A `var` declared without a type and without an initializer (`var tmp;`)
//     is an "evolving any": TypeScript types each read by control flow. That is
//     fine as long as no read of it is actually `any` and it is read at all;
//     otherwise it must be annotated (`var lot: undefined` when unused).
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

const program = ts.createProgram(config.fileNames, config.options);
const checker = program.getTypeChecker();

// Uninitialised, unannotated variables whose reads are `any`, or that are never read.
function evolvingAny(sf: ts.SourceFile, rel: string): void {
  const reads = new Map<ts.Symbol, ts.Identifier[]>();
  const decls: ts.VariableDeclaration[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) {
      const loop = node.parent.parent;
      if (
        !node.type && !node.initializer && ts.isIdentifier(node.name) &&
        !ts.isCatchClause(node.parent) && !ts.isForInStatement(loop) && !ts.isForOfStatement(loop)
      ) {
        decls.push(node);
      }
    } else if (ts.isIdentifier(node)) {
      const p = node.parent;
      const write =
        (ts.isVariableDeclaration(p) && p.name === node) ||
        (ts.isBinaryExpression(p) && p.left === node && p.operatorToken.kind === ts.SyntaxKind.EqualsToken);
      const symbol = !write && checker.getSymbolAtLocation(node);
      if (symbol) {
        (reads.get(symbol) ?? reads.set(symbol, []).get(symbol)!).push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  for (const d of decls) {
    const symbol = checker.getSymbolAtLocation(d.name);
    const ids = (symbol && reads.get(symbol)) || [];
    const anyRead = ids.find((id) => (checker.getTypeAtLocation(id).flags & ts.TypeFlags.Any) !== 0);
    if (!ids.length || anyRead) {
      const line = sf.getLineAndCharacterOfPosition((anyRead ?? d).getStart(sf)).line;
      problems.push(
        `${rel}:${line + 1}: \`${d.name.getText(sf)}\` has no type and no initializer and is ` +
          (anyRead ? 'read as `any`' : 'never read') + ' (annotate it, `: undefined` when unused)',
      );
    }
  }
}

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
  const checked = program.getSourceFile(file);
  if (checked) {
    evolvingAny(checked, rel);
  }
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
