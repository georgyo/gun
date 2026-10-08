// Ambient declarations of the untyped third party packages that lib/*.ts
// load with an ES `import` (a `require()` result is typed at its binding
// instead). Internal: listed in the "files" of tsconfig.json (a
// `/// <reference>` would add a line to the emitted JavaScript), not part of
// the public typings and not published.

/** The `text-encoding` polyfill (not a dependency of GUN), as lib/mobile.js uses it. */
declare module "text-encoding" {
  export const TextEncoder: typeof globalThis.TextEncoder;
  export const TextDecoder: typeof globalThis.TextDecoder;
}
