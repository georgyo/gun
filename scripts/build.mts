// Build the published JavaScript from the TypeScript sources.
//
// The sources only use erasable TypeScript syntax (`erasableSyntaxOnly`), so
// every type annotation is simply blanked out (ts-blank-space, see trimBlanked).
// The emitted JavaScript therefore keeps the exact same code and line numbers
// as the TypeScript it came from, which keeps it diffable against the
// historical hand written JavaScript.
//
//   gun.js   <- src/*.ts bundled in the classic `USE(function(module){...})` format.
//   src/*.js <- each module of gun.js also on its own ("unbuilt"), as upstream
//               published them (`require('gun/src/book')`, rad.js, test/rad/book.html).
//   sea.js   <- sea/*.ts bundled the same way.
//   *.js     <- every other *.ts (lib/, kit/, the root entry points) emitted next to its source.
//
// Usage:
//   node --experimental-strip-types scripts/build.mts          write the outputs
//   node --experimental-strip-types scripts/build.mts --check  fail if an output is stale
//   node --experimental-strip-types scripts/build.mts gun.js lib/radix.js  only these outputs

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsBlankSpace from 'ts-blank-space';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--')));
const wanted = (out: string): boolean => !only.size || only.has(out);

// The runtime module loader shared by both bundles. Kept byte for byte from the
// historical bundles so that `USE` keeps working for anyone poking at it.
const HEADER = `;(function(){

  /* UNBUILD */
  function USE(arg, req){
    return req? require(arg) : arg.slice? USE[R(arg)] : function(mod, path){
      arg(mod = {exports: {}});
      USE[R(path)] = mod.exports;
    }
    function R(p){
      return p.split('/').slice(-1).toString().replace('.js','');
    }
  }
  if(typeof module !== "undefined"){ var MODULE = module }
  /* UNBUILD */
`;

interface Bundle {
  out: string;
  dir: string;
  // Module execution order. Order matters: modules register themselves on the
  // shared `Gun`/`SEA` objects as a side effect of running.
  modules: string[];
  // Prefix used to indent module bodies (and the `;USE(` lines) in the bundle.
  outer: string;
  inner: string;
  // Optional source appended verbatim after the bundle's closing `}());`.
  footer?: string;
  // Also emit every module as `<dir>/<name>.js`, wrapped in `;(function(){ ... }());`
  // exactly like the historical `lib/unbuild.js` wrote them (the wrapper keeps
  // e.g. book's `sT`/`B` from becoming globals when loaded with a <script> tag).
  unbuilt?: boolean;
}

const BUNDLES: Bundle[] = [
  {
    out: 'gun.js',
    dir: 'src',
    modules: [
      'shim', 'onto', 'book', 'valid', 'state', 'dup', 'ask', 'root', 'back', 'chain',
      'get', 'put', 'core', 'index', 'on', 'map', 'set', 'mesh', 'websocket', 'localStorage',
    ],
    outer: '\t',
    inner: '\t\t',
    footer: 'deprecated',
    unbuilt: true,
  },
  {
    out: 'sea.js',
    dir: 'sea',
    modules: [
      'root', 'https', 'base64', 'array', 'buffer', 'shim', 'settings', 'sha256', 'sha1', 'work',
      'pair', 'sign', 'verify', 'aeskey', 'encrypt', 'decrypt', 'secret', 'certify', 'sea', 'user',
      'then', 'create', 'auth', 'recall', 'share', 'index',
    ],
    outer: '  ',
    inner: '',
    unbuilt: true,
  },
];

// Directories (relative to the repo root) whose *.ts files are emitted 1:1 as *.js.
const STANDALONE_DIRS = ['.', 'lib', 'kit'];

// TypeScript files that exist only for type checking and produce no output.
const TYPE_ONLY = new Set(['src/types.ts', 'sea/types.ts', 'lib/types.ts']);

function strip(file: string): string {
  const source = readFileSync(join(root, file), 'utf8');
  const errors: string[] = [];
  const out = tsBlankSpace(source, (node) => {
    errors.push(`${file}: non-erasable TypeScript syntax: ${node.getText().slice(0, 80)}`);
  });
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  const cut = typeTail(file, source);
  return trimBlanked(source.slice(0, cut), out.slice(0, cut)).replace(/\s*$/, '\n');
}

// Type declarations are kept at the end of a source file (TYPESCRIPT.md,
// "Keep the line numbers"). They would be emitted as a tail of empty statements
// (`;`) and doc comments, so the output stops where that tail starts. A doc
// comment directly in front of the first trailing declaration goes with it;
// other comments are kept.
function typeTail(file: string, source: string): number {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const typeOnly = (node: ts.Statement): boolean =>
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    (ts.isImportDeclaration(node) && !!node.importClause?.isTypeOnly) ||
    (ts.isExportDeclaration(node) && node.isTypeOnly) ||
    (ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) ||
    (ts.isModuleDeclaration(node) && !!(node.flags & ts.NodeFlags.GlobalAugmentation));
  const statements = sf.statements;
  let first = statements.length;
  while (first > 0 && typeOnly(statements[first - 1])) {
    first--;
  }
  if (first === statements.length) {
    return source.length;
  }
  const node = statements[first];
  let cut = node.getStart(sf);
  const comments = ts.getLeadingCommentRanges(source, node.pos) ?? [];
  const doc = comments[comments.length - 1];
  if (doc && source.startsWith('/**', doc.pos) && !source.slice(doc.end, cut).trim()) {
    cut = doc.pos;
  }
  return cut;
}

