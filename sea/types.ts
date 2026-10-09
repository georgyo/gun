// The internal type model of SEA (Security, Encryption, Authorization).
//
// This file only declares types: it is never emitted (see TYPE_ONLY in
// scripts/build.mts). The modules of sea.js (sea/*.ts) share these types with
//
//     import type { SeaStatic, SeaShim } from './types';
//
// It describes what the code actually passes around, quirks included. The
// public API is described by sea.d.ts and types/sea/*.d.ts, which are kept
// as they are; the internal types below are compatible with them (a value of
// the public types can be passed where these types are expected).
//
// SEA also extends the core: it adds fields to the core's interfaces (the root
// keeps SEA's state, chains get `.user()` and `.then()`, the user's chain
// meta keeps the key pair, ...) with module augmentation at the end of this file.

import type {
  AckId,
  Chain,
  ChainData,
  ChainMeta,
  ChainMsg,
  Dict,
  GetListener,
  GunStatic,
  GunValue,
  HamState,
  Lex,
  LexMatch,
  Msg,
  MsgBase,
  MsgMeta,
  NodeLike,
  OnCb,
  OntoListener,
  PutAtom,
  PutCb,
  RootMeta,
  Soul,
} from '../src/types';

// ---------------------------------------------------------------------------
// Host
// ---------------------------------------------------------------------------

/** The global SEA runs in: `window` in a page, `self` in a worker (root.js). */
export type SeaWindow = Window & typeof globalThis;

/** What `require('crypto', 1)` gives (node): only what SEA uses. */
export interface NodeCrypto {
  randomBytes(size: number): Uint8Array;
  getRandomValues: Crypto['getRandomValues'];
}

/** `require('@peculiar/webcrypto', 1)`: a WebCrypto implementation for node. */
export interface PeculiarWebCrypto {
  Crypto: new (opt: { directory: string }) => { subtle: SubtleCrypto };
}

/** `require('./lib/text-encoding', 1)`: the TextEncoder / TextDecoder polyfill. */
export interface TextEncodingModule {
  TextEncoder: typeof TextEncoder;
  TextDecoder: typeof TextDecoder;
}

/** `require('buffer', 1)`: node's (or the npm polyfill's) Buffer. */
export interface BufferModule {
  Buffer: typeof Buffer;
}

// ---------------------------------------------------------------------------
// Bytes (array.js, buffer.js)
// ---------------------------------------------------------------------------

/** The encodings `SeaArray#toString` understands. */
export type SeaEncoding = 'utf8' | 'hex' | 'base64';

/**
 * `SeaArray.prototype.toString(enc, start, end)`. `'utf8'` (the default) makes
 * one character per element, `'hex'` two hex digits per byte (`end` is then
 * inclusive), `'base64'` is `btoa` of the `'utf8'` string. (Upstream quirk,
 * not modelled: any other encoding, e.g. a user's `opt.encode`, gives
 * `undefined`.)
 */
export type SeaArrayToString = (this: ArrayLike<number>, enc?: SeaEncoding | string, start?: number, end?: number) => string;

/**
 * A value passed where a string is expected, that the callee converts with its
 * `toString()` (array.js: `btoa(this)`), or a string read with the keys of `T`
 * (which are then `undefined`).
 */
export type Stringified<T> = T & string;

/**
 * An instance of `SeaArray` (array.js): an array like object (not a real array,
 * `Array.isArray` is `false`) that inherits from `Array.prototype`, holding
 * bytes (or UTF-16 code units, `SafeBuffer.from(text)`).
 */
export interface SeaBytes extends Array<number> {
  toString: SeaArrayToString;
}

/** `SeaArray` (array.js): `Array.from` makes `SeaArray` instances because `this` is the constructor. */
export interface SeaArrayStatic {
  (): void;
  new (): SeaBytes;
  prototype: SeaBytes;
  from(items: ArrayLike<number> | Iterable<number>): SeaBytes;
  /** The characters of a string (buffer.js' unreachable `'binary'` branch). */
  from(text: string): SeaBytes;
}

/**
 * `SafeBuffer.from(input, enc)`. Strings are read with `enc` (`'utf8'` and
 * `'binary'`: one element per UTF-16 code unit; `'hex'`; `'base64'`). Anything
 * else (an `ArrayBuffer`, a typed array, an array of bytes) is copied, the
 * encoding is ignored. Upstream quirks, not modelled: an unknown encoding is
 * logged and gives `undefined`, and so does an empty non string input.
 */
