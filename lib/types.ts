// The types the lib/ modules share. They live here, not in the modules that
// provide them, because a runtime source must not `export` anything: Bun and
// esbuild load an extensionless `require('./radix')` from a source checkout as
// lib/radix.ts, and treat a .ts file with an `export` as an ES module. This
// file is type only: scripts/build.mts emits nothing for it.

import type { Chain, ChainMeta, ChainMsg, Debug, Dict, GetListener, GunStatic, GunValue, JsonParseCb, Link, Msg, Peer, Timer } from '../src/types';
import type { IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeader, Server as HttpServer, ServerResponse } from 'http';
import type { Duplex } from 'stream';
import type { UrlWithParsedQuery } from 'url';

// ---------------------------------------------------------------------------
// axe.js
// ---------------------------------------------------------------------------

/** `root.axe`. */
export interface Axe {
	/** The relays we are connected to, by process id. */
	up: Dict<Peer>;
	/** Save the relays we are connected to (in `root.stats.stay.axe.up`), soon. */
	stay: { (): void; to?: Timer };
}

/** DAM `opt`: a relay tells us of another relay to connect to. */
export interface AxeOptMsg extends Msg {
	opt?: Msg['opt'] & { peers?: AxeOptPeers };
}

/** The peers in DAM `opt` (lib/axe.js only follows a URL). */
export type AxeOptPeers = string | string[] | Dict<Peer>;

// ---------------------------------------------------------------------------
// bye.js
// ---------------------------------------------------------------------------

/** `gun.bye()`: a chain whose `put` is sent to the peers, for them to write when we disconnect. It returns the original chain. */
export type ByeChain = Omit<Chain<ChainMeta>, 'put'> & {
	put(data: unknown): Chain;
};

// ---------------------------------------------------------------------------
// email.js
// ---------------------------------------------------------------------------

/** A message for `emailjs` (only what GUN sends). */
export interface EmailMessage {
	text: string;
	from: string;
	to: string;
	subject: string;
	attachment?: Array<{ path: string; type: string; name: string }>;
}

/** `require('gun/lib/email')`: an `emailjs` SMTP client from the `EMAIL*` environment variables, or one that always fails. */
export interface Email {
	send(msg: EmailMessage, cb?: (err: unknown, msg?: unknown) => void): void;
}

// ---------------------------------------------------------------------------
// http.js
// ---------------------------------------------------------------------------

/** Old node versions flagged sent headers with these. */
export type HttpResponse = ServerResponse & { headerSent?: boolean; _headerSent?: boolean; _headersSent?: boolean };

/** A request as lib/http.js hands it to `next`. */
export interface HttpMsg {
	url: UrlWithParsedQuery;
	method: string;
	headers: IncomingHttpHeaders;
	/** The form fields (lib/jsonp.js: the `$` query parameter). */
	body?: unknown;
}

/** A reply: sets the status and headers, then `write`s `chunk`/`write` and `end`s with `body`/`end` (non strings as JSON). */
export interface HttpReply {
	statusCode?: number;
	status?: number;
	headers?: Dict<OutgoingHttpHeader>;
	chunk?: unknown;
	write?: unknown;
	body?: unknown;
	end?: unknown;
}

/** How `next` replies. */
export type HttpReplyFn = (reply?: HttpReply | null) => void;

/** The handler lib/http.js parses requests for. Called without arguments when it does not handle the request. */
export type HttpNext = (msg?: HttpMsg, reply?: HttpReplyFn) => unknown;

/** `require('gun/lib/http')`: parse a request (and its form body) for `next`. */
export type Http = (req?: IncomingMessage | null, res?: HttpResponse | null, next?: HttpNext) => unknown;

// ---------------------------------------------------------------------------
// open.js
// ---------------------------------------------------------------------------

/** A document as `.open()` builds it: the data without its metadata, sub-documents nested (shared when linked twice). */
export interface OpenDoc {
	[key: string]: unknown;
}

/** The unsubscriber `.open()` hands to its callback: every listener of the recursion. */
export interface OpenEve {
	off(): void;
	/** The listeners by chain id. */
	s: Dict<GetListener>;
}

