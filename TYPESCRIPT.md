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
  [ts-blank-space](https://github.com/bloomberg/ts-blank-space). The emitted
  JavaScript is the source code with the types replaced by spaces: same code,
  same lines, same columns. Stack traces from the published files point at
  the right line of the TypeScript source.
* `src/*.ts` are bundled into `gun.js` and `sea/*.ts` into `sea.js`, in the same
  `;USE(function(module){ ... })(USE, './name')` format as before.
  `src/deprecated.ts` is appended to `gun.js` as before.
* Everything else (`lib/*.ts`, `kit/*.ts`, the root `*.ts` entry points) is
  emitted 1:1 next to its source (`lib/radix.ts` -> `lib/radix.js`).

```sh
npm run build          # regenerate the JavaScript (and gun.min.js)
npm run build:check    # fail if the committed JavaScript is stale
npm run typecheck      # tsc on the sources + the public .d.ts + typing policy
npm run diff-upstream  # runtime diff of the built JavaScript vs. the last JS release
npm test
```

## Conventions for the sources

1. **Runtime wiring is unchanged.** Modules still talk to each other with
   `require('./x')`, `module.exports = X`, `window.X` and the
   `typeof window !== "undefined"` checks they always used, because the
   output must keep working both as a Node module and as a plain browser
   `<script>`. Never use a value `import` / `export`; use `import type` /
   `export type` to share types. Inside `src/` and `sea/` (the bundles) a host
   module is required with a second argument, `require('crypto', 1)`, exactly
   like the historical bundles did.
2. **Types live with the code.** Internal types shared by the core live in
   `src/types.ts`, SEA's in `sea/types.ts`; a `lib/` module exports the types
   of what it provides with `export type`. These `types.ts` files produce no
   output.
3. **`any` only where it is genuinely required.** Prefer precise interfaces,
   generics, `unknown` plus narrowing, and index signatures for truly dynamic
   records. Every remaining `any` carries a comment containing `any:` and the
   reason, on the same line or the line above. `@ts-ignore`,
   `@ts-expect-error` and `@ts-nocheck` are not allowed.
   `scripts/check-types.mts` enforces this.
4. **Keep the code as it was.** A conversion only adds types. Code is not
   reformatted, renamed or reordered and comments are kept. A change to runtime
   code is only made when it is needed to express the types with identical
   behaviour, or when it is a deliberate fix or performance improvement. Every
   observable change is listed below. `npm run diff-upstream` shows all of them.

The hand written public type definitions (`index.d.ts`, `gun.d.ts`,
`sea.d.ts`, `types/**`, `lib/*.d.ts`) are unchanged and still describe the
public API; `tsconfig.types.json` checks them.

## Not converted

* `lib/text-encoding/` is a vendored third party polyfill.
* `test/` stays JavaScript on purpose: the suite is the upstream test suite,
  unchanged, run against the generated JavaScript. It is the compatibility
  oracle for the conversion.
* `examples/` are stand alone demo apps for many frameworks that load the
  published files.

## Breaking changes

<!-- Every observable difference from the last JavaScript release is listed here. -->