export type SafeBufferFrom = (input: string | ArrayBuffer | ArrayLike<number>, enc?: string) => SeaBytes;

/** What `SafeBuffer.from` reads of a non string input (an `ArrayBuffer`, a typed array, an array of bytes). */
export interface SafeBufferBytes {
  byteLength?: number;
  length?: number;
  [i: number]: number;
}

/** `SafeBuffer` (buffer.js): the subset of node's `Buffer` SEA needs, made of `SeaArray` instances. */
export interface SafeBufferStatic {
  /** Deprecated: warns, then `SafeBuffer.from(...)`. */
  (...props: Parameters<SafeBufferFrom>): SeaBytes;
  prototype: SafeBufferProto;
  from: SafeBufferFrom;
  /** `length` bytes of `fill` (default 0). */
  alloc(length: number, fill?: number): SeaBytes;
  /** `length` bytes (zeros: it is not actually unsafe). */
  allocUnsafe(length: number): SeaBytes;
  /** The bytes of every item, one after the other. Throws if `arr` is not an array. */
  concat(arr: ArrayLike<number>[]): SeaBytes;
}

/** `SafeBuffer.prototype` (an `Array.prototype` child with `from` and SeaArray's `toString`). */
export interface SafeBufferProto extends Array<number> {
  from: SafeBufferFrom;
  toString: SeaArrayToString;
}

// ---------------------------------------------------------------------------
// shim.js
// ---------------------------------------------------------------------------

export type JsonReviver = (this: unknown, key: string, value: unknown) => unknown;
export type JsonReplacer = (this: unknown, key: string, value: unknown) => unknown;

/**
 * The platform glue (shim.js). WebCrypto, `TextEncoder` and `TextDecoder`
 * come from the window, or from node (`crypto` and `@peculiar/webcrypto`) and
 * the text-encoding polyfill. SEA does not work without them: the fields are
 * typed as present, a missing one makes the SEA call that uses it fail (and
 * be reported like any other error, see `SeaStatic.err`).
 */
export interface SeaShim {
  Buffer: SafeBufferStatic;
  /**
   * `JSON.parseAsync` as a promise. The result is not checked: `T` is what the
   * caller expects the text to hold.
   */
  parse<T = unknown>(t: string, r?: JsonReviver): Promise<T>;
  /** `JSON.stringifyAsync` as a promise (`undefined` for `undefined`, like `JSON.stringify`). */
  stringify(v: unknown, r?: JsonReplacer, s?: string | number): Promise<string | undefined>;
  /** `window.crypto` (`msCrypto` on IE 11), or node's `crypto`. */
  crypto: Crypto | NodeCrypto;
  subtle: SubtleCrypto;
  /** Node: `@peculiar/webcrypto`'s subtle (it is also `subtle`). Used first for ECDH, PBKDF2 and ECDSA. */
  ossl?: SubtleCrypto;
  TextEncoder: typeof TextEncoder;
  TextDecoder: typeof TextDecoder;
  /** `len` cryptographically random bytes. */
  random(len: number): SeaBytes;
}

// ---------------------------------------------------------------------------
// Keys and envelopes
// ---------------------------------------------------------------------------

/**
 * A key pair, as `SEA.pair()` makes it: ECDSA keys to sign (`pub`, `priv`)
 * and ECDH keys to encrypt (`epub`, `epriv`), base64url, `x.y` for public
 * keys. (On a platform without ECDH, pair.js logs "Ignoring ECDH..." and
 * `epub` / `epriv` are `undefined`.)
 */
export interface SeaPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
}

/** Keys as they are passed around: any part of a pair (`{pub}`, `{epub}`, `{priv, epriv}`, ...). */
export type SeaKeys = Partial<SeaPair>;

/**
 * A key argument of `sign`, `verify`, `encrypt`, `decrypt`, `secret`: (part
 * of) a pair, or a key (or passphrase) string. The code reads it as
 * `pair.pub || pair`.
 */
export type SeaKeyArg = SeaKeys | string;

/** A signed message (`'SEA' + JSON` of it, unless `raw`): the data (`m`) and its ECDSA signature (`s`). */
export interface SeaSigned<M = unknown> {
  m: M;
  s: string;
}

