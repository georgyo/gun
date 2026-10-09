# GUN in TypeScript

GUN's source code is written in TypeScript. The JavaScript that is published
(`gun.js`, `sea.js`, `lib/*.js`, `axe.js`, ...) is generated from it and is
committed so that CDN links, `<script>` tags and git installs keep working
exactly as before.

## How it works

* Every source file only uses **erasable** TypeScript syntax
  (`erasableSyntaxOnly`): type annotations, `interface`, `type`,
  `import type` / `export type`, `as` / `satisfies`, `!`, `this:` parameters,
  overload signatures and `declare`. No `enum`, value `namespace`, parameter
  properties, `import x = require()` or `export =`.
* `scripts/build.mts` blanks those types out with
  [ts-blank-space](https://github.com/bloomberg/ts-blank-space), which
  replaces them with spaces, and then removes those spaces again within each
  line (keeping one where two tokens would otherwise merge). The emitted
  JavaScript is the source code without its types: same code, same lines
  (columns move where a type was removed). Stack traces from the published
  files point at the right line of the TypeScript source. The type
  declarations at the end of a file (convention 5) are not emitted at all.
* `src/*.ts` are bundled into `gun.js` and `sea/*.ts` into `sea.js`, in the same
  `;USE(function(module){ ... })(USE, './name')` format as before.
  `src/deprecated.ts` is appended to `gun.js` as before.
* Each module of the two bundles is also emitted on its own ("unbuilt") as
  `src/NAME.js` / `sea/NAME.js`, wrapped in `;(function(){ ... }());` the way
  the old `lib/unbuild.js` wrote them (`require('gun/src/book')`, `rad.js`,
  `test/rad/book.html` load them).
* Everything else (`lib/*.ts`, `kit/*.ts`, the root `*.ts` entry points) is
  emitted 1:1 next to its source (`lib/radix.ts` -> `lib/radix.js`).
* `src/types.ts` (the core's internal types), `sea/types.ts` (SEA's) and
  `lib/types.ts` (the types the `lib/` modules share) produce no output.

```sh
npm run build          # regenerate the JavaScript (and gun.min.js); needs Node.js 22+
npm run build:check    # fail if the committed JavaScript is stale (CI runs it)
npm run typecheck      # tsc on the sources + the public .d.ts + typing policy (CI runs it)
npm run diff-upstream  # runtime diff of the built JavaScript vs. the last JS release
npm test               # also: npx mocha test/sea/sea.js, npx mocha test/rad/rad.js
```

`npm run typecheck` runs three checks:

1. `tsc -p tsconfig.json`: the TypeScript sources, strict. `lib/modules.d.ts`
   (ambient declarations of untyped packages imported with an ES `import`, only
   `text-encoding` for `lib/mobile.ts`) is pulled in through `"files"`; it is
   internal and not published.
2. `tsc -p tsconfig.types.json`: the hand written public typings. It resolves
   `X.d.ts` before `X.ts` (`moduleSuffixes`), so `import {} from './radix'` in
   `lib/radix.d.ts` still means the definition itself and not the source next
   to it.
3. `scripts/check-types.mts`, the typing policy (see 3. below).

## Conventions for the sources

1. **Runtime wiring is unchanged.** Modules still talk to each other with
   `require('./x')`, `module.exports = X`, `window.X` and the
   `typeof window !== "undefined"` checks they always used, because the
   output must keep working both as a Node module and as a plain browser
   `<script>`. Never use a value `import` / `export`; use `import type` to
   share types (`export type` only in the `types.ts` modules). Inside `src/` and `sea/` (the bundles) a host
   module is required with a second argument, `require('crypto', 1)`, exactly
   like the historical bundles did. The type of a `require()` goes on the
   binding: `var Gun: GunStatic = (typeof window !== "undefined")? window.Gun : require('../gun');`.
2. **Types live with the code, but a runtime source exports nothing.**
   Internal types shared by the core live in `src/types.ts`, SEA's in
   `sea/types.ts`, and the types one `lib/` module provides to others in
   `lib/types.ts` (one section per module). A runtime source (every `.ts` but
   these three) has no `export` statement at all: in a source checkout (git
   clone, `npm link`, `file:`/workspace dependency) Bun and esbuild resolve an
   extensionless `require('./radix')` to `lib/radix.ts`, and they load a `.ts`
   file that has an `export` as an ES module, where `module.exports` does not
   exist. `import type`, `declare module`, `declare global` and local
   `interface` / `type` declarations keep the file CommonJS for them.
   `scripts/check-types.mts` enforces this. Types only used inside a module
   stay local to it. A module that adds options, events or chain methods
   extends the core interfaces with module augmentation
   (`declare module '../src/types' { interface GunOptions { ... } }`) in its
   own file (and `declare module './types'` for an interface of
   `lib/types.ts`). Shared shapes are imported, not redeclared (e.g. every
   storage adapter uses `RadiskStore` for `opt.store`; a module that uses the
   deprecated utilities of `src/deprecated.ts` types `Gun` as
   `GunStatic & Pick<GunDeprecated, 'obj' | 'text'>`). An untyped third party
   package (aws-sdk, emailjs, chokidar, uws, Tone.js, jQuery...) gets a
   minimal local interface of the parts that are used.
3. **`any` only where it is genuinely required.** Prefer precise interfaces,
   generics, `unknown` plus narrowing, and index signatures for truly dynamic
   records. Every remaining `any` carries a comment containing `any:` and the
   reason, on the same line or the line above. `@ts-ignore`,
   `@ts-expect-error` and `@ts-nocheck` are not allowed. A `var` declared
   without a type and without an initializer must not be read as `any` and
   must be read at all (annotate it, `: undefined` when it is unused).
   `as unknown as` (and any other chained cast, `x as A as B`) is avoided (it
   is counted). A built-in is not redeclared with wider parameters
   (`declare function parseFloat(s: unknown)`): the coercion is cast at the
   call (`parseFloat(x as string) // parseFloat stringifies`). A global that
   upstream reads but never defines (a `ReferenceError` at run time) is
   declared at the end of the file with a doc comment that says so.
   `scripts/check-types.mts` enforces the checkable parts.
4. **Keep the code as it was.** A conversion only adds types. Code is not
   reformatted, renamed or reordered and comments are kept. A change to runtime
   code is only made when it is needed to express the types with identical
   behaviour, or when it is a deliberate fix or performance improvement. Every
   observable change is listed below. `npm run diff-upstream` shows all of them.
5. **Keep the line numbers.** Do not add lines inside the code, so that the
   output stays line for line comparable with the last JavaScript release.
   `import type` lines and other type-only declarations go at the end of the
   file (TypeScript hoists them), or on a line that was already blank;
   overload signatures go on the line of the implementation; explanations go
   in trailing comments. The build stops each output where that trailing block
   of type declarations starts, so it emits neither them nor their doc comments.
6. **Mind ASI.** A cast on the left of an expression needs parentheses,
   `(Store as RfsStatic)[opt.file] = store`, which stay in the output. When the
   previous statement has no semicolon (it ends with a function expression `}`)
   such a line would continue it: put a `;` in front. A statement-final
   `as T` or `satisfies T` is emitted as a `;`, which is harmless.

The hand written public type definitions (`index.d.ts`, `gun.d.ts`,
`sea.d.ts`, `types/**`, `lib/*.d.ts`) are unchanged and still describe the
public API; `tsconfig.types.json` checks them.

## Not converted

* `lib/text-encoding/` is a vendored third party polyfill.
* `lib/untitled.js` is a scratch file that does not parse (`if()`), so it
  cannot be typed without changing it. It is kept as is.
* `test/` stays JavaScript on purpose: the suite is the upstream test suite,
  unchanged, run against the generated JavaScript. It is the compatibility
  oracle for the conversion.
* `examples/` are stand alone demo apps for many frameworks that load the
  published files.

## Breaking changes

Every observable difference from the last JavaScript release (upstream
`054ca85`) is listed here. There are none in the code of `gun.js`, `sea.js`,
`lib/*.js` or the root entry points: their behaviour is identical.

### Packaging and build

* `lib/unbuild.js` and the `unbuild`, `unbuildSea` and `unbuildMeta` npm
  scripts are removed: `scripts/build.mts` (`npm run build`) replaces them and
  `prepublishOnly` runs it. `src/polyfill/unbuild.js` (the stand-alone `USE`
  shim lib/unbuild.js wrote) is still published, unchanged.
* `gun.min.js` is now `gun.js` minified (`npm run build` runs
  `npm run minify`). Upstream's copy was stale: it was last built for release
  1238 (`07b30ed`, 2022-08-09), so CDN / `<script>` users of `gun.min.js` now
  get the `gun.js` changes upstream made after it (271 lines added, 17
  removed): `451c33a` (fewer not-found acks), `89b24d3` (subscribe only on
  backpropagation), `f257474` (gun / axe mismatch on uninitialised data),
  `6d7e980` (book), `2d39931` (`.off()` fix), `47c0709` (axe does not skip
  messages with other props), `c440a7c` (src/index), `78a40da` / `203bd40`
  (RAD and Book in the core), `638c2c3` (the `localStorage` module wrapped,
  early return), `7a2767a` (webrtc accepts `getUserMedia` streams) and
  `0c423c9` (a redundant `return` removed).
* `tsconfig.json` is no longer published: it now type checks the sources,
  which are not published either (upstream's compiled the `.d.ts`, which
  `tsconfig.types.json` does in the repository; it is not published).
* The unminified files are slightly bigger, from the parentheses that casts
  leave and from comments added on code lines (raw / gzip -9, against
  `054ca85`): `gun.js` 111793 -> 112407 bytes (+0.5% / +0.8%), `sea.js`
  66668 -> 66772 (+0.2% / +0.3%), `lib/radisk.js` 20574 -> 20663
  (+0.4% / +0.8%), `lib/webrtc.js` 5543 -> 5612 (+1.2% / +1.9%),
  `lib/time.js` 3983 -> 4115 (+3.3% / +6%), `lib/wave.js` 50222 -> 52127
  (+3.8% / +5.1%). `gun.min.js` is the same size as upstream's `gun.js`
  minified (45275 bytes then, 45290 now).
* Linked or source installs (`npm link`, `file:` / workspace dependencies,
  git submodules) contain the `.ts` sources next to the `.js` and `.d.ts`.
  TypeScript resolves `gun/lib/radix` (and `import {} from './radix'` inside
  `lib/radix.d.ts`) to `lib/radix.ts` before `lib/radix.d.ts`, so it type
  checks the internal sources with the consumer's tsconfig instead of using
  the public typings. Set `"moduleSuffixes": [".d", ""]` in the consumer's
  tsconfig (as `tsconfig.types.json` does) to resolve the `.d.ts` first. The
  npm package ships no `.ts`, so installs from npm are not affected. Bun and
  esbuild run such source checkouts as before (see convention 2).
* Building (not using) GUN needs Node.js 22+ and the new dev dependencies
  `typescript`, `ts-blank-space` and `@types/node`. The published JavaScript
  runs where it ran before. CI tests on Node.js 22.x instead of 14.x.
* `src/*.js` and `sea/*.js` are now generated from the sources, so they are
  the same code as the modules inside `gun.js` and `sea.js`. Upstream's copies
  were stale, so code that requires them directly sees these fixes:
  * `src/mesh.js`: DAM tracks the peer a message came from
    (`(dup_track(id)||{}).via = peer`), as `gun.js` does.
  * `src/websocket.js`: the previous wire is kept in `wired`, as in `gun.js`,
    so a peer without a URL is handed to the previous `mesh.wire` /
    `opt.wire`. In the stale copy a local `var wire` shadowed it and such a
    peer was dropped.
  * `src/get.js`: a duplicated `return` is gone, as in `gun.js` (no effect).
  * `sea/index.js`: a certificate whose list of certificants contains the
    user is accepted (`indexOf('*') > -1 || indexOf(certificant) > -1`), as in
    `sea.js`; the stale copy's `indexOf('*' || certificant)` only looked for `'*'`.
* The npm package no longer contains the build scripts (`*.mts`); `*.ts`
  sources stay excluded and the public `*.d.ts` stay included.

### gun.js

* None.

### sea.js

* None.

### lib/*

* None. (`lib/radix2.js`, `lib/match.js`, `lib/list.js`, `lib/mix.js`,
  `lib/wsp.js`, `lib/les.js`, `lib/file.js` and the other modules that relied
  on removed APIs or on the browser only deprecated utilities still fail the
  way they did; their types document it.)

### Non-observable changes

These show up in `npm run diff-upstream` but do not change behaviour:

* Formatting: types are removed, which changes the spacing inside a line;
  casts add parentheses (`((pair||opt) as SeaKeys).epriv` emits
  `((pair||opt)).epriv`); a statement-final `as T` / `satisfies T` emits a
  `;`; a few `;` were put in front of lines that start with a parenthesised
  cast (`lib/radisk.js`, `lib/radisk2.js`); comments were added on some code
  lines.
* Wrappers: the `localStorage` module of `gun.js` is wrapped in
  `;(function(){ ... }());` so that its top level `return` type checks, which
  makes `src/localStorage.js` wrapped twice.
* The bundles trim blank lines at the edges of each module, so line numbers
  inside `gun.js` and `sea.js` can differ from the last release by a line or
  two. The other files keep their line numbers (`lib/wsp.js` keeps its mixed
  line endings, `lib/http.js`, `lib/jsonp.js`, `lib/aws.js` and `browser.js`
  their CRLF).
* Expressions TypeScript rejects, rewritten with the same result:
  `lib/store.js` `!has & 'string' == typeof soul` is `!has && ...` (both
  operands are booleans in an `&&` chain); `lib/ison.js` comments out the dead
  `case 'null':` of a `switch (typeof value)` (typeof never returns `'null'`).