// ts-blank-space keeps every character in place, replacing types with spaces.
// That keeps line numbers, but the spaces add up (gun.js would grow by ~16%),
// so a run of blanked characters within a line is removed, or reduced to one
// space where two tokens would otherwise merge. Whitespace that the source
// itself has, and every newline, is kept, so every code token keeps its line
// (columns move). The empty lines at the end of a file are dropped.
function trimBlanked(source: string, out: string): string {
  if (source.length !== out.length) {
    throw new Error('ts-blank-space changed the length of the source');
  }
  const word = /[\w$\u0080-\uffff]/;
  const isBlanked = (i: number): boolean => out[i] === ' ' && source[i] !== ' ' && source[i] !== '\t';
  const result: string[] = [];
  for (let i = 0; i < out.length; ) {
    if (!isBlanked(i)) {
      result.push(out[i++]);
      continue;
    }
    let j = i;
    while (j < out.length && (isBlanked(j) || (out[j] === ' ' || out[j] === '\t') && isBlanked(j + 1))) {
      j++;
    }
    // The run i..j-1 is blanked type syntax (plus spaces inside it). Look at the
    // code on both sides to decide whether a separator is still needed.
    const left = result[result.length - 1] ?? '\n';
    const right = out[j] ?? '\n';
    const merge =
      (word.test(left) && word.test(right)) ||
      ('+-'.includes(left) && left === right) ||
      (left === '/' && '/*'.includes(right));
    if (merge) {
      result.push(' ');
    } else if (right === '\n' || right === '\r' || j >= out.length || ')]},;'.includes(right)) {
      // The type ended the line or a bracket: drop the indentation or separator before it too.
      while (result.length && (result[result.length - 1] === ' ' || result[result.length - 1] === '\t')) {
        result.pop();
      }
    }
    i = j;
  }
  return result.join('').replace(/(\r?\n)(?:\r?\n)+$/, '$1');
}

// Inside a bundle `require('./x')` resolves to a sibling module registered with
// `USE`, while `require('crypto', 1)` (second argument) is a real host `require`.
// This is the exact inverse of how the historical `lib/unbuild.js` split bundles.
function toUSE(code: string): string {
  return code.replace(/\brequire\(/g, 'USE(');
}

function indent(code: string, prefix: string): string {
  if (!prefix) {
    return code;
  }
  return code
    .split('\n')
    .map((line) => (line.trim() ? prefix + line : line))
    .join('\n');
}

function trimBlankEdges(code: string): string {
  return code.replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '');
}

function bundle(b: Bundle): string {
  let out = HEADER;
  for (const name of b.modules) {
    const file = `${b.dir}/${name}.ts`;
    const body = trimBlankEdges(toUSE(strip(file)));
    out += `\n${b.outer};USE(function(module){\n${indent(body, b.inner)}\n${b.outer}})(USE, './${name}');\n`;
  }
  out += '\n}());\n';
  if (b.footer) {
    out += '\n' + trimBlankEdges(strip(`${b.dir}/${b.footer}.ts`)) + '\n';
  }
  return out;
}

function unbuilt(b: Bundle): Array<[string, string]> {
  const outputs: Array<[string, string]> = [];
  for (const name of b.modules) {
    const out = `${b.dir}/${name}.js`;
    if (wanted(out)) {
      outputs.push([out, `;(function(){\n${strip(`${b.dir}/${name}.ts`)}\n}());`]);
    }
  }
  return outputs;
}

function standalone(): Array<[string, string]> {
  const outputs: Array<[string, string]> = [];
  for (const dir of STANDALONE_DIRS) {
    for (const name of readdirSync(join(root, dir)).sort()) {
      if (!name.endsWith('.ts') || name.endsWith('.d.ts')) {
        continue;
      }
      const file = dir === '.' ? name : `${dir}/${name}`;
      if (TYPE_ONLY.has(file)) {
        continue;
      }
      const out = file.replace(/\.ts$/, '.js');
      if (wanted(out)) {
        outputs.push([out, strip(file)]);
      }
    }
  }
  return outputs;
}

function main(): void {
  const outputs: Array<[string, string]> = [];
  for (const b of BUNDLES) {
    if (wanted(b.out)) {
      outputs.push([b.out, bundle(b)]);
    }
    if (b.unbuilt) {
      outputs.push(...unbuilt(b));
    }
  }
  outputs.push(...standalone());

  const stale: string[] = [];
  for (const [file, code] of outputs) {
    const path = join(root, file);
    const current = existsSync(path) ? readFileSync(path, 'utf8') : undefined;
    if (current === code) {
      continue;
    }
    if (check) {
      stale.push(file);
    } else {
      writeFileSync(path, code);
      console.log('build:', relative(root, path));
    }
  }
  if (stale.length) {
    console.error('Stale build output, run `npm run build`:\n  ' + stale.join('\n  '));
    process.exit(1);
  }
}

main();