/** An encrypted message (`'SEA' + JSON` of it, unless `raw`): AES-GCM cipher text, IV and salt. */
export interface SeaEncrypted {
  ct: string;
  iv: string;
  s: string;
}

/** The value SEA writes for a key of a user's graph: the data (`:`) and its signature (`~`). Certified writes add `+` and `*`. */
export interface SeaPutValue {
  ':'?: unknown;
  '~'?: string;
  /** The certificate that allows the write: the parsed `SeaSigned` certificate (its `m` is the parsed `SeaCertData`). */
  '+'?: SeaSigned<SeaCertData>;
  /** The pub of the writer. */
  '*'?: string;
}

/**
 * What `SEA.opt.unpack` reads in verified data: a packed key (`{'#', '.', ':',
 * '>'}`), or the legacy `[soul, key, value, state]` array. Strings and other
 * values are read the same way (their fields are `undefined`).
 */
export interface SeaPacked {
  ':'?: unknown;
  length?: number;
  [i: number]: unknown;
}

// ---------------------------------------------------------------------------
// Certificates (certify.js, index.js)
// ---------------------------------------------------------------------------

/** A rule of a certificate's policy: a key (or path) string, or a LEX on the path (`#`) and the key (`.`). */
export interface SeaPolicyLex extends LexMatch {
  '#'?: string | LexMatch;
  '.'?: string | LexMatch;
  /** `'*'`: the path or the key must contain the certificant's pub. */
  '+'?: string;
}

export type SeaPolicyRule = string | SeaPolicyLex;

/** `SEA.certify`'s policy: rules (the write policy), or an object with the read and write policies (or itself a LEX rule). */
export type SeaPolicy = SeaPolicyRule | SeaPolicyRule[] | SeaPolicyObject;

/** A policy object: `{read, write}`, or a LEX rule. */
export interface SeaPolicyObject extends SeaPolicyLex {
  read?: SeaPolicyRule | SeaPolicyRule[];
  write?: SeaPolicyRule | SeaPolicyRule[];
}

/** Who a certificate is for: everyone (`'*'`), pubs, or users (anything with a `pub`). */
export type SeaCertificants = string | { pub?: string } | Array<string | { pub?: string }>;

/** A block list: the soul (or `{'#': soul}`) of a node listing blocked pubs. */
export type SeaBlock = string | { '#'?: string };

/** The block lists of a certificate, for reading and for writing. */
export interface SeaBlockObject {
  '#'?: string;
  read?: SeaBlock;
  write?: SeaBlock;
}

/**
 * The block option of `certify`: the write block list (a soul, or `{'#'}`), or
 * `{read, write}`. A string is described with the object's keys too: certify.js
 * reads them on whatever it got (they are `undefined` on a string).
 */
export type SeaBlockOpt = SeaBlockObject | (string & SeaBlockObject);

export interface SeaCertifyOpt {
  /** When the certificate expires (ms, a number or a numeric string). */
  expiry?: number | string;
  block?: SeaBlockOpt;
  blacklist?: SeaBlockOpt;
  ban?: SeaBlockOpt;
  /** Give the signed object, not its `'SEA' + JSON`. */
  raw?: unknown;
}

/** The signed content of a certificate. Reserved keys: c, e, r, w, rb, wb. */
export interface SeaCertData {
  /** The certificants: `'*'`, a pub, or pubs. */
  c?: string | string[];
  /** Expiry (a number when `certify` made it; read with `parseFloat`). */
  e?: number | string;
  /** Read policy. */
  r?: SeaPolicyRule | SeaPolicyRule[];
  /** Write policy. */
  w?: SeaPolicyRule | SeaPolicyRule[];
  /** Read block list. */
  rb?: SeaBlock;
  /** Write block list. */
  wb?: SeaBlock;
}

// ---------------------------------------------------------------------------
// The SEA functions
// ---------------------------------------------------------------------------

/** A SEA callback: called with the result, or with nothing when the call failed. */
export type SeaCb<T> = (r?: T) => void;

/** `SEA.I`: an app supplied hook asked for keys when a SEA call gets none. */
export type SeaI = (x: null, ask: { what: unknown; how: 'sign' | 'encrypt' | 'decrypt' | 'secret'; why?: unknown }) => Promise<SeaPair>;

