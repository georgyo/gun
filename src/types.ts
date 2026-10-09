// The internal type model of the GUN core.
//
// This file only declares types: it is never emitted (see TYPE_ONLY in
// scripts/build.mts). Every module of the core (src/*.ts), SEA (sea/*.ts) and
// the plugins (lib/*.ts) shares these types with
//
//     import type { Chain, RootMeta, Msg } from './types';      // src/
//     import type { Chain, RootMeta, Msg } from '../src/types'; // sea/, lib/
//
// It is also the main documentation of GUN's internals: the shapes below were
// surveyed from the runtime code, quirks included. It does NOT describe the
// public API (that is index.d.ts / types/**), it describes what the code
// actually passes around.
//
// Conventions used by the core that these types are designed for:
//
// * `(x||'').y` reads `y` of an optional object. Write it as
//   `((x||'') as Partial<X>).y`: the cast is blanked out, so the emitted
//   JavaScript is unchanged. (The shorter `(x || '' as Partial<X>).y` only
//   compiles when `''` is comparable with `Partial<X>`, which is not the case
//   for types with a call or index signature such as `MsgMeta` or `GunNode`.)
//   `(msg._||{}).y = 1` writes to a throw away object:
//   `(msg._ || {} as Partial<MsgMeta>).y = 1`.
// * `var u;` is the `undefined` sentinel: annotate it `var u: undefined;`.
// * Functions used as records (`msg._`, `msg.seen`, `mesh`, `Gun.log.once`) are
//   described by interfaces with a call signature plus fields. Create them with
//   `function(){} as MsgMeta`.
// * Records keyed by ids are `Dict<T>` (`{[key: string]: T | undefined}`):
//   reads are honest about missing keys. Numeric ids (`at.id`) index them too.
// * A message id can be an object (`AckId`). Index records with `s[id as string]`.
// * Extension points (plugins, SEA) add fields to these interfaces with module
//   augmentation from their own type-only files, e.g. in lib/types.ts:
//
//       declare module '../src/types' {
//         interface GunOptions { file?: string }
//         interface RootEvents { auth: ChainMeta }
//       }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A record keyed by soul, key, peer id or event id. Reads may miss. */
export type Dict<T> = { [key: string]: T | undefined };

/** What `setTimeout` returns (NodeJS.Timeout under node, a number in browsers). */
export type Timer = ReturnType<typeof setTimeout>;

/** A function that a callback list (`setTimeout.each`, hatch) can run. */
export type Thunk = () => void;

/**
 * Parameter types whose `this` and arguments are compared bivariantly, the way
 * TypeScript compares methods. Used for DOM style `on*` handlers so that a
 * DOM `WebSocket` is assignable to `Wire`.
 */
export type Bivariant<F extends (...args: never[]) => unknown> = { m(...args: Parameters<F>): ReturnType<F> }['m'];

// ---------------------------------------------------------------------------
// Graph data (valid.js, state.js)
// ---------------------------------------------------------------------------

/** The id of a node in the graph. */
export type Soul = string;

/**
 * A HAM state: `Gun.state()` output (ms since epoch plus a sub ms fraction plus
 * `State.drift`, strictly increasing), or `-Infinity` for "no state".
 */
export type HamState = number;

/** A link (relation) to another node: exactly one key, `#`. */
export interface Link {
  '#': Soul;
}

/** The scalar values GUN stores. NaN and +/-Infinity are not valid. */
export type GunPrimitive = string | number | boolean | null;

/** Everything `Gun.valid` accepts as the value of a key: a scalar or a link. */
export type GunValue = GunPrimitive | Link;

/** The per key states of a node (`node._['>']`). */
export type StateMap = Dict<HamState>;

/** The metadata of a node (`node._`). */
export interface NodeMeta {
  /** The soul. Missing on nodes made by `State.ify` without a soul (put.js builds those, then fills it). */
  '#'?: Soul;
  /** The HAM state of every key. Always present after `State.ify`; required on the wire (root.js `put` rejects nodes without it). */
  '>'?: StateMap;
}

/** A node: its metadata in `_`, and its keys holding `GunValue`s. */
export interface GunNode {
  _: NodeMeta;
  [key: string]: GunValue | NodeMeta | undefined;
}

/** Anything `State.ify` can create or extend into a node: `{}`, a partial node, or a node. */
export interface NodeLike {
  _?: NodeMeta;
}

/** A graph: nodes by soul (`root.graph`, the `put` of wire messages). */
export type GunGraph = Dict<GunNode>;

/**
 * What a chain caches in `at.put` and hands to callbacks: a node on soul chains,
 * a value (or the linked node, as a shared cache) on key chains. `undefined`
 * (outside this type) means "not found". `.map(fn)` may put any user value here.
 */
export type ChainData = GunValue | GunNode;

/** `Gun.valid(v)`: `true` for a valid scalar, the soul for a link (`''` for `{'#': ''}`), else `false`. */
export type Valid = (v: unknown) => boolean | Soul;

/** `State.is(node, key, fallback?)`. */
export interface StateIs {
  /** With a fallback the result is always a number (`-Infinity` when the key has no state). `1` is used as a "no map" fallback (root.js ham). */
  (n: unknown, k: string | undefined, o: StateMap | 1): HamState;
  /** `undefined` when the node has no states at all, `-Infinity` when the key has none. */
  (n: unknown, k?: string): HamState | undefined;
}

/** `Gun.state` (state.js). */
export interface StateFn {
  /** A new, strictly increasing HAM state. */
  (): HamState;
  /** Clock correction added to every state. */
  drift: number;
  is: StateIs;
  /**
   * Put a key's state (and value) on a node, creating the node and its meta if
   * needed. `s` is only stored when it is a number. `v` is stored as is when it
   * is not `undefined`: it is not validated ("Not its job to check for valid
   * values!"), so callers vouch for it. `'_'` is never written. Returns `n`.
   * (Property syntax, so that `satisfies StateFn` checks the implementation's
   * parameters strictly.)
   */
  ify: (n: NodeLike | null | undefined, k?: string, s?: HamState, v?: unknown, soul?: Soul) => GunNode;
}

// ---------------------------------------------------------------------------
// LEX queries
// ---------------------------------------------------------------------------

/** A match on a string, as `String.match` understands it. */
export interface LexMatch {
  /** Exact. */
  '='?: string;
  /** Prefix. */
  '*'?: string;
  /** Greater or equal. */
  '>'?: string;
  /** Less or equal. */
  '<'?: string;
  /** Reverse order (storage adapters). */
  '-'?: number | boolean;
}

/**
 * A LEX query: the `get` of root and wire messages, and the lex of `.map(lex)`
 * / `.get(lex)` chains (whose keys are copied into the `get` of their out
 * messages).
 */