/** `.open(cb)`: the document (a primitive if the data is one), on every change (debounced by `opt.wait`). */
export type OpenCb = (this: Chain | undefined, doc: OpenDoc | GunValue | undefined, key: string | undefined, opt: OpenOpt, eve: OpenEve) => void;

/** The options of `.open()`: shared by the whole recursion, which fills in its state. */
export interface OpenOpt {
	/** Stop after the first callback (`.load()`). */
	off?: boolean;
	/** How many levels deep to open (default: all). */
	depth?: number;
	/** Debounce, in ms (default 9). */
	wait?: number;
	/** Keep the `_` metadata. */
	meta?: boolean;
	// --- state
	doc?: OpenDoc | GunValue;
	/** The documents by soul. */
	ids?: Dict<OpenDoc>;
	/** The callback. */
	any?: OpenCb | null;
	eve?: OpenEve;
	to?: Timer;
	/** The first message: its chain is the callback's `this`. */
	at?: ChainMsg;
	/** Its key. */
	key?: string;
}

// ---------------------------------------------------------------------------
// path.js
// ---------------------------------------------------------------------------

/** A key, a path of keys (`'a.b.c'` splits on `.`, or on `opt`), or keys. Numbers are stringified. */
export type PathField = string | number | Array<string | number> | null;

// ---------------------------------------------------------------------------
// radisk.js
// ---------------------------------------------------------------------------

/** What a store's `get` hands back: a string, or a Buffer-like that is `toString()`ed. */
export type StoreData = string | { length: number; toString(): string; [i: number]: unknown };

/** A store's `put` ack: `ok` is whatever the store says (`true`, `'s3'`...). */
export type StoreAck = (err?: unknown, ok?: unknown) => void;

/**
 * The storage interface Radisk writes its files to (`opt.store`): lib/rfs.js,
 * lib/rs3.js, lib/rindexed.js... File names are already URI encoded.
 */
export interface RadiskStore {
	put(file: string, data: string, cb: StoreAck): void;
	/** `data` is `undefined` (or empty) when the file does not exist. */
	get(file: string, cb: (err?: unknown, data?: StoreData) => void): void;
	/** Optional: call `cb(file)` for every file, then `cb()`. */
	list?(cb: (file?: string) => unknown, match?: unknown, params?: unknown, cbs?: unknown): unknown;
	/** Counters kept by lib/store.js. */
	stats?: StoreStats;
}

/** The options of `Radisk(opt)` (the root's `opt`, which it normalizes in place). */
export interface RadiskOpt {
	log?: (...args: unknown[]) => void;
	/** The directory / prefix of the files (default `'radata'`), also the key of the cached instance. */
	file?: string;
	/** Max size of a file read, and of a value (default 30% of `memory` MB, or 90MB). */
	max?: number;
	memory?: number;
	/** How long to batch writes (ms, default `wait` or 250). */
	until?: number;
	wait?: number;
	batch?: number;
	/** Split files bigger than this (default 1MB). */
	chunk?: number;
	/** `from`: the name of the first file (default `'!'`). */
	code?: { from?: string };
	/** Always set to `true`: files are JSON. */
	jsonify?: boolean;
	/** `false`: none (lib/rfs.js in a browser). */
	store?: RadiskStore | false;
	/** Called before a write with the current value: return the value to write, or `undefined` to drop it (acks `-1`). */
	compare?: (old: unknown, data: unknown, key: string, file: string) => unknown;
}

/** The ack of a write: `ok` is the store's ok (or `1`), `-1` when `compare` dropped it. Same shape as a store's ack. */
export type RadiskAck = StoreAck;

/** The options of a read, mutated and handed back as `info`. */
export interface RadiskReadOpt extends RadixMapOpt {
	/** Stop after parsing that many bytes. */
	limit?: number;
	/** Set: the `unit` of the tree that was read (see `RadixFn.unit`). */
	unit?: 0 | 1;
	/** Set: how many files were read. */
	chunks?: number;
	/** Set: how many bytes were parsed. */
	parsed?: number;
	/** Set: `1` if more files follow (another callback will come). */
	more?: 0 | 1;
	/** Set: the next file. */
	next?: string;
}