export interface SeaWorkOpt {
  /** `'PBKDF2'` (default) or `'SHA-256'` (any `sha...`: a plain hash). */
  name?: string;
  encode?: string;
  /** Overrides the salt. */
  salt?: unknown;
  hash?: AlgorithmIdentifier;
  /** Bits (default 512). */
  length?: number;
  iterations?: number;
}

/** The salt argument of `work`: a pair (its `epub` is used) or a salt; a function in its place is the callback. */
export type SeaSalt = SeaKeys | string | SeaBytes | SeaCb<string>;

/** `SEA.work(data, salt, cb, opt)`: proof of work (PBKDF2) or a hash. */
export type SeaWork = (data: unknown, pair?: SeaSalt | null, cb?: SeaCb<string> | null, opt?: SeaWorkOpt | null) => Promise<string | undefined>;

/** `SEA.name(cb, opt)`: a hook for apps (auth.js asks it for a user name when there is no alias and no pair). */
export type SeaName = (cb?: SeaCb<string> | null, opt?: unknown) => Promise<void>;

/** `SEA.pair(cb)`. */
export type SeaPairFn = (cb?: SeaCb<SeaPair> | null, opt?: unknown) => Promise<SeaPair | undefined>;

export interface SeaSignOpt {
  /** What is checked for an existing signature (default: the data). Set by `sign`. */
  check?: unknown;
  /** Give the `SeaSigned` object, not its `'SEA' + JSON`. */
  raw?: unknown;
  encode?: string;
  why?: unknown;
}

/** `SEA.sign(data, pair, cb, opt)`: data that is already signed by `pair` is returned as it is. */
export interface SeaSign {
  (data: unknown, pair: SeaKeyArg | null | undefined, cb: SeaCb<SeaSigned> | null | undefined, opt: SeaSignOpt & { raw: {} }): Promise<SeaSigned | undefined>;
  (data: unknown, pair?: SeaKeyArg | null, cb?: SeaCb<string> | null, opt?: SeaSignOpt): Promise<string | undefined>;
}

export interface SeaVerifyOpt {
  encode?: string;
}

/**
 * `SEA.verify(data, pair, cb, opt)`: the signed data if the signature is
 * `pair`'s (`pair === false`: without checking). The result is not checked:
 * `T` is what the caller expects the signed data to be.
 */
export type SeaVerify = <T = unknown>(data: unknown, pair: SeaKeyArg | false, cb?: SeaCb<T> | null, opt?: SeaVerifyOpt | null) => Promise<T | undefined>;

export interface SeaEncryptOpt {
  /** Default `'AES-GCM'`. */
  name?: string;
  encode?: string;
  /** Give the `SeaEncrypted` object, not its `'SEA' + JSON`. */
  raw?: unknown;
  why?: unknown;
  /** The key (when `pair` is missing): `opt.epriv`. */
  epriv?: string;
}

/** `SEA.encrypt(data, pair, cb, opt)`. */
export type SeaEncrypt = (data: unknown, pair?: SeaKeyArg | null, cb?: SeaCb<string | SeaEncrypted> | null, opt?: SeaEncryptOpt | null) => Promise<string | SeaEncrypted | undefined>;

export interface SeaDecryptOpt extends SeaEncryptOpt {
  /** Give the decrypted text, not parsed. */
  skipParse?: boolean;
}

/** `SEA.decrypt(data, pair, cb, opt)`. The result is not checked: `T` is what the caller expects the plain text to be. */
export type SeaDecrypt = <T = unknown>(data: unknown, pair?: SeaKeyArg | null, cb?: SeaCb<T> | null, opt?: SeaDecryptOpt | null) => Promise<T | undefined>;

/** `SEA.secret(key, pair, cb, opt)`: the ECDH shared secret of their `epub` and our `epriv` (a JWK `k`). */
export type SeaSecret = (key: SeaKeyArg, pair?: SeaKeys | null, cb?: SeaCb<string> | null, opt?: { why?: unknown }) => Promise<string | undefined>;

/** `SEA.certify(certificants, policy, authority, cb, opt)`. */
export type SeaCertify = (
  certificants: SeaCertificants | null | undefined,
  policy: SeaPolicy | undefined,
  authority: SeaKeyArg,
  cb?: SeaCb<string | SeaSigned> | null,
  opt?: SeaCertifyOpt,
) => Promise<string | SeaSigned | undefined | void>;