export interface Lex extends LexMatch {
  /** Soul, or a match on souls. */
  '#'?: Soul | LexMatch;
  /** Key, a match on keys, `true` (get.js `soul()`: "just resolve the soul") or `' '` (put.js: same, from a put). */
  '.'?: string | LexMatch | true;
  /** Size limit (storage adapters). */
  '%'?: number;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * The id `ham` gives to each per key `put` event (root.js:137): stringifies to
 * `msg['#'] + n` and carries the batch context in `_`. Storage adapters echo it
 * back as the `'@'` of their acks, which is how `ack()` finds the batch again.
 */
export interface AckId {
  toString(): string;
  toJSON?: () => string;
  _: MsgMeta;
}

/** A message id. Usually a random string, an `AckId` on `put` events and their acks. */
export type MsgId = string | AckId;

/** The `ok` of an ack: how many more acks are wanted (`@`), how near (`/`). */
export interface OkAck {
  '@'?: number;
  '/'?: number;
  /** `{'': 1}`: the default ok of a completed batch (root.js back). */
  ''?: number;
  /** WebRTC signalling. */
  rtc?: unknown;
}

/** `msg.ok`: an `OkAck`, or a quality number (`0` from localStorage, `1` from radisk). */
export type Ok = OkAck | number;

/** An error ack / error chain value: `{err: "..."}`. */
export interface ErrAck {
  err: string;
}

/** Debug timestamps (`msg.DBG`). Stamps are numbers (`+new Date`); the original wire value is kept in `DBG`. */
export interface Debug {
  DBG?: unknown;
  [stamp: string]: unknown;
}

/** A list of callbacks run when a put batch ends (`root.hatch`, `ctx.match`). */
export interface Hatch extends Array<Thunk | undefined> {
  /** Set once the batch is done. */
  end?: 1;
}

/**
 * The per message context, `msg._`. Always a function after `universe` (so that
 * `JSON.stringify` drops it), used as a record. It is at the same time the mesh
 * meta of a received message and the put batch context of root.js (`ctx`), and
 * travels with every per key `put` event of the batch to storage and chains.
 */
export interface MsgMeta {
  (): void;
  // --- mesh (mesh.js)
  /** The peer the message came from. */
  via?: Peer;
  /** Peers already sent to (parsed from `msg['><']`). */
  yo?: Dict<1>;
  /** `msg.ok['/']` as heard. */
  near?: number;
  /** The serialized message, cached. */
  raw?: string;
  /** The serialized `put`, cached while hashing. */
  $put?: string;
  /** When `say` first saw it. */
  y?: number;
  // --- put batch (root.js put/ham/map/fire/ack/back)
  /** The root of the chain the message is for; `undefined` makes `fire` stop. */
  root?: RootMeta;
  /** `msg.$`, or `''`. */
  $?: Chain | '';
  /** The id of the batch message. */
  '#'?: MsgId;
  /** The batch message. */
  msg?: Msg;
  /** How many `put` events were emitted (also the suffix of their `AckId`s). */
  all?: number;
  /** Pending work: `fire` ends the batch when it drops to 0. SEA decrements it to "forget" a key. */
  stun?: number;
  /** Acks received. */
  acks?: number;
  /** Set when the batch is done. */
  stop?: 1;
  err?: string;
  ok?: Ok;
  /** `ctx.match.push(...)` result: an ack arrived before the batch was counted. */
  crack?: number;
  /** The previous `root.hatch`. */
  latch?: Hatch;
  /** This batch's hatch. */
  match?: Hatch;
  /** Called when the batch ends (set by `.put()` on its out message). */
  hatch?: Thunk;
  /** A cache miss: re-apply even if the state is not newer (chain.js ack). */
  miss?: 1;
  /** Trusted data from our own graph: skip re-verification (get acks, SEA). */
  faith?: boolean;
  ram?: boolean;
  DBG?: Debug;
  // --- timing stamps written as `(DBG||ctx).x` when there is no DBG
  pk?: number;
  pd?: number;
  Hf?: number;
  gk?: number;
  yp?: number;
}

/** Keys every message view shares. */
export interface MsgBase {
  /** The message id (filled in by `universe` / mesh when missing). */
  '#'?: MsgId;
  /** The id this message replies to. */
  '@'?: MsgId;
  /** DAM hash of the `put` (`String.hash`). */
  '##'?: number;
  /** Comma separated ids of the peers it was already sent to. */
  '><'?: string;
  /** More data follows, in the message with this id. */
  '%'?: string | number;
  ok?: Ok;
  /** An ask timed out (`{err: "Error: No ACK yet.", lack: true}`). */
  lack?: true;
  DBG?: Debug;
  /** Legacy "do not relay" flags. */
  nts?: unknown;
  NTS?: unknown;
  /** The context, see `MsgMeta`. */
  _?: MsgMeta;
  /** The chain this message is about. Untrusted on the wire, replaced by `universe`. */
  $?: Chain;
  /** Set to `universe` once processed: "pass it along". */
  out?: OntoCallback<Msg, RootMeta>;
}

/**
 * A root level message: what goes through `root.on('in')` / `root.on('out')`,
 * the wire, storage acks, and what chains send `out`.
 */
export interface Msg extends MsgBase {
  get?: Lex;
  put?: GunGraph;
  err?: string;
  /** The user's put options (`.put(data, cb, {opt})`), e.g. a SEA certificate. */
  opt?: PutOpt;
  /** DAM verb, dispatched to `mesh.hear[dam]`: `'!'`, `'?'`, `'mob'`, `'hi'`, plugins add more. */
  dam?: string;
  /** Peer process id (`dam: '?'`). */
  pid?: string;
  /** `dam: 'mob'`. */
  peers?: Dict<unknown>;
}

/** A `root.on('get')` event: a `Msg` after `universe`, with a `get`. */
export interface GetMsg extends Msg {
  '#': MsgId;
  get: Lex;
  $: Chain;
  _: MsgMeta;
}

/** A key update. `:` is the state value; `>` its HAM state. */
export interface PutAtom {
  '#': Soul;
  '.': string;
  ':': GunValue;
  '>': HamState;
}

/** A `root.on('put')` event, one per key of a batch (root.js ham). */
export interface PutMsg extends MsgBase {
  '#': AckId;
  put: PutAtom;
  _: MsgMeta;
}

/**
 * A key update as chains see it. Every field may be missing (input() treats
 * such a `put` as the old format). `=` holds an already transformed value (a
 * whole node, or what a `.map(fn)` returned) and wins over `:`.
 */
export interface ChainPut {
  '#'?: Soul;
  '.'?: string;
  ':'?: GunValue;
  '='?: ChainData;
  '>'?: HamState;
}

/** Loop guard of chain messages (chain.js:114): a function used as a record of chain ids. */
export interface Seen {
  (): void;
  [id: string]: AnyMeta | undefined;
}

/**
 * A chain level message: what goes through `cat.on('in')`. `put` is a
 * `ChainPut`, the old format (a node or a value), or `undefined` for "not
 * found". Chain metas are sent as messages too (`back.on('in', back)`), which
 * is why the overlapping keys of `ChainMeta` are compatible with this type.
 */
export interface ChainMsg extends MsgBase {
  /** The key of the chain the message is for. */
  get?: string;
  put?: ChainPut | ChainData;
  /** A string, or `{err}` when an error chain's meta is sent as a message. */
  err?: string | ErrAck;
  /** The chain we came from through a link. */
  $$?: Chain;
  /** The origin of a message on a chain type we do not recognize. */
  $$$?: Chain;
  /** The message this one was converted from. */
  via?: ChainMsg;
  VIA?: ChainMsg;
  /** The soul the chain was linked to, while unlinking. */
  linked?: Soul | null;
  /** Only on put.js' synthetic `resolve({soul})`. */
  soul?: Soul;
  seen?: Seen;
}

// ---------------------------------------------------------------------------
// Event emitter (onto.js)
// ---------------------------------------------------------------------------
//
// `on(tag, fn, as)` appends a listener to a doubly linked list per tag, kept in
// `this.tag` of the host object (a chain meta, the root, `Gun` itself, the stun
// registry). `on(tag, data)` emits: it calls the first listener, which must
// call `this.to.next(data)` to pass it on. The list ends in a sentinel that
// forwards to its `to` (if any). `off()` unlinks a listener and turns it into a
// pass through, so in flight emits continue.

/** Anything a listener can pass data to. */
export interface OntoNext<T = unknown> {
  next(arg: T): void;
}

/** The end of a listener list (`onto._`, re-created for every new tag). */
export interface OntoEnd<T = unknown> extends OntoNext<T> {
  to?: OntoNext<T>;
  back?: OntoListener<T> | OntoTag<T>;
}

/** What follows a tag or a listener: the next listener, or the end. */
export type OntoNode<T = unknown> = OntoListener<T> | OntoEnd<T>;

/** The head of a tag's list, in `host.tag[name]`. */
export interface OntoTag<T = unknown> {
  tag: string;
  /** The first listener (or the end). */
  to: OntoNode<T>;
  /** The last listener; the tag itself once every listener is off (the tag is then deleted). */
  last?: OntoListener<T> | OntoTag<T>;
}

/**
 * The registry of an event host. Any object can be a host (the registry is
 * created on first use), so the emitter's signatures take `this: object`.
 */
export interface OntoHost {
  tag?: Dict<OntoTag>;
}

/** A subscribed listener. It is the `this` of its callback. */
export interface OntoListener<T = unknown, A = unknown> {
  /** Unsubscribe. `true` if it already was. */
  off(): true | undefined;
  /** Pass data on: `this.to.next(arg)`. */
  to: OntoNode<T>;
  /** The callback; the forwarder once off. */
  next(arg: T): void;
  /** Its tag. */
  the: OntoTag<T>;
  /** Its host. */
  on: OntoHost;
  /** The third argument of the subscription. */
  as: A;
  /** The previous listener, or the tag. */
  back: OntoListener<T> | OntoTag<T>;
  /** ask.js: the ack timeout. */
  err?: Timer;
  /** put.js stun listener: set (to a noop, a cheap truthy flag) when the write ended. */
  end?: Thunk;
  /** put.js stun listener: reads to resume when the write ends. */
  add?: Dict<Thunk>;
  /** Never set: get.js reads `listener.last` (a dead fallback). */
  last?: undefined;
}

/** A listener callback. */
export type OntoCallback<T, A = unknown> = (this: OntoListener<T, A>, arg: T) => void;

/**
 * Tags that have a fixed meaning on the core hosts. They can only be used with
 * a host's typed event map (`On<E>`), never through the untyped fallback, so a
 * wrong payload is a type error.
 */
export type CoreTag = 'in' | 'out' | 'put' | 'get' | 'create' | 'opt' | 'hi' | 'bye' | 'ack' | 'off';

/** Rejects core tags (and accepts dynamic `string` tags) in the untyped `Onto` overloads. */
export type NotCoreTag<G extends string> = G extends CoreTag ? never : unknown;

/** Events every chain meta (root included) shares, so they can be used on `AnyMeta`. */
export interface SharedEvents {
  out: Msg;
  off: object;
}

/** `onto.off` / `onto._`, cached on the function. */
export interface OntoStatics {
  off?: (this: OntoListener) => true | undefined;
  _?: OntoEnd;
}

/**
 * The emitter without an event map: shared events and dynamic tags (ask ids,
 * stun ids, plugin events). Every `On<E>` is assignable to it, so it is the
 * type for code that works on any host.
 */
export interface Onto extends OntoStatics {
  /** Subscribe to a shared event. */
  <K extends keyof SharedEvents, A = unknown>(this: object, tag: K, cb: OntoCallback<SharedEvents[K], A>, as?: A): OntoListener<SharedEvents[K], A>;
  /** Emit a shared event (or peek without `arg`). */
  <K extends keyof SharedEvents>(this: object, tag: K, arg?: SharedEvents[K]): OntoNode<SharedEvents[K]> | undefined;
  /** Subscribe to a dynamic tag. Annotate the callback to type the payload. */
  <T, A = unknown, G extends string = string>(this: object, tag: G & NotCoreTag<G>, cb: OntoCallback<T, A>, as?: A): OntoListener<T, A>;
  /** Emit on a dynamic tag (nothing happens if `arg` is `undefined`). Returns the first listener (or end), `undefined` if no one listens. */
  <T, G extends string = string>(this: object, tag: G & NotCoreTag<G>, arg?: T): OntoNode<T> | undefined;
  /** No tag: `{to: onto}`. */
  (this: object): { to: Onto };
}

/** The emitter of a host whose events are described by the event map `E`. */
export interface On<E> extends Onto {
  <K extends keyof E & string, A = unknown>(this: object, tag: K, cb: OntoCallback<E[K], A>, as?: A): OntoListener<E[K], A>;
  <K extends keyof E & string>(this: object, tag: K, arg?: E[K]): OntoNode<E[K]> | undefined;
}

/** Events of the root (`root.on(...)`, `gun.back(-1)._`). */
export interface RootEvents extends SharedEvents {
  /** Every incoming message (wire, storage acks, chains asking). */
  in: Msg;
  /** Every outgoing message (to the mesh). */
  out: Msg;
  /** One event per key that HAM accepted, for storage adapters and chains. */
  put: PutMsg;
  /** A read storage adapters should answer with `Gun.on.get.ack`. */
  get: GetMsg;
  /** The root was created. */
  create: RootMeta;
  /** A peer connected. */
  hi: Peer;
  /** A peer disconnected. */
  bye: Peer;
  /** Every ack of a `.put()` (put.js). */
  ack: Msg;
  'localStorage:error': { err: unknown; get: string; put: GunGraph };
}

/** Events of a (non root) chain (`cat.on(...)`). */
export interface ChainEvents extends SharedEvents {
  /** Data for this chain. */
  in: ChainMsg;
  /** A read or write going up to the root. */
  out: Msg;
  /** `.off()` was called. */
  off: object;
}

/** Global hooks on `Gun` itself (`Gun.on('opt', fn)`), kept in `Gun.tag`. */
export interface GunEvents {
  /** A root was created (before its own `create`). */
  create: RootMeta;
  /**
   * `.opt()` was called, including during creation (when `root.once` is still
   * unset). Upstream also emits it for a non root chain's `.opt()`; listeners
   * treat the payload as a root.
   */
  opt: RootMeta;
}

/** The core handlers living on `Gun.on`. */
export interface GunOnGet {
  /** Answer a get from memory, then emit it to storage adapters (`root.on('get')`). */
  (msg: GetMsg, gun: Chain<RootMeta>): void;
  /** Reply to a get with a node (in chunks of 9 keys), or "not found" without one. */
  ack(msg: GetMsg, node?: GunNode): void;
}

/** `Gun.on`: the emitter (with `Gun`'s global hooks) plus the core handlers. */
export interface GunOn extends On<GunEvents> {
  /** HAM a root message's graph (root.js put). */
  put(msg: Msg): void;
  get: GunOnGet;
  /** The chain `in` listener (chain.js input). */
  in(this: OntoListener<ChainMsg, ChainMeta>, msg: ChainMsg, cat?: ChainMeta): void;
  /** The chain `out` listener (chain.js output). */
  out(this: OntoListener<Msg, ChainMeta>, msg: Msg): void;
  /**
   * Link a chain to the soul its data points to. `this === Gun.on` (called as
   * `Gun.on.link(...)`) forces linking even for `$$` messages and non links.
   */
  link(this: GunOn | OntoListener<ChainMsg, ChainMeta> | void, msg: ChainMsg, cat?: ChainMeta): void;
  unlink(msg: ChainMsg, cat: ChainMeta): void;
}

// ---------------------------------------------------------------------------
// Ask (ask.js) and Dup (dup.js)
// ---------------------------------------------------------------------------

/** What `ask` needs from `this` (the root). Ack ids are tags of the same registry. */
export interface AskHost extends OntoHost {
  on?: Onto;
  opt?: { lack?: number };
}

/** The options of an ask: its id. */
export interface AskOpt {
  '#'?: MsgId;
}

/** `Gun.ask` / `root.ask`: request / response over the root's emitter. */
export interface Ask {
  /** Wait for acks to `as['#']` (or a new id), giving up after `opt.lack` ms (default 9000). Returns the id. */
  <A extends AskOpt | undefined = undefined>(this: AskHost, cb: OntoCallback<Msg, A>, as?: A): MsgId | undefined;
  /** Deliver `msg` to whoever asked `id`. `true` if someone did. */
  (this: AskHost, id: MsgId | { '#': MsgId } | null | undefined | false | '', msg?: Msg): true | undefined;
}

/** A message id seen recently. Plugins (AXE) add fields. */
export interface DupEntry {
  /** When it was last seen. */
  was: number;
  /** The peer it came from. */
  via?: Peer;
  /** The original GET it answers. */
  it?: Msg;
  /** The batch id an `AckId` belongs to. */
  '#'?: MsgId;
}

export interface DupOpt {
  max?: number;
  age: number;
}

/** `dup.track`, with mesh's one shot hook. */
export interface DupTrack {
  (id: MsgId): DupEntry;
  ed?: ((id: MsgId) => void) | 0;
}

/** Message de-duplication (dup.js). */
export interface Dup {
  s: Dict<DupEntry>;
  /** `false`, or the entry (tracked again). */
  check(id: MsgId): DupEntry | false;
  track: DupTrack;
  /** Forget entries older than `age` (default `opt.age`). */
  drop(age?: number): void;
  now?: number;
  to?: Timer | null;
}

export type DupFactory = (opt?: DupOpt) => Dup;

// ---------------------------------------------------------------------------
// Network (mesh.js, websocket.js)
// ---------------------------------------------------------------------------

/** A received wire frame (DOM `MessageEvent`, or the data itself). */
export interface WireMessage {
  data?: unknown;
}

/** A connection: a DOM `WebSocket`, a `ws` socket, or a plugin transport. */
export interface Wire {
  send(raw: string): void;
  close?(): void;
  onopen?: Bivariant<(ev: unknown) => void> | null;
  onclose?: Bivariant<(ev: unknown) => void> | null;
  onerror?: Bivariant<(ev: unknown) => void> | null;
  onmessage?: Bivariant<(ev: WireMessage) => void> | null;
}

export type WebSocketCtor = new (url: string) => Wire;

/** A peer. Configured peers start as `{id: url, url}`. Plugins add fields. */
export interface Peer {
  id?: string;
  url?: string;
  wire?: Wire | null;
  /** The peer's process id. */
  pid?: string;
  /** When it connected; deleted on bye. */
  met?: number;
  /** The id of the last message sent to it. */
  last?: MsgId;
  /** Messages waiting to be sent together (a JSON array being built). */
  batch?: string | string[] | null;
  tail?: number | null;
  /** Messages that could not be sent yet. */
  queue?: string[];
  /** A custom transport (instead of `wire.send`). */
  say?: (raw: string) => void;
  /** A custom disconnect. */
  bye?: Thunk;
  // stats
  SH?: number;
  SI?: MsgId;
  // websocket.js reconnect
  retry?: number;
  tried?: number;
  defer?: Timer;
}

export type PeerMap = Dict<Peer>;

/** A map of peers (`opt.peers`), told apart from a single peer by having no `id` (`if(!peer || !peer.id)`). */
export type PeerList = PeerMap & { id?: undefined };

/** Who `mesh.say` sends to: a peer, a list of peers, or (falsy) every peer / the peer the ack goes back to. */
export type PeerArg = Peer | PeerList | null | false;

/** A `mesh.hear[dam]` handler. */
export type DamHandler = (msg: Msg, peer: Peer, root: RootMeta) => void;

/** `mesh.hear`: parse and dispatch what a peer sent. */
export interface MeshHearFn {
  /** `raw` is JSON (one message or an array of them) or an already parsed message. `this === mesh` counts stats. */
  (this: unknown, raw: string | Msg, peer: Peer): void;
  one(msg: Msg, peer: Peer, S?: number): void;
  c: number;
  d: number;
}

/**
 * `mesh.hear`, which also holds the DAM handlers by verb. Plugins add their
 * verbs by augmenting this interface (lib/axe.js `opt`, `tag`; lib/bye.js `bye`;
 * lib/webrtc.js `rtc`). The index signature is `unknown` on purpose: `hear.one`
 * looks up `mesh.hear[msg.dam]` with a verb from the wire, which can just as well
 * name `one`, `c`, `d` or an inherited function member (`length`, `call`, ...).
 */
export interface MeshHear extends MeshHearFn {
  '!'?: DamHandler;
  '?'?: DamHandler;
  mob?: DamHandler;
  [dam: string]: unknown;
}

/** `mesh.say`: send a message to a peer, a map of peers, or every peer. Also the root `out` listener. */
export interface MeshSay {
  (this: Mesh | OntoListener<Msg> | void, msg?: Msg, peer?: PeerArg): false | void;
  c: number;
  d: number;
}

/** The mesh networking layer of a root (`opt.mesh`). A function used as a record. */
export interface Mesh {
  (): void;
  /** Never set; lets `say` probe `this.to` when `this` is the mesh. */
  to?: undefined;
  hear: MeshHear;
  say: MeshSay;
  /** Hash `msg.put` into `msg['##']`, then say it. */
  hash(msg: Msg, peer?: PeerArg): void;
  /** Serialize (and cache in `msg._.raw`); `false` to drop the message. */
  raw(msg: Msg | string | undefined, peer?: PeerArg): string | false | undefined;
  /**
   * A peer connected (or connect to a URL: DAM `mob`). Property syntax, so the
   * implementation, which only handles a URL on its first line, has to be cast
   * to it visibly.
   */
  hi: (peer: Peer | string) => void;
  bye: { (peer: Peer): void; time?: number };
  /** How many peers are connected. */
  near: number;
  /** The peer / message being heard right now. */
  leap?: Peer | null;
  last?: Msg | null;
  /** Routing hook (AXE). */
  way?: (msg: Msg) => unknown;
  /** Open a wire to a peer (websocket.js, webrtc). */
  wire?: (peer?: Peer) => Wire | void;
}

export type MeshFactory = (root: RootMeta) => Mesh;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/** `opt.uuid`: a new soul. */
export type Uuid = (l?: number) => string;

/**
 * The normalized options of a root (`root.opt`), after `.opt()`. Plugins read
 * and write more keys: they augment this interface.
 */
export interface GunOptions {
  peers: PeerMap;
  uuid: Uuid;
  /** The last raw options object given to `.opt()`. */
  from?: GunOptionsInit;
  /** This process' id. */
  pid?: string;
  /** Ask timeout in ms (default 9000). */
  lack?: number;
  /** Relay peer: does not subscribe for others. */
  super?: boolean;
  /** Trust data enough to skip some checks (server). */
  faith?: boolean;
  log?: (...args: unknown[]) => void;
  /** Batching delay (defaults to `wait`). */
  gap?: number;
  wait?: number;
  memory?: number;
  /** Max message size. */
  max?: number;
  /** Max batch size. */
  pack?: number;
  /** Messages handled per turn. */
  puff?: number;
  retry?: number;
  /** `false` disables websockets. */
  WebSocket?: false | WebSocketCtor;
  mesh?: Mesh;
  wire?: (peer?: Peer) => Wire | void;
  /** `false` disables the localStorage adapter. */
  localStorage?: boolean;
  file?: string;
  prefix?: string;
}

/** `Mesh()` fills these defaults in. */
export type MeshOpt = GunOptions & Required<Pick<GunOptions, 'log' | 'gap' | 'max' | 'pack' | 'puff'>>;

/** An options object as given to `Gun(opt)` / `.opt(opt)`. */
export interface GunOptionsInit extends Partial<Omit<GunOptions, 'peers'>> {
  /** A URL, URLs, or peers by URL. */
  peers?: string | string[] | PeerMap;
}

/** What `Gun(...)` / `.opt(...)` accept: options, a peer URL, or peer URLs. */
export type GunOptionsInput = GunOptionsInit | string | string[] | null | undefined;

// ---------------------------------------------------------------------------
// Chain metas (`gun._`)
// ---------------------------------------------------------------------------

/** Fields every chain meta (root included) may have. */
export interface MetaBase extends OntoHost {
  /** The cached data, see `ChainData`. */
  put?: ChainData;
  /** Child chains by key (by soul on the root). */
  next?: Dict<ChainMeta>;
  /** `.get(fn)` listeners by id; `.off()` resets it. */
  any?: Dict<GetListener>;
  /** Chains to re-emit `in` to (linked chains), by chain id. */
  echo?: Dict<ChainMeta>;
  /** The LEX of a `.map(lex)` / `.get(lex)` chain. */
  lex?: Lex;
  /** The cached `.map()` chain. */
  each?: Chain<ChainMeta>;
  /** `.once()` without a callback / `.map()`: the chain the once is on. */
  nix?: Chain;
  /** `.once()` timers by id; `''` once fired. */
  one?: Dict<Timer | ''>;
  /** Pending `soul()` callbacks with their `as`. */
  jam?: Array<[SoulCb, unknown]>;
  /** Listeners `.on(tag, fn, eas)` added for `eas`. */
  subs?: OntoListener[];
  /** Set on error chains (`.get('')`, invalid get). */
  err?: ErrAck;
  /** Not found count; `.off()` resets it to 0. */
  ack?: number;
  /** Legacy: read by `.off()` and `rid`, never written by the core. */
  map?: Dict<AnyMeta>;
  /** Set when the meta is sent as a message. */
  seen?: Seen;
  linked?: Soul | null;
}

/** The meta of a chain other than the root (`gun.get('a')._`). */
export interface ChainMeta extends MetaBase {
  $: Chain<ChainMeta>;
  root: RootMeta;
  /** Unique per root (`++root.once`). */
  id: number;
  /** The parent chain's meta. Only the root has none. */
  back: AnyMeta;
  on: On<ChainEvents>;
  /** The key this chain was reached by. Unset on `.chain()`, `.map()` and LEX chains. */
  get?: string;
  /** Set when the parent is the root: the soul. */
  soul?: Soul;
  /** Set when the parent is a soul or key chain: the key. */
  has?: string;
  /** The soul this chain's value links to; `null` once unlinked. */
  link?: Soul | null;
  /** Child chains that asked for data, by key (`''`: the whole node). */
  ask?: Dict<AnyMeta>;
  /** Set when `.opt()` is called on this chain (SEA's user chain). */
  opt?: GunOptions;
}

/** The meta of the root chain (`gun.back(-1)._`, `at.root`). */
export interface RootMeta extends MetaBase {
  $: Chain<RootMeta>;
  /** Itself. */
  root: RootMeta;
  /** Raw input until the first `.opt()` (during `Gun.create`), normalized after. */
  opt: GunOptions;
  /** The in-memory graph. */
  graph: GunGraph;
  on: On<RootEvents>;
  ask: Ask;
  dup: Dup;
  /** `1` after creation, then the id counter for chains, reads and writes. Unset during the first `opt` event. */
  once: number;
  /** Chains (soul chains) by soul. */
  next?: Dict<ChainMeta>;
  /** During a synchronous `out` pass: what already passed (`ChainMeta`) or was seen (`1`). */
  pass?: Dict<AnyMeta | 1>;
  /** Writes in progress (put.js stun). */
  stun?: StunHost;
  /** The callback list of the put batch in progress. */
  hatch?: Hatch;
  // Discriminants: `if(at.back)` narrows `AnyMeta` to `ChainMeta`.
  id?: undefined;
  back?: undefined;
  get?: undefined;
  soul?: undefined;
  has?: undefined;
  link?: undefined;
}

/** Any chain meta. Narrow with `if(at.back)`. */
export type AnyMeta = ChainMeta | RootMeta;

// ---------------------------------------------------------------------------
// Stun: reads wait for writes in progress (put.js, get.js)
// ---------------------------------------------------------------------------

/** Passed down the stun listeners of a chain id to learn about writes in progress. */
export interface StunTest {
  /** The `run` (id) of the earliest write in progress. */
  run?: number;
  /** That write's stun listener. */
  stun?: OntoListener<StunTest>;
}

/** Stun events: `'stun'` and every chain id. */
export interface StunEvents {
  [id: string]: StunTest;
}

/** `root.stun = {on: Gun.on}`. */
export interface StunHost extends OntoHost {
  on: On<StunEvents>;
}

// ---------------------------------------------------------------------------
// Reads (get.js, on.js)
// ---------------------------------------------------------------------------

/**
 * The listener `.get(fn)` installs in `cat.any` (get.js `any`); it is also the
 * `eve` callbacks receive.
 */
export interface GetListener {
  /** chain.js calls it with `msg` only; `eve` and `f` are passed again when a stunned or hatched call is replayed. */
  (msg: ChainMsg, eve?: GetListener, f?: 0 | 1): void;
  at: AnyMeta;
  off(): void;
  rid: Rid;
  /** Its run id (`opt.run` or `++root.once`). */
  id: number;
  /** Set by `off()`. */
  stun?: 1;
  seen?: Dict<true>;
  /** Never set: `rid` falls back to `this.on` (a dead fallback). */
  on?: undefined;
}

/** Stop listening (on soul/key chains), or remember a linked chain was seen. Only installed on `GetListener`s. */
export type Rid = (this: GetListener, at?: ChainMsg | Chain | AnyMeta) => true | void;

/** What `rid` walks down to an id: a message (`.$`), then a chain (`._`), then a meta (`.id`). */
export interface RidAt {
  $?: RidAt;
  _?: RidAt;
  id?: number;
}

/** A `.get(key, cb)` callback when the key is invalid: `this` is the error chain, the argument its `{err}`. */
export type GetErrCb = (this: Chain, err?: ErrAck) => void;

/** `.get(fn, {on: 1})` / `.on(fn)`: `this` is the chain. */
export type OnCb = (this: Chain, data: ChainData | undefined, key: string | undefined, msg: ChainMsg, eve: GetListener) => void;

/** `.get(fn, {v2020: 1})`. */
export type V2020Cb = (msg: ChainMsg, eve: GetListener) => void;

/** `.get(key, fn)` / `.get(fn)` (2019 style): a copy of the message with `put` set to the data; `this` is `opt.as`. */
export type GetCb = (this: unknown, msg: ChainMsg, eve: GetListener) => void;

/** Any `.get(fn)` callback; which one depends on the flags of `GetOpt`. */
export type GetOk = OnCb | V2020Cb | GetCb;

/** `.get(fn, true)`: called with the soul of the chain (or link), as soon as it is known. */
export type SoulCb = (soul: Soul | boolean | undefined, as: unknown, msg: ChainMsg | AnyMeta, eve?: GetListener) => void;

/** The options of `.get(fn, opt)`. Mutated: `at` and `ok` are filled in. */
export interface GetOpt {
  at?: AnyMeta;
  ok?: GetOk;
  /** Call `ok` as an `OnCb`. */
  on?: 1 | true;
  /** Call `ok` as a `V2020Cb`. */
  v2020?: 1;
  /** Do not call back for missing data. Only its truthiness counts: lib/not.js passes its callback here. */
  not?: 1 | ((...args: never[]) => unknown);
  change?: boolean;
  /** `this` of a `GetCb`. */
  as?: unknown;
  /** Run id (a write resolving its souls). */
  run?: number;
  /** The message to send out (default `{get: {}}`). */
  out?: Msg;
  /** Only compared with `undefined`: disables stun / hatch waiting. */
  stun?: unknown;
  hatch?: unknown;
}

/** The LEX hook `.get(lex)` delegates to (map.js); `lex` is what `.get()` got that is not a key, a link or a callback. */
export type GetNext = (gun: Chain, lex: Lex) => Chain | undefined;

/** `.once(cb)`. */
export type OnceCb = (this: Chain, data: ChainData | undefined, key: string | undefined) => void;

export interface OnceOpt {
  /** How long to wait for more data (default 99ms). */
  wait?: number;
}

/** `.map(cb)`: return `undefined` to skip, the data, a chain, or a new value. */
export type MapCb = (this: Chain, data: ChainData | undefined, key: string | undefined, msg: ChainMsg, eve: GetListener) => unknown;

// ---------------------------------------------------------------------------
// Writes (put.js)
// ---------------------------------------------------------------------------

/** The user's put options, sent with the batch as `msg.opt`. SEA adds `cert`. */
export interface PutOpt {
  /** The id of the out message (and so of its acks). */
  '#'?: MsgId;
}

/** `.put(data, cb)` ack callback; `this` is the put context. */
export type PutCb = (this: PutAs, ack: Msg, eve?: OntoListener<Msg>) => void;

/** `.set(item, cb)` ack callback: a `PutCb`, except for the error ack when the item chain has no soul, which gets `this` the set's chain. */
export type SetCb = (this: PutAs | Chain, ack: Msg, eve?: OntoListener<Msg>) => void;

/** Deferred data: `.put(function(go){ go(data) })`. */
export type PutThunk = (go: (data: unknown) => void) => void;

/** One object of the tree being written. */
export interface PutFrame {
  /** The data. */
  it: unknown;
  /** The chain it is written to. */
  ref?: Chain;
  /** Keys still to walk (sorted, reversed). */
  todo?: string[];
  /** The node being built. */
  node?: GunNode;
  /** The link that will point to it, filled in once its soul is known. */
  link?: Partial<Link>;
  path?: string[];
  up?: PutFrame;
  /** Children waiting for this frame's soul. */
  wait?: Thunk[];
}

/** The work list of a write. */
export interface PutTodo extends Array<PutFrame> {
  path?: string[];
}

/**
 * `.put(data, cb, as)`'s third argument: the user's options, turned into the
 * write's context (and passed again through the recursive `.put()` calls).
 */
export interface PutAs {
  // --- user options
  opt?: PutOpt;
  /** How many acks to wait for (default 1). */
  acks?: number;
  ok?: number;
  /** Write to this soul. `false`: none given. */
  soul?: Soul | false;
  state?: HamState;
  /** The ack callback. A string when `cb` was a soul (upstream quirk: it is then called and throws). */
  ack?: PutCb | Soul;
  /** set.js: the item being added. */
  item?: unknown;
  // --- context
  root?: RootMeta;
  /** A snapshot of `root.once`: when this write started. */
  run?: number;
  /** This write's stun listener. */
  stun?: OntoListener<StunTest>;
  /** The chain `.put()` was called on (then walked up to a soul). */
  via?: Chain;
  data?: unknown;
  /** The soul chain written to. */
  $?: Chain<ChainMeta>;
  todo?: PutTodo;
  turn?: (f: Thunk) => void;
  ran?: (as: PutRun) => void;
  seen?: PutFrame[];
  /** Frames waiting for their soul, by index. */
  wait?: Dict<''>;
  /** The graph being written. */
  graph?: GunGraph;
  err?: string;
  end?: 1;
  out?: GunGraph | ErrAck;
}

/** The write context once `Gun.chain.put` has set `root` and `run` (put.js lines 6-7). What `stun` sees. */
export interface PutStun extends PutAs {
  root: RootMeta;
  run: number;
}

/** The write context once `via` is set too (put.js line 10). What `get` sees. */
export interface PutCtx extends PutStun {
  via: Chain;
}

/** The write context while walking the data, from put.js line 16 on. What `ran` and `ran.err` see. */
export interface PutRun extends PutCtx {
  $: Chain<ChainMeta>;
  todo: PutTodo;
  turn: (f: Thunk) => void;
  ran: (as: PutRun) => void;
  stun: OntoListener<StunTest>;
}

// ---------------------------------------------------------------------------
// The chain (`Gun.chain`, every `gun.get(...)`)
// ---------------------------------------------------------------------------

/** `.back(...)`. */
export interface ChainBack {
  /** The root. */
  (this: Chain, n: -1): Chain<RootMeta>;
  /** `n` levels up (default 1, the root for `-1` / `Infinity`, itself on the root). */
  (this: Chain, n?: number): Chain;
  (this: Chain, path: 'opt.uuid'): Uuid;
  (this: Chain, path: 'nix' | 'user'): Chain | undefined;
  /** The first non `undefined` result of `fn` on this meta and its ancestors. */
  <R, O = undefined>(this: Chain, fn: (at: AnyMeta, opt: O) => R | undefined, opt?: O): R | undefined;
  /** A dotted path of meta fields, looked up on this meta and then its ancestors. With `opt`, the chain where it was found. */
  (this: Chain, path: string | string[], opt?: unknown): unknown;
}

/** `.get(...)`. */
export interface ChainGet {
  /** A child chain by key (a number is stringified, a link or LEX goes through `get.next`). `cb` is a 2019 style callback, `as` its `GetOpt`. */
  (this: Chain, key: string | number | Lex, cb?: GetCb, as?: GetOpt): Chain<ChainMeta>;
  /** The soul of this chain, as soon as it is known. */
  <C extends Chain>(this: C, cb: SoulCb, soul: true, as?: unknown): C;
  <C extends Chain>(this: C, cb: OnCb, opt: GetOpt & { on: 1 | true }): C;
  <C extends Chain>(this: C, cb: V2020Cb, opt: GetOpt & { v2020: 1 }): C;
  <C extends Chain>(this: C, cb: GetCb, opt?: GetOpt): C;
  <C extends Chain>(this: C, cb: GetOk, opt?: GetOpt): C;
  next?: GetNext;
}

/** The events of a chain meta: `RootEvents` on a root, `ChainEvents` otherwise (both, for a plain `Chain`). */
export type EventsOf<M extends AnyMeta> = M extends RootMeta ? RootEvents : ChainEvents;

/** `.on(...)`. */
export interface ChainOn {
  /**
   * Peek: the first listener of `tag` on this meta (not the chain!). A falsy
   * `data` peeks too (`if(!arg){ return cat.on(tag) }`), so `.on(tag, 0)` does
   * not emit; a falsy value whose type is not a falsy literal (a `number`
   * that is `0` at runtime) still matches the emit overload below.
   */
  (this: Chain, tag: string, data?: null | false | 0 | ''): OntoNode | undefined;
  /** Listen to an event of this meta (`EventsOf`); the listener's `as` is `eas` (default: the meta). If `eas.$`, the listener goes to `eas.subs`. */
  <C extends Chain, K extends keyof EventsOf<C['_']> & string, A = AnyMeta>(this: C, tag: K, cb: OntoCallback<EventsOf<C['_']>[K], A>, eas?: A, as?: unknown): C;
  <C extends Chain, T = unknown, A = AnyMeta>(this: C, tag: string, cb: OntoCallback<T, A>, eas?: A, as?: unknown): C;
  /** Emit on this meta (truthy `data` only, see the peek overload). */
  <C extends Chain>(this: C, tag: string, data: {}): C;
  /** Subscribe to the data: `true` means `{change: true}`. */
  <C extends Chain>(this: C, cb: OnCb, opt?: true | GetOpt): C;
}

/** `.once(...)`. */
export interface ChainOnce {
  <C extends Chain>(this: C, cb: OnceCb, opt?: OnceOpt): C;
  /** Without a callback: a chain that gets the data once (experimental). */
  (this: Chain, cb?: null | false, opt?: OnceOpt): Chain<ChainMeta>;
}

/** `new (gun.constructor)(gun)` in `.chain()`: a bare instance whose meta `chain()` then fills. */
export interface ChainConstructor {
  new (o: Chain): Chain<ChainMeta>;
}

/**
 * A chain instance (`Gun()`, `gun.get('a')`). `M` is the type of its meta:
 * `Chain<RootMeta>` for roots. Plugins and SEA add methods by augmenting this
 * interface.
 */
export interface Chain<M extends AnyMeta = AnyMeta> {
  /** The meta (`at`, `cat`). */
  _: M;
  constructor: ChainConstructor;
  /** `JSON.stringify(gun)` is `undefined`. */
  toJSON(): void;
  /** Set options (peers are merged). */
  opt<C extends Chain>(this: C, opt?: GunOptionsInput): C;
  /** A new child chain (of the same constructor as `sub` or this). */
  chain(sub?: Chain): Chain<ChainMeta>;
  back: ChainBack;
  get: ChainGet;
  /**
   * Write `data` (a value, a link, a chain, or a tree of plain objects; any other
   * data is reported as an error ack) or a `PutThunk`. `cb` may be a soul to
   * write to. `as` is mutated into the write's context.
   */
  put<C extends Chain>(this: C, data: unknown, cb?: PutCb | Soul, as?: PutAs): C;
  on: ChainOn;
  once: ChainOnce;
  /** Unsubscribe. `undefined` on the root. */
  off<C extends Chain>(this: C): C | undefined;
  /** Every child (filtered by `lex`, or transformed by `cb`). */
  map(cb?: MapCb | Lex, opt?: unknown, t?: unknown): Chain<ChainMeta>;
  /** Add an item to a set. Returns `item` if it is a chain, else the item's chain. */
  set(item: unknown, cb?: SetCb, opt?: PutAs): Chain;
}

// ---------------------------------------------------------------------------
// Book (book.js, `setTimeout.Book`)
// ---------------------------------------------------------------------------

/** What a book stores. */
export type BookValue = string | number | boolean | null;

/** Pages, entries and raw strings all sort by `substring()` (duck typed). */
export interface BookSortable {
  substring(i?: number, j?: number): string;
  toString(): string;
}

/** A parsed entry. */
export interface BookEntry extends BookSortable {
  word: string;
  is: BookValue | undefined;
  page: BookPage;
  /** Cached `toString()`. */
  text?: string;
}

/** A page of a book. */
export interface BookPage extends BookSortable {
  /** Raw `|a|b|` text until parsed, then its entries (and raw strings). */
  from?: string | Array<BookEntry | string>;
  /** The first word (or what `book.parse` made of it). */
  first?: string | BookSortable;
  /** Approximate size; `-1` while unparsed. */
  size: number;
  /** Inserts not sorted in yet; `null` after. */
  limbo?: BookEntry[] | null;
  /** Cached `toString()`. */
  text?: string;
  book: Book;
  /** The book itself: `page.get(word)`. */
  get: Book;
  read<R = BookValue | undefined>(this: BookPage, each?: (is: BookValue | undefined, word: string, page: BookPage) => R): R[];
}

/** A book: a sorted, paged dictionary. Call it to read (`b(word)`) or write (`b(word, is)`). */
export interface Book {
  (word: string, is?: undefined): BookValue | undefined;
  (word: string, is: BookValue): Book;
  /** The pages (strings until first visited). */
  list: Array<BookPage | string>;
  page(this: Book, word: string): BookPage;
  set(this: Book, word: string, is: BookValue): Book;
  /** Accepts an entry too (upstream quirk: it then looks it up by its text). */
  get(this: Book, word: string | BookEntry | undefined): BookValue | undefined;
  all: Dict<BookEntry>;
  /** User hook: how to read a raw page entry. */
  parse?: (t: BookPage | BookEntry | string | undefined) => BookSortable | string | undefined;
  /** User hook: a page was split. */
  split?: (next: BookPage, prev: BookPage) => void;
  /** Page size of this book (default 4096). */
  PAGE?: number;
}

/** `setTimeout.Book`. */
export interface BookFactory {
  (text?: string): Book;
  slot(t?: string): string[];
  encode(d: unknown, s?: string, u?: string): string | undefined;
  decode(t: unknown, s?: string): BookValue | undefined;
  hash(s: unknown, c?: number): number | undefined;
}

// ---------------------------------------------------------------------------
// Gun (root.js)
// ---------------------------------------------------------------------------

/** `Gun.log.once(w, s)`: log `s` the first time `w` is seen. Also the counts by `w` (missing until seen). */
export interface LogOnce {
  (w: string, s?: string, o?: LogOnce): number | string;
  [w: string]: number | undefined;
}

/** `Gun.log(...)`: `console.log` unless `off`; returns the arguments joined. */
export interface GunLog {
  (...args: unknown[]): string;
  off?: boolean;
  once: LogOnce;
}

/** The `Gun` constructor and its statics. SEA and plugins add statics by augmenting it. */
export interface GunStatic extends OntoHost {
  /** A bare instance for `.chain()` (only with `new`). */
  new (o: Chain): Chain<ChainMeta>;
  new (opt?: GunOptionsInput): Chain<RootMeta>;
  (opt?: GunOptionsInput): Chain<RootMeta>;
  prototype: Chain;
  /** The prototype of every chain; methods are added here. */
  chain: Chain;
  /** A chain instance (or something that walks like one: `$._.$ === $`)? */
  is($: unknown): $ is Chain;
  version: number;
  valid: Valid;
  state: StateFn;
  on: GunOn;
  dup: DupFactory;
  ask: Ask;
  /** Set up a root meta. */
  create(at: RootMeta): Chain<RootMeta>;
  log: GunLog;
  /** The browser window, when there is one. */
  window?: Window & typeof globalThis;
  /** websocket.js. */
  Mesh: MeshFactory;
  /** Set by tests. */
  TESTING?: boolean;
}

// ---------------------------------------------------------------------------
// The deprecated utilities (deprecated.js, appended to gun.js; lib/utils.js)
// ---------------------------------------------------------------------------

/** A callback of the deprecated utilities. Called with various `this` and arguments. */
export type DepFunc = Bivariant<(...args: unknown[]) => unknown>;

/** The `t` passed to `Gun.obj.map` callbacks: `t(k)` collects keys, `t(k, v)` pairs, into `t.r`. */
export interface DepMapT {
  (k: string | number, v?: unknown): void;
  r?: Dict<unknown> | (string | number)[];
}

/** A `Gun.obj.map` callback, as a method so that it is checked bivariantly (a callback may take `k: string` for an object typed `unknown`). */
interface DepMapCb<This, V, K> {
  cb(this: This, v: V, k: K, t: DepMapT): unknown;
}

/** The overloads of `DepMap`, as methods so that implementations are checked bivariantly. */
interface DepMapSignatures {
  /** A list: `c(v, i, t)` with the 1-based (`Gun.list.index`) position `i`. */
  map<T, This = unknown>(l: readonly T[] | null | undefined, c: DepMapCb<This, T, number>['cb'], _?: This): unknown;
  /** An object: `c(v, k, t)` on its own keys. */
  map<T, This = unknown>(l: Dict<T> | null | undefined, c: DepMapCb<This, T, string>['cb'], _?: This): unknown;
  /** Either: `k` is a position or a key. */
  map<T, This = unknown>(l: Dict<T> | readonly T[] | null | undefined, c: DepMapCb<This, T, string | number>['cb'], _?: This): unknown;
  /** Anything else (what `obj.ify` returned...): objects and strings are iterated. */
  map<This = unknown>(l: unknown, c: DepMapCb<This, unknown, string | number>['cb'], _?: This): unknown;
}

/**
 * `Gun.obj.map(l, c, _)` (and `Gun.list.map`): call `c` (with `this` = `_`) on
 * each item of the list or object `l` until it returns something, which is
 * returned; else `t.r`. When `c` is not a function, the key (or position) of
 * the value `c` is returned instead.
 */
export type DepMap = DepMapSignatures['map'];

export interface DepText {
  is(t: unknown): t is string;
  /** `t` itself if it is a string, else its JSON (`undefined` for `undefined`), or `t.toString()` without `JSON`. */
  ify(t: unknown): unknown;
  random(l?: number, c?: string): string;
  match(t: unknown, o?: string | LexMatch): boolean;
  hash(s: unknown, c?: number): number | undefined;
}

export interface DepList {
  is(l: unknown): l is unknown[];
  slit: typeof Array.prototype.slice;
  /** A sort function comparing the `k` of items (falsy items, and missing keys, compare equal). */
  sort(k: string): Bivariant<(A: unknown, B: unknown) => number>;
  map: DepMap;
  /** 1: `map` reports list positions 1-based. */
  index: number;
}

export interface DepObj {
  is(o: unknown): o is Dict<unknown>;
  put<T extends object | null | undefined>(o: T, k: string, v: unknown): T;
  /** `o && hasOwnProperty(o, k)`: a falsy `o` is returned as it is. */
  has: { (o: unknown, k: PropertyKey): unknown; _?: string };
  del(o: Dict<unknown> | null | undefined, k: string): Dict<unknown> | undefined;
  as(o: Dict<unknown>, k: string, v?: unknown, u?: undefined): unknown;
  /** `JSON.parse` a string (`{}` when it fails), objects as they are. */
  ify(o: unknown): unknown;
  /** Copy the keys of `from` that `to` does not have yet. */
  to(from: unknown, to?: Dict<unknown>): Dict<unknown>;
  copy<T>(o: T): T;
  /** No keys (except `n`, a key or an object of keys)? */
  empty(o: unknown, n?: unknown): boolean;
  map: DepMap;
}

export interface DepTime {
  /** Now, in ms. */
  is(): number;
  /** `t instanceof Date`, or now (in ms) when `t` is falsy. */
  is(t: unknown): boolean | number;
}

export interface DepLink {
  _: '#';
  /** The soul of a link, `false` if `v` is not one. */
  is(v: unknown): Soul | false;
  /** `{'#': t}`. */
  ify<T>(t: T): { '#': T };
}

export interface DepVal {
  /** `true` for a valid scalar, the soul for a link, else `false`. */
  is(v: unknown): boolean | Soul;
  link: DepLink;
  rel: DepLink;
}

/** A node (or anything with a meta) as the deprecated utilities see it. */
export interface DepNodeLike {
  _?: Dict<unknown>;
  [k: string]: unknown;
}

/** `this` of `Node.is`'s per key check. */
export interface DepNodeIsAt {
  as?: unknown;
  cb?: DepFunc | null;
  s: string;
  n: Dict<unknown>;
}

/** The options of `Node.ify`. */
export interface DepNodeIfyOpt {
  soul?: string;
  map?: DepFunc;
  node?: DepNodeLike;
}

/** `Gun.node.soul(n, o)`: `n && n._ && n._[o || '#']`, the soul in the meta of a node. */
export interface DepNodeSoul {
  (n: object | undefined, o?: string): Soul | undefined;
  /** Anything else: falsy values are returned as they are. */
  (n: unknown, o?: string): unknown;
  /** Put a soul (`o`, `o.soul`, the existing one or a random one) on `n`, creating it and its meta if needed. */
  ify(n?: DepNodeLike | null, o?: string | { soul?: string }): DepNodeLike;
  _: '#';
}

export interface DepNode {
  _: '_';
  /** Set to the bare function, then `ify` and `_` are added. */
  get soul(): DepNodeSoul;
  set soul(v: DepNodeSoul | ((n: DepNodeLike | null | undefined, o?: string) => unknown));
  /** Is `n` a node (an object with a soul and valid values)? Calls `cb(v, k, n, soul)` on each key but `_`. */
  is<This = unknown>(n: unknown, cb?: ((this: This, v: GunValue, k: string, n: GunNode, s: Soul) => unknown) | null, as?: This): boolean;
  /** A node from a shallow object: `o` is its soul, a `map(v, k, node)` of its values, or both. */
  ify(obj: unknown, o?: string | DepFunc | DepNodeIfyOpt, as?: unknown): DepNodeLike;
}

/** `Graph.ify`'s environment (also a function: then it is its own `map`). */
export interface DepGraphEnv {
  soul?: string;
  map?: DepFunc;
  invalid?: DepFunc;
  shell?: unknown;
  graph?: Dict<unknown>;
  seen?: DepGraphAt[];
  as?: unknown;
  root?: DepNodeLike;
  err?: string;
}

/** A node being built by `Graph.ify`. */
export interface DepGraphAt {
  path: string[];
  obj: unknown;
  env?: DepGraphEnv;
  soul?: (this: DepGraphAt, id: string) => void;
  link?: Dict<unknown>;
  node?: DepNodeLike;
}

/** `nf`, the per node callback of `Graph.is`, remembers its node and `as`: `nf(fn)` calls `fn` on each key of the node. */
export interface DepNf {
  (fn?: DepFunc): void;
  n?: unknown;
  as?: unknown;
}

export interface DepGraph {
  /**
   * Is `g` a graph (an object of valid nodes by soul)? Calls `cb(node, soul, nf)`
   * on each node and `fn(v, k, node, soul)` on each key of each node.
   */
  is<This = unknown>(
    g: unknown,
    cb?: ((this: This, n: GunNode, s: Soul, nf: DepNf) => unknown) | null,
    fn?: ((this: This, v: GunValue, k: string, n: GunNode, s: Soul) => unknown) | null,
    as?: This,
  ): boolean;
  ify(obj: unknown, env?: string | DepGraphEnv | (DepFunc & DepGraphEnv), as?: string | { shell?: unknown }): Dict<unknown>;
  /** `{[soul]: node}`, `undefined` without a soul. */
  node<N extends object>(node: N | undefined): Dict<N> | undefined;
  to(graph: Dict<unknown> | undefined, root: string, opt?: { seen: Dict<unknown> }): Dict<unknown> | undefined;
}

/** What `State.map(cb, s, as)` accepts as `cb` and `s`: a callback, an object to stamp, or a state. */
export type DepStateMapArg = DepFunc | Dict<unknown> | number | null | undefined;

export interface DepState {
  lex(): string;
  /** Copy key `k` (value and state) of `from` onto `to` (a new node by default). */
  to(from: GunNode | DepNodeLike | undefined, k: string, to?: NodeLike): GunNode;
  map(cb?: DepStateMapArg, s?: DepStateMapArg, as?: unknown): Dict<unknown> | ((this: unknown, v: unknown, k: string, o: Dict<unknown>, opt?: unknown) => unknown);
}

/**
 * The deprecated utilities src/deprecated.ts (appended to gun.js) and
 * lib/utils.js install on `Gun` where `Gun` is a global (browsers): under Node
 * they are missing. Each one logs a deprecation warning. Modules that use them
 * type `Gun` as `GunStatic & Pick<GunDeprecated, ...>`.
 */
export interface GunDeprecated {
  fn: { is(fn: unknown): fn is DepFunc };
  bi: { is(b: unknown): boolean };
  /** Numbers and numeric strings (not lists). */
  num: { is(n: unknown): boolean };
  text: DepText;
  list: DepList;
  /** Set to `Type.boj || {is}`, then filled. */
  get obj(): DepObj;
  set obj(v: DepObj | { is(o: unknown): boolean });
  /** Read (but never written) by upstream's `Type.obj = Type.boj || ...` typo. */
  boj?: DepObj;
  time: DepTime;
  val: DepVal;
  node: DepNode;
  graph: DepGraph;
  state: StateFn & DepState;
}

// ---------------------------------------------------------------------------
// Globals the core installs or relies on
// ---------------------------------------------------------------------------

/**
 * The callback of `JSON.parseAsync`. The value is whatever the text held: cast
 * the callback (`function(err, msg?: Msg){...} as JsonParseCb`) where the code
 * decides to trust it.
 */
export type JsonParseCb = (err?: unknown, value?: unknown, extra?: unknown) => void;

/** `JSON.parseAsync` (lib/yson.js) and the core's fallback. The value is not checked. */
export type JsonParseAsync = (
  text: string,
  cb: JsonParseCb,
  reviver?: ((this: unknown, key: string, value: unknown) => unknown) | null,
) => void;

/** `JSON.stringifyAsync` (lib/yson.js) and the core's fallback. */
export type JsonStringifyAsync = (
  value: unknown,
  cb: (err?: unknown, text?: string, extra?: unknown) => void,
  replacer?: ((this: unknown, key: string, value: unknown) => unknown) | null,
  space?: string | number,
) => void;

/** `console.STAT` (lib/stats.js): a stats sink and counters. */
export interface ConsoleStat {
  (...args: unknown[]): void;
  has?: number;
  peers?: number;
}

/** `console.only(i, s)`: log only the `i`th time. */
export interface ConsoleOnly {
  (i: unknown, s?: unknown): unknown;
  i?: number;
}

/** `setTimeout.turn`: run functions in turns, a few per tick. */
export interface Turn {
  (f: Thunk): void;
  /** The queue. */
  s: Thunk[];
}

/**
 * `setTimeout.each`: call `f` on the items of `l` (which is emptied), `S`
 * (default 9) per turn, then `e` with the first non `undefined` result of `f`
 * (which stops the loop).
 */
export interface Each {
  <T>(l: T[] | null | undefined, f: (item: T) => unknown, e?: ((r: unknown) => void) | 0 | false | null, S?: number): void;
  /** No items: a no-op (shim.js calls it once like this when it installs it). */
  (): void;
}

declare global {
  interface StringConstructor {
    /** A random string of `l` (default 24) characters of `c`. */
    random(l?: number, c?: string): string;
    /** Does `t` match the LEX `o` (a string means exact)? `false` for non strings. */
    match(t: unknown, o?: string | LexMatch): boolean;
    /** A 32 bit string hash, `undefined` for non strings. */
    hash(s: unknown, c?: number): number | undefined;
  }
  interface ObjectConstructor {
    /**
     * Any object whose toString tag is `Object`: plain objects, `Object.create(null)`
     * and class instances; not arrays, dates or functions.
     */
    plain(o: unknown): o is Dict<unknown>;
    /** No own keys (except those in `n`)? */
    empty(o: unknown, n?: string[]): boolean;
  }
  // The scheduling utilities shim.js hangs on `setTimeout`.
  namespace setTimeout {
    /** ms a `poll` may run synchronously before yielding. */
    var hold: number;
    /** A clock (`performance` or `Date`). */
    var check: { now(): number };
    /** Run `f` now, or soon if we have been busy too long. */
    var poll: (f: Thunk) => void;
    var turn: Turn;
    var each: Each;
    var Book: BookFactory;
  }
  interface JSON {
    parseAsync?: JsonParseAsync;
    stringifyAsync?: JsonStringifyAsync;
  }
  interface Console {
    STAT?: ConsoleStat;
    /** Set once the "more than 10K live GETs" warning was shown. */
    SUBS?: string;
    only?: ConsoleOnly;
  }
  interface Window {
    Gun?: GunStatic;
    GUN?: GunStatic;
    webkitWebSocket?: WebSocketCtor;
    mozWebSocket?: WebSocketCtor;
  }
  /** The bundle's `module` (gun.js / sea.js header: `if(typeof module !== "undefined"){ var MODULE = module }`). */
  var MODULE: NodeJS.Module | undefined;
  namespace NodeJS {
    interface Require {
      /**
       * Inside the bundles, a second argument marks a host module
       * (`require('crypto', 1)`), which build.mts leaves as a real `require`.
       * The result is not checked: cast it where it is used
       * (`require('crypto', 1) as typeof import('crypto')`).
       */
      (id: string, host: 1): unknown;
    }
  }
}
