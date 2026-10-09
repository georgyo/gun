var Gun: GunStatic = (typeof window !== "undefined")? window.Gun : require('../gun');

Gun.chain.open || require('./open');

var _on: Bivariant<(this: Chain, a: unknown, b?: unknown, c?: unknown) => unknown> = Gun.chain.on;
Gun.chain.on = function(this: Chain, a: string | OnCb, b?: unknown, c?: unknown){
	if('value' === a){
		return this.open(b as OpenCb, c as OpenOpt);
	}
	return _on.call(this, a,b,c);
} as ChainOn

Gun.chain.bye || require('./bye');
Gun.chain.onDisconnect = Gun.chain.bye;
Gun.chain.connected = function<C extends Chain>(this: C, cb?: ConnectedCb): C{
	var root = this.back(-1), last: true | Peer | undefined;
	root.on('hi', function(peer){
		if(!cb){ return }
		cb(last = true, peer);
	});
	root.on('bye', function(peer){
		if(!cb || last === peer){ return }
		cb(false, last = peer);
	});
	return this;
}

/** `.connected(cb)`: `true` and the peer when one connects, `false` and the peer when one disconnects. */
type ConnectedCb = (connected: boolean, peer: Peer) => void;

declare module '../src/types' {
	interface ChainOn {
		/** lib/shim.js: `.on('value', cb)` is `.open(cb)`. */
		<C extends Chain>(this: C, tag: 'value', cb?: OpenCb | null, opt?: OpenOpt): C;
	}
	interface Chain {
		/** lib/shim.js: `.bye()`. */
		onDisconnect(this: Chain): ByeChain;
		/** lib/shim.js: call back when peers connect and disconnect. */
		connected<C extends Chain>(this: C, cb?: ConnectedCb): C;
	}
}

import type { Bivariant, Chain, ChainOn, GunStatic, OnCb, Peer } from '../src/types'; import type { ByeChain, OpenCb, OpenOpt } from './types'; 