/** `aeskey(key, salt, opt)` (aeskey.js): the AES-GCM key of a passphrase (or `epriv`) and a salt. */
export type SeaAesKey = (key: SeaKeyArg, salt?: SeaBytes, opt?: unknown) => Promise<CryptoKey>;

/** `sha256(data, name)` (sha256.js): the hash of a string, or of the JSON of anything else. */
export type SeaSha256 = (d: unknown, o?: string) => Promise<SeaBytes>;


/** The `fall_verify` of verify.js: legacy signatures. `f` counts the attempts. */
export type SeaFallVerify = <T = unknown>(data: unknown, pair: SeaKeyArg, cb: SeaCb<T> | null | undefined, opt: SeaVerifyOpt, f?: number) => Promise<T | undefined>;

/** `SEA.opt` (settings.js, verify.js, index.js). */
export interface SeaSettings {
  pbkdf2: { hash: { name: string }; iter: number; ks: number };
  ecdsa: { pair: EcKeyGenParams; sign: EcdsaParams };
  ecdh: EcKeyGenParams;
  /** The ECDSA JWK of a pub (`x.y`) and, to sign, the priv (`d`). */
  jwk(pub: string, d?: string): JsonWebKey;
  /** The AES-GCM JWK of raw key bytes. */
  keyToJwk(keyBytes: SeaBytes): JsonWebKey;
  recall: { validity: number; hook<T>(props: T): T };
  /** A `'SEA{...}'` string? */
  check(t: unknown): boolean;
  /**
   * The JSON of a `'SEA{...}'` string (or of any JSON string); anything else
   * (or invalid JSON) as it is. The result is not checked: `T` is what the
   * caller expects.
   */
  parse<T = unknown>(t: unknown): Promise<T>;
  // --- verify.js
  /** The (cached) verify key of a pub: a workaround for a memory leak of the node WebCrypto. */
  slow_leak: (pub: string) => Promise<CryptoKey>;
  fall_verify: SeaFallVerify;
  /** Up to which `fall_verify` attempt to accept legacy signatures (default 2). */
  fallback: number;
  /** The node, key, value and state of the last `fall_verify`, for `unpack`. */
  fall_soul?: Soul;
  fall_key?: string;
  fall_val?: unknown;
  fall_state?: HamState;
  // --- index.js
  /** The pub of a soul (`~pub` or `~pub/...`), else `undefined`. */
  pub(s: string | undefined): string | undefined;
  stringy(t: unknown): void;
  /**
   * Call back with what to verify for a key update: the signed value with
   * the key's soul, key and state (`{m: {'#', '.', ':', '>'}, s}`), or `d`
   * itself (unsigned, or already a `'SEA{...}'` string).
   */
  pack(d: Partial<SeaPutAtom>, cb: (packed: unknown) => void, k?: string, n?: NodeLike, s?: Soul): void;
  /** The value of verified data (method: the implementation reads it as `SeaPacked`). */
  unpack(d: unknown, k?: string, n?: SeaUnpackNode): unknown;
  /** States before this (Jan 1 2019) accept unpacked legacy values. */
  shuffle_attack: number;
}

/** The node `unpack` checks legacy values against: a node, or `{[key]: value}`. */
export interface SeaUnpackNode {
  _?: { '#'?: Soul; '>'?: Dict<HamState> };
  [key: string]: unknown;
}

/** `SEA` (root.js): the object every SEA module adds itself to. */
export interface SeaStatic {
  /** The browser window (or worker global), when there is one. */
  window?: SeaWindow;
  /** The last error (set by every SEA function that fails). */
  err?: unknown;
  /** Throw errors instead of calling back with nothing. */
  throw?: boolean;
  I?: SeaI;
  opt: SeaSettings;
  work: SeaWork;
  name: SeaName;
  pair: SeaPairFn;
  sign: SeaSign;
  verify: SeaVerify;
  encrypt: SeaEncrypt;
  decrypt: SeaDecrypt;
  secret: SeaSecret;
  certify: SeaCertify;
  random: SeaShim['random'];
  Buffer: SafeBufferStatic;
  /**
   * The PGPv4 key id of a pub (hex). Always rejects with a ReferenceError
   * upstream: it calls a global `sha1hash` that is never defined in sea.js
   * (sha1.js keeps it module local).
   */
  keyid(pub: string): Promise<string>;
  /** The Gun SEA extends (user.js). */
  GUN?: GunStatic;
}