/** A read's callback, once per file: the value (or subtree) found. */
export type RadiskReadCb = (err?: unknown, data?: unknown, info?: RadiskReadOpt) => void;

/** A file in memory: a radix tree with what Radisk keeps on it. */
export interface RadiskDisk extends RadixFn {
	file?: string;
	/** Acks of the writes batched for this file; set while a write is pending. */
	Q?: RadiskAck[];
	/** Tagged acks (see `Rad`). */
	tags?: Dict<Dict<RadiskAck>>;
	to?: Timer;
	/** The text last written. */
	raw?: string;
	/** Checked for mislocated keys. */
	check?: 1;
}

/** What `parse` tells its callbacks about a file. */
export interface RadiskParseInfo {
	file?: string;
	/** Its size. */
	parsed?: number;
}

export type RadiskParseCb = (err?: unknown, disk?: RadiskDisk, info?: RadiskParseInfo) => void;

/** `r.find` callbacks get the file a key belongs in. */
export type RadiskFindCb = (file: string) => unknown;

/** `r.find.add` callback, which counts pending directory writes on itself. */
export interface RadiskFindAddCb {
	(err?: unknown, ok?: unknown): void;
	found?: number;
}

export interface RadiskFind {
	/** The file `key` belongs in (the last file whose name is not after it). */
	(key: string, cb: RadiskFindCb): void;
	/** Add a file to the directory. */
	add(file: string, cb: RadiskFindAddCb): void;
	/** Remove a (corrupt) file from the directory. */
	bad(file: string, cb?: RadiskAck): void;
}

/** `r.write`'s options; `true` means `{force: true}` (do not split). */
export interface RadiskWriteOpt {
	force?: boolean;
}

export interface RadiskWrite {
	(file: string, rad: RadiskDisk | undefined, cb: RadiskAck, o?: boolean | RadiskWriteOpt, DBG?: Debug): void;
	jsonify(f: RadiskFractal, rad: RadiskDisk, cb: RadiskAck, o: RadiskWriteOpt, DBG?: Debug): void;
}

/** The state of a write (a function used as a record). */
export interface RadiskFractal {
	(): void;
	text: string;
	file: string;
	write(): void;
	/** Write the last half of the keys to a new file, then the first half to this one. */
	split(): boolean;
	/** How many keys (`NaN` when `each` counts first: upstream quirk). */
	count: number;
	limit: number;
	/** The second half, and its first key (the new file). */
	sub: RadixFn;
	end: string;
	/** The first half. */
	hub: RadixFn;
	slice(val: unknown, key: string): true | undefined;
	stop(val: unknown, key: string): true | undefined;
	both: RadiskAck;
	each(val: unknown, key: string, k: string, pre: string[]): unknown;
}

/** What `Radisk.decode` returns: a string, a link, a number, `true`/`false`, `null`, or `undefined` if not encoded. */
export type RadiskDecoded = string | Link | number | boolean | null | undefined;

/** A Radisk instance: `Radisk(opt)`. */
export interface Rad {
	/** Read `key` (a prefix, or a range with `o.start` / `o.end`). */
	(key: string, cb: RadiskReadCb, o?: RadiskReadOpt, DBG?: Debug): void;
	/**
	 * Write `data` at `key`. Writes are batched per file (`opt.until`). With a
	 * `tag`, `cb` is only called once for all the writes of that tag.
	 */
	(key: string, data: unknown, cb?: RadiskAck | null, tag?: string | false, DBG?: Debug): void;
	save(key: string, data: unknown, cb?: RadiskAck | null, tag?: string | false, DBG?: Debug): void;
	read(key: string, cb: RadiskReadCb, o?: RadiskReadOpt, DBG?: Debug): void;
	write: RadiskWrite;
	/** The part of `tree` within `o.start` / `o.end`. */
	range(tree: unknown, o?: RadiskReadOpt): unknown;
	/** Read and parse a file (`raw`: its text, if known). */
	parse(file: string | undefined, cb: RadiskParseCb, raw?: string, DBG?: Debug): void;
	find: RadiskFind;
	/** Files in memory. */
	disk: Dict<RadiskDisk>;
	one: Dict<RadiskAck>;
	tags: Dict<Dict<RadiskAck>>;
	/** The directory (the list of files), once read. */
	list?: RadiskDisk;
}

