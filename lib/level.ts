// CAUTION: This adapter does NOT handle encoding. an encoding mechanism like the encoding-down package will need to be included
// Based on localStorage adapter in 05349a5

var Gun: FileGun   = ('undefined' !== typeof window) ? window.Gun : require('../gun');
var debug: false | LevelDebug = false;

Gun.on('opt', function(ctx) {
  var opt = ctx.opt;
  var ev  = this.to;

  if (debug) debug.emit('create');
  if (ctx.once) return ev.next(ctx);

  // Check if the given 'level' argument implements all the components we need
  // Intentionally doesn't check for levelup explicitly, to allow different handlers implementing the same api
  if (
    (!opt.level) ||
    ('object' !== typeof opt.level) ||
    ('function' !== typeof opt.level.get) ||
    ('function' !== typeof opt.level.put)
  ) {
    return;
  }

  ctx.on('put', function(msg) {
   this.to.next(msg);

    // Extract data from message
    var put   = msg.put;
    var soul  = put['#'];
    var key   = put['.'];
    var val   = put[':'];
    var state = put['>'];

    if (debug) debug.emit('put', soul, val);

    // Fetch previous version
    opt.level!.get(soul, function(err, data) {
      if (err && (err.name === 'NotFoundError')) err = undefined;
      if (debug && err) debug.emit('error', err);
      if (err) return;

      // Unclear required transformation
      data = Gun.state.ify(data, key, state, val, soul);

      // Write into storage
      opt.level!.put(soul, data, function(err) {
        if (err) return;
        if (debug) debug.emit('put', soul, val);

        // Bail if message was an ack
        if (msg['@']) return;

        // Send ack back
        ctx.on('in', {
          '@' : msg['@'],
          ok  : 0,
        });
      });
    });
  });

  ctx.on('get', function(msg) {
    this.to.next(msg);

    // Extract soul from message
    var lex = msg.get;
    if (!lex || !(soul = lex['#'])) return;
    var has = lex['.'] as /* a LexMatch is used as the key '[object Object]' and misses */ string | undefined;

    if (debug) debug.emit('get', soul);

    // Fetch data from storage
    opt.level!.get(soul as /* likewise, stringified by level */ Soul, function(err, data) {
      if (err) return;

      // Another unclear transformation
      if (data && has) {
        data = Gun.state.to(data, has);
      }

      // Emulate incoming ack
      ctx.on('in', {
        '@' : msg['#'],
        put : Gun.graph.node(data),
      });
    });
  });

});

// Export debug interface
if ('undefined' === typeof window) {
  var EventEmitter: typeof import('events').EventEmitter = require('events').EventEmitter;
  module.exports = debug = new EventEmitter();
}
/**
 * `require('gun/lib/level')` (Node only): an `EventEmitter` that reports what
 * the adapter does (`create`, `put` (soul, value), `get` (soul), `error`).
 */
type LevelDebug = import('events').EventEmitter;

/** A levelup (or compatible) error: a missing key is a `NotFoundError`. */
interface LevelError {
	name?: string;
}

/**
 * The parts of a levelup (or compatible) database lib/level.js uses
 * (`opt.level`). Values are whole nodes: the database has to encode them
 * (e.g. with encoding-down and `valueEncoding: 'json'`).
 */
interface LevelDB {
	get(key: Soul, cb: (err: LevelError | null | undefined, data?: GunNode) => void): void;
	put(key: Soul, value: GunNode, cb: (err?: LevelError | null) => void): void;
}

/** The get handler assigns `soul` without declaring it (upstream): an implicit global. */
declare var soul: Soul | LexMatch | undefined;

declare module '../src/types' {
	interface GunOptions {
		/** The database of lib/level.js. */
		level?: LevelDB;
	}
}

import type { GunDeprecated, GunNode, GunStatic, LexMatch, Soul } from '../src/types';

/** `Gun` with the deprecated utilities (src/deprecated.ts) used here: missing under Node, see lib/file.js. */
type FileGun = GunStatic & Pick<GunDeprecated, 'graph' | 'state'>;