// ---------------------------------------------------------------------------
// The user (user.js, create.js, auth.js, recall.js, share.js)
// ---------------------------------------------------------------------------

/** `user.is`: who is logged in (create.js sets it from the pair it got, which may be partial). */
export interface SeaUserIs {
  pub?: string;
  epub?: string;
  /** The alias, or the pub when logging in with a pair. */
  alias?: string | null;
}

/** The ack of `user.create`. */
export type SeaCreateAck = { ok: 0; pub?: string } | { err: string; wait?: true };

/**
 * What `user.auth` calls back with: the user's chain meta, or an error. When
 * the password is changed (`opt.change`), and when a legacy UTF8/shuffle
 * account is migrated, it calls back with the ack of the put of the new
 * `auth` instead.
 */
export type SeaAuthAck = ChainMeta | { err: string; wait?: true } | Msg;

export type SeaCreateCb = (ack: SeaCreateAck) => void;
export type SeaAuthCb = (ack: SeaAuthAck) => void;

export interface SeaCreateOpt {
  /** `false`: skip the alias and password checks. */
  check?: boolean;
  /** Create even if the alias exists. */
  already?: unknown;
}

export interface SeaAuthOpt {
  /** A new password. */
  change?: string;
  /** Set to migrate an old (UTF8, shuffled) account. */
  shuffle?: string;
  /** How many times to look the alias up again (default 9). */
  retries?: number;
  remember?: boolean;
}

export interface SeaRecallOpt {
  sessionStorage?: boolean;
  /** Set by `recall` (when the user chain has no options). */
  remember?: boolean;
}

/**
 * The arguments of `user.create(...)` and `user.auth(...)`: `(alias, pass,
 * cb?, opt?)` or `(pair, cb?, opt?)`. The callback can stand anywhere, the
 * options are always last. An object argument is a pair if it has a `pub` or
 * an `epub`, else the options (`null` is not accepted: it throws).
 */
export type SeaUserArgs<Cb, Opt> = Array<string | (SeaKeys & Opt) | Cb | undefined>;

/** The user's node (`~pub`) as auth.js reads it. */
export interface SeaUserNode {
  pub?: string;
  epub?: string;
  alias?: string | null;
  /** The private keys, encrypted with the proof of work of the password: `{ek, s}` (or its JSON). */
  auth?: SeaAuthData | string;
  _?: unknown;
  [key: string]: unknown;
}

/** The `auth` field of a user's node: the encrypted private keys (`ek`) and the salt of the proof of work (`s`). */
export interface SeaAuthData {
  ek: SeaEncrypted | string;
  s: string;
}

/** The user chain (`gun.user()`): a chain of the `User` constructor. */
export interface UserChain extends Chain<ChainMeta> {
  /** Who is logged in. */
  is?: SeaUserIs;
  create(this: UserChain, ...args: SeaUserArgs<SeaCreateCb, SeaCreateOpt>): UserChain;
  auth(this: UserChain, ...args: SeaUserArgs<SeaAuthCb, SeaAuthOpt>): UserChain;
  leave(this: UserChain, opt?: unknown, cb?: unknown): UserChain;
  recall(this: UserChain, opt?: SeaRecallOpt, cb?: SeaAuthCb): UserChain;
  /** A proxy that reads the keys of the logged in user. */
  pair(this: UserChain): SeaPairProxy | undefined;
  /**
   * Deprecated. Resolves to the user's data: the async function returns the
   * chain, which is a thenable (`.then()`, then.js).
   */
  delete(this: UserChain, alias: string, pass: string, cb?: (ack: { ok: 0 }) => void): Promise<ChainData | undefined>;
  /**
   * Deprecated. Always rejects with `{err: 'No session!'}` upstream: it calls
   * a global `authRecall` that is never defined.
   */
  alive(this: UserChain): Promise<ChainMeta>;
  /**
   * Experimental. Always rejects with a ReferenceError upstream: it reads a
   * global `path` that is never defined.
   */
  trust(this: UserChain, user: Chain): Promise<void>;
  /** Experimental. */
  grant(this: UserChain, to: Chain, cb?: PutCb): UserChain;
  /** Experimental. */
  secret(this: UserChain, data: unknown, cb?: PutCb): UserChain;
}