/**
 * `require('gun/lib/radisk')`, `window.Radisk`. Instances are cached by
 * `opt.file`. Without a valid `opt.store` it logs an error (and returns what
 * `opt.log` returns).
 */
export interface RadiskStatic {
	(opt?: RadiskOpt): Rad | void;
	has?: Dict<Rad>;
	/** Encode a value of the legacy RAD format. */
	encode(d: unknown, o?: unknown, s?: string): string | undefined;
	/** Decode a value of the legacy RAD format; `o.i` is set to where it ends. */
	decode(t: string, o?: { i?: number } | null, s?: string): RadiskDecoded;
	Radix: RadixStatic;
}

// ---------------------------------------------------------------------------
// radix.js
// ---------------------------------------------------------------------------

/**
 * A node of a radix tree (`radix.$`). Each key is the next chunk of the stored
 * keys and leads to a child node (`RadixTree`), except two reserved keys: `''`
 * holds the value of the key that ends at this node, and `_` (char 24) the
 * `RadixSort` cache of `Radix.map`. Values can be anything but `undefined`, so
 * the record is `unknown`: reads of children are cast to `RadixTree`.
 */
export interface RadixTree {
	[chunk: string]: unknown;
}

/** The sorted keys of a node, cached by `Radix.map` in the node's key `_` (char 24). A function, so that `JSON.stringify` drops it. */
export interface RadixSort {
	(): RadixSort;
	sort: string[];
}

/**
 * A radix tree: `Radix()`. Call it to read (`radix(key)`) or write
 * (`radix(key, val)`). Keys are stringified. Storage adapters (lib/radisk.js)
 * add their own fields to the instances they keep.
 */
export interface RadixFn {
	/**
	 * Read: the value of `key`. If `key` has no value, the subtree of the keys
	 * that start with it (the node of `key`, or a new node of the nodes that
	 * extend it), `undefined` if there are none. A falsy `key` reads the whole
	 * tree. `t` is the node to start from (default: the root, `radix.$`).
	 */
	(key: RadixKey, val?: undefined, t?: RadixTree): unknown;
	/** Write `val` at `key` (`null` is a value). */
	(key: RadixKey, val: {} | null, t?: RadixTree): RadixFn;
	/** A read or a write. */
	(key: RadixKey, val: unknown, t?: RadixTree): unknown;
	/** The root node; created by the first write. */
	$?: RadixTree;
	/** The greatest key written. */
	last?: string;
	/** `1` when the last read found a value at a node that also has children (a "unit"), else `0`. */
	unit?: 0 | 1;
}

/** Keys are stringified (`''+key`): anything but a symbol. */
export type RadixKey = string | number | bigint | boolean | object | null | undefined;

/** `Radix.map` options. */
export interface RadixMapOpt {
	/** Also call back (with an `undefined` value) for the keys that have no value but children. */
	branch?: boolean;
	/** Descending order. */
	reverse?: boolean | number;
	/** Only the keys from `start`... */
	start?: string;
	/** ...up to `end` (inclusive). */
	end?: string;
}

/**
 * A `Radix.map` callback: the value, the whole key, the last chunk of the key
 * and the chunks before it. Returning anything but `undefined` stops the walk,
 * and `Radix.map` returns it.
 */
export type RadixEach = (val: unknown, key: string, chunk: string, pre: string[]) => unknown;

/** `Radix.object`: call `f` on the own keys of `o` until it returns something (which is returned). */
export type RadixObject = <T, R>(o: Dict<T> | T[] | null | undefined, f: (v: T, k: string) => R | undefined, r?: R) => R | undefined;

