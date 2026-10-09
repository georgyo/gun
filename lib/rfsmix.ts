module.exports = function(opt: RfsOpt, store: RadiskStore): RadiskStore{
	var rfs: RfsStore = require('./rfs')(opt);
	var p = store.put;
	var g = store.get;
	store.put = function(file, data, cb){
		var a: boolean | undefined, b: unknown, c = function(err?: unknown, ok?: unknown){
			if(b){ return cb(err || b) }
			if(a){ return cb(err, ok) }
			a = true;
			b = err;
		}
		p(file, data, c); // parallel
		rfs.put(file, data, c); // parallel
	}
	store.get = function(file, cb){
		rfs.get(file, function(err, data){
			//console.log("rfs3 hijacked", file);
			if(data){ return cb(err, data) }
			g(file, cb);
		});
	}
	return store;
} satisfies RfsMix
/** `require('gun/lib/rfsmix')(opt, store)`: also write to (and read from first) lib/rfs.js. Returns `store`, patched. */
type RfsMix = (opt: RfsOpt, store: RadiskStore) => RadiskStore;

import type { RadiskStore, RfsOpt, RfsStore } from './types';