/** `User` (user.js), also `Gun.User`. */
export interface UserStatic {
  (this: Chain<ChainMeta>, root?: unknown): void;
  new (root?: unknown): UserChain;
  prototype: UserChain;
  GUN: GunStatic;
  SEA: SeaStatic;
}

/** `user.pair()`: a proxy of `{DANGER: '\u2620'}` that reads the logged in user's keys. */
export type SeaPairProxy = SeaKeys & { DANGER?: string };

/** The callback the user chain's `opt.uuid` takes (a number, the core's length argument, is ignored). */
export type SeaUuidCb = (err: null, id: string) => void;

/** The steps of `user.create` (create.js `act`). */
export interface SeaCreateAct {
  /** The alias' node: is the alias taken? */
  a(pubs?: ChainData): void;
  /** The proof of work of the password. */
  b(proof?: string): void;
  /** The key pair. */
  c(pair: SeaKeys): void;
  d(): void;
  e(): void;
  /** The encrypted private keys. */
  f(auth?: string | SeaEncrypted): void;
  g(auth?: string): void;
  /** The user's node was written. */
  h: OnCb & { ok?: 1 };
  /** The alias was linked to it (also called without arguments by `h`). */
  i: ((data?: ChainData, key?: string, msg?: ChainMsg, eve?: GetListener) => void) & { ok?: 1 };
  pubs?: ChainData;
  salt: string;
  proof?: string;
  pair: SeaKeys;
  data: SeaUserNode;
}

/** The steps of `user.auth` (auth.js `act`). */
export interface SeaAuthAct {
  /** A user's node (or the alias' node, a list of links to them). */
  a(data?: SeaUserNode): void;
  /** Try the next candidate. */
  b(list?: Array<string | Lex>): void;
  c(auth?: SeaAuthData | string): void;
  d(proof?: string): void;
  e(half?: SeaKeys): void;
  f(pair: SeaKeys): void;
  g(pair?: SeaKeys | null): void;
  /** The user's node, when logging in with a pair without private keys. */
  h(data?: SeaUserNode): void;
  z(): void;
  y(proof?: string): void;
  x(auth?: string | SeaEncrypted): void;
  w(auth: string): void;
  err(e?: string): void;
  plugin(name: string): void;
  list?: Array<string | Lex>;
  name?: string;
  /** The user's node (set before it is read). */
  data: SeaUserNode;
  auth: SeaAuthData;
  enc?: SeaDecryptOpt | null;
  half?: SeaKeys;
  lol?: SeaKeys;
  pair: SeaKeys;
  salt: string;
}

/** The constructor of user.js' `Object.create` polyfill. */
export interface ProtoCtor {
  (): void;
  new (): Chain;
}

// ---------------------------------------------------------------------------
// The firewall (index.js)
// ---------------------------------------------------------------------------

/** SEA's state on a root (`root.sea`). */
export interface SeaRootState {
  /** Which pubs own a soul: souls linked from a user's graph. */
  own: Dict<Dict<1>>;
}

/** A root once SEA set it up (the `opt` hook). */
export interface SeaRootMeta extends RootMeta {
  sea: SeaRootState;
}

/** A key update as SEA sees it: SEA replaces the value with its signed form while it checks it. */
export interface SeaPutAtom extends Omit<PutAtom, ':'> {
  ':': GunValue | SeaPutValue;
  /** The verified value, for chains. */
  '='?: unknown;
}

/** A `root.on('put')` event as SEA's firewall handles it. */
export interface SeaPutMsg extends MsgBase {
  '#': AckId;
  put: SeaPutAtom;
  _: MsgMeta;
  err?: string;
}

/**
 * The key update of a user's own (or certified) write, as `check.pub` sees it:
 * it replaces `put[':']` with the signed value (`{':', '~'}`, plus `+` and `*`
 * for certified writes), then with its JSON (written as a
 * `Stringified<SeaPutValue>`).
 */
export interface SeaSigningMsg extends SeaPutMsg {
  put: SeaSigningAtom;
}