/** `require('gun/lib/radix')`, `window.Radix`. */
export interface RadixStatic {
	/** A new, empty radix tree. */
	(): RadixFn;
	/**
	 * Walk a tree (or a node) in key order, `true` for `{branch: true}`. `pre`
	 * is internal (the chunks above the node). Errors are logged, not thrown.
	 */
	map(radix: RadixFn | RadixTree | null | undefined, cb: RadixEach, opt?: true | RadixMapOpt, pre?: string[]): unknown;
	object: RadixObject;
	/** Log and break on suspicious keys. */
	debug?: boolean;
}

// ---------------------------------------------------------------------------
// radix2.js
// ---------------------------------------------------------------------------

/** An instance of radix2's tree: also caches the last node it visited. */
export interface Radix2Fn extends RadixFn {
	/** The node of the last read or write, for external access. */
	at?: RadixTree;
}

/** `require('gun/lib/radix2')`: an older `Radix` without `Radix.object`. */
export interface Radix2Static {
	(): Radix2Fn;
	map: RadixStatic['map'];
}

// ---------------------------------------------------------------------------
// rfs.js
// ---------------------------------------------------------------------------

/** The options of lib/rfs.js (the root's `opt`). */
export interface RfsOpt {
	log?: (...args: unknown[]) => void;
	/** The directory (default `'radata'`), also the key of the cached store. */
	file?: string;
}

/** A file system store for lib/radisk.js. */
export interface RfsStore extends RadiskStore {
	(): void;
	list(cb: (file?: string) => unknown, match?: unknown, params?: unknown, cbs?: unknown): void;
}

// ---------------------------------------------------------------------------
// server.js
// ---------------------------------------------------------------------------

/** `require('gun/lib/server')` (what `require('gun')` loads in node): `Gun`, with `Gun.serve` and the server plugins. */
export type GunServer = GunStatic & Required<Pick<GunStatic, 'serve'>>;

// ---------------------------------------------------------------------------
// stats.js
// ---------------------------------------------------------------------------

export interface StatsUp {
	/** When the stats were first written. */
	start?: number;
	/** How many times the process started. */
	count?: number;
	/** `process.uptime()`. */
	time?: number;
}

/** Stats kept across restarts. Plugins add their own (lib/service.js `updated`, lib/axe.js `axe`). */
export interface StatsStay {
	/** lib/service.js: when the relay last updated itself. */
	updated?: number;
	[key: string]: unknown;
}

/** `root.stats`: what lib/stats.js writes to `stats.<file>` every 5 seconds. */
export interface GunStats {
	up?: StatsUp;
	stay?: StatsStay;
	/** How long the last interval took (ms). */
	over?: number;
	memory?: Partial<NodeJS.MemoryUsage> & { totalmem?: number; freemem?: number };
	cpu?: Partial<NodeJS.CpuUsage> & { loadavg?: number[]; stack?: number };
	peers?: { count?: number; time?: number };
	node?: { count?: number };
	/** `console.STAT(start, time, name)` timings since the last write, by name. */
	all?: Dict<Array<[number, number]>>;
	/** The origins websockets connected from. */
	sites?: Dict<1>;
	/** Messages heard and said (counts and bytes). */
	dam?: { in: { count: number; done: number }; out: { count: number; done: number } };
	/** lib/store.js read and write stats. */
	rad?: StoreStats;
	/** lib/multicast.js: the ports of the peers heard nearby, by address. */
	gap?: { near?: Dict<number> };
}

// ---------------------------------------------------------------------------
// store.js
// ---------------------------------------------------------------------------

/** Timings of the last 50 operations, and a count. */
export interface StoreStat {
    time: Dict<number>;
    count: number;
    err?: unknown;
}

/** `opt.store.stats` (read by lib/stats.js). */
export interface StoreStats {
    get: StoreStat;
    put: StoreStat;
}

// ---------------------------------------------------------------------------
// wire.js
// ---------------------------------------------------------------------------

/**
 * A text frame. `ws` (v7, GUN's dependency) hands over the string; event style
 * transports a `{data}` message.
 */
export type WsMessage = string & { data?: string };

/** An error of a `ws` socket. */
export interface WsError {
	code?: string;
}

/** A socket of the `ws` package (only what GUN uses; the package is not typed here). */
export interface WsSocket {
	send(raw: string): void;
	close?(): void;
	on(ev: 'message', cb: (msg: WsMessage) => void): void;
	on(ev: 'error', cb: (e?: WsError) => void): void;
	on(ev: 'open' | 'close', cb: () => void): void;
	readyState?: number;
	OPEN?: number;
	/** lib/wire.js: the headers of the upgrade request (`''` when there were none). */
	headers?: IncomingHttpHeaders;
}

/** The `connection` event / `handleUpgrade` of a `ws` server. */
export interface WsServer {
	handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, cb: (ws: WsSocket) => void): void;
	on(ev: 'connection', cb: (wire: WsSocket) => void): void;
}

/** `require('ws')`: the client constructor, and the server. */
export interface WsModule {
	new (url: string, protocols?: string[], opt?: unknown): WsSocket;
	Server: new (opt: WsOptions) => WsServer;
}

/** `opt.ws`: the options of the `ws` server (passed to `new WebSocket.Server(ws)`), and the state of the websocket plugins. */
export interface WsOptions {
	/** The URL path of the websocket (default `/gun`). */
	path?: string;
	/** Do not attach to `opt.web`. lib/wire.js sets it to handle the upgrades itself. */
	noServer?: boolean;
	/** The `ws` server. */
	web?: WsServer;
	/** The http server (lib/ws.js, lib/uws.js). */
	server?: HttpServer;
	/** The messages waiting to be sent in a batch (lib/ws.js, lib/uws.js, lib/wsproto.js). */
	drain?: string[] | null;
	/** How many peers (lib/wsproto.js). */
	who?: number;
	/** lib/verify.js. */
	verifyClient?: (info: WsVerifyInfo, callback: (ok: boolean, code?: number, message?: string) => void) => void;
}

/** What `ws` passes to `verifyClient`. */
export interface WsVerifyInfo {
	origin: string;
	secure: boolean;
	req: IncomingMessage;
}

// ---------------------------------------------------------------------------
// ws.js
// ---------------------------------------------------------------------------

/**
 * What the legacy websocket plugins (lib/ws.js, lib/uws.js, lib/wsproto.js)
 * receive: a frame (a string, or a `{data}` event), parsed in place into a
 * message or a batch of them. What was parsed is not checked; a frame that
 * does not parse is passed on as is.
 */
export interface WsIn extends Msg {
	data?: string;
	/** lib/ws.js: the peer it came from. */
	peer?: () => Peer;
}

/** A batch of messages. */
export type WsInBatch = WsIn[] & WsIn;

/** A raw text frame. */
export type WsFrame = string & WsIn;

// ---------------------------------------------------------------------------
// yson.js
// ---------------------------------------------------------------------------

/** A container being written by `stringifyAsync`. The root (`{d: data}`) only has `d`: its `i`, `j`, `l` are `undefined`, which compares false. */
export interface YsonIfyAt {
	/** The value to write next. */
	d: unknown;
	/** The index of `d`. */
	i: number;
	/** How many values were skipped (not JSON-able). */
	j: number;
	l: number;
	/** The key of `d` (objects). */
	k?: string;
	/** The sorted keys (objects). */
	ok?: string[];
	as: Dict<unknown> | unknown[];
	up: YsonIfyAt;
}

/** The state of a `stringifyAsync`, kept between turns. */
export interface YsonIfyCtx {
	text: string;
	up: YsonIfyAt[];
	at: YsonIfyAt;
	done: (err?: unknown, text?: string) => void;
	i: number;
}

/** `require('gun/lib/yson')`, `window.YSON`: JSON that yields to the event loop. It also installs `JSON.parseAsync` and `JSON.stringifyAsync`. */
export interface Yson {
	/** Parse `M` (default 32K) characters per turn. A non string is parsed synchronously. */
	parseAsync(text: string, done: JsonParseCb, revive?: unknown, M?: number): void;
	/** Write 9 values per turn. `replacer` and `space` are ignored; `ctx` continues a text. */
	stringifyAsync(data: unknown, done: (err?: unknown, text?: string) => void, replacer?: unknown, space?: unknown, ctx?: YsonIfyCtx): void;
}