export interface SeaSigningAtom extends Omit<SeaPutAtom, ':'> {
  ':': SeaPutValue;
}

/** Rejects a key update with a reason. */
export type SeaNo = (why: string) => void;

/** The firewall's listener (`root.on('put', check, root)`). */
export type SeaEve = OntoListener<SeaPutMsg, SeaRootMeta>;

/** The checks of index.js, by kind of soul. `user` is the root's user chain, or `''`. */
export interface SeaChecks {
  /** Content addressed data (`#` in the soul): the key must be the hash of the value. */
  hash(eve: SeaEve, msg: SeaPutMsg, val: SeaPutAtom[':'], key: string, soul: Soul, at: SeaRootMeta, no: SeaNo): void;
  /** The list of aliases (`~@`). */
  alias(eve: SeaEve, msg: SeaPutMsg, val: SeaPutAtom[':'], key: string, soul: Soul, at: SeaRootMeta, no: SeaNo): void;
  /** The pubs of an alias (`~@alias`). */
  pubs(eve: SeaEve, msg: SeaPutMsg, val: SeaPutAtom[':'], key: string, soul: Soul, at: SeaRootMeta, no: SeaNo): void;
  /** A user's graph (`~pub`): sign our own writes, verify the others. */
  pub(eve: SeaEve, msg: SeaPutMsg, val: SeaPutAtom[':'], key: string, soul: Soul, at: SeaRootMeta, no: SeaNo, user: UserChain | '', pub: string): Promise<void>;
  /** Anything else: ask the `secure` hook when `opt.secure`. */
  any(eve: SeaEve, msg: SeaPutMsg, val: SeaPutAtom[':'], key: string, soul: Soul, at: SeaRootMeta, no: SeaNo, user: UserChain | ''): void;
}

// ---------------------------------------------------------------------------
// SEA's extensions of the core
// ---------------------------------------------------------------------------

declare module '../src/types' {
  interface GunStatic {
    SEA?: SeaStatic;
    User?: UserStatic;
    /** Deprecated utilities (gun.js' deprecated part). index.js only falls back to `text.match`. */
    text?: { match(t: unknown, o?: string | LexMatch): boolean };
  }
  interface RootMeta {
    /** SEA's state (set by the `opt` hook). */
    sea?: SeaRootState;
    /** The user chain (`gun.user()`). */
    user?: UserChain;
    /** Never set on a root (share.js reads `at.is` while walking up). */
    is?: undefined;
  }
  interface ChainMeta {
    /** The user's chain meta: the logged in keys. */
    sea?: SeaKeys;
    /** A user is being created or authenticated. */
    ing?: boolean;
    /** Legacy: deleted by `leave`. */
    is?: SeaUserIs;
  }
  interface GunOptions {
    /** Only accept data that is signed (unsigned data asks the `secure` hook). */
    secure?: boolean;
    /** Remember the logged in user in sessionStorage. */
    remember?: boolean;
  }
  interface PutOpt {
    /** A certificate that allows writing to another user's graph. */
    cert?: string | SeaSigned<SeaCertData>;
  }
  interface RootEvents {
    /** Fired after login with the user's chain meta. */
    auth: ChainMeta;
    /** Unsigned data outside of user graphs, while `opt.secure` is set. */
    secure: SeaPutMsg;
  }
  interface Chain {
    /** The user chain (`user()`), or the chain of a user's graph (`user(pub)`). */
    user(this: Chain): UserChain;
    user(this: Chain, pub: string | NodeLike): Chain<ChainMeta>;
    /** A promise of the data (`once`). */
    then(this: Chain): Promise<ChainData | undefined>;
    then<R>(this: Chain, cb: (data: ChainData | undefined) => R | PromiseLike<R>, opt?: OnceOpt): Promise<R>;
  }
}

declare global {
  interface Window {
    SEA?: SeaStatic;
    /** IE 11. */
    msCrypto?: Crypto;
  }
  interface Crypto {
    /** Old Safari. */
    webkitSubtle?: SubtleCrypto;
  }
  namespace NodeJS {
    interface Module {
      /** sea/root.js: the global SEA runs in (the bundle's module record keeps it). */
      window?: SeaWindow;
      /** sea/root.js reads `SEA` from the module record when there is no window. */
      SEA?: SeaStatic;
    }
  }
}
