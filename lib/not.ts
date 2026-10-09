if(typeof window !== "undefined"){
  var Gun: GunStatic = window.Gun!; // gun.js is loaded first.
} else { 
  var Gun: GunStatic = require('../gun');
}

var u: undefined;

Gun.chain.not = function<C extends Chain>(this: C, cb: NotCb, opt?: unknown, t?: unknown): C{
	return this.get(ought as /* `this` is meant to be the options (see NotOpt) */ GetCb, {not: cb});
}

function ought(this: NotOpt, at: ChainMsg, ev: GetListener){ ev.off();
	if(at.err || (u !== at.put)){ return }
	if(!this.not){ return }
	this.not.call(at.gun, at.get, function(){ console.log("Please report this bug on https://gitter.im/amark/gun and in the issues."); need.to.implement; });
}

/** Never defined: the callback lib/not.js gives to `.not()` callbacks throws a ReferenceError on purpose. */
declare var need: { to: { implement: unknown } };

/** `.not(cb)`: called with the key when the data is not found (`this`: the chain). The second argument is not implemented (it throws). */
type NotCb = (this: Chain | undefined, key: string | undefined, fail: () => void) => void;

/**
 * The options `.not()` passes to `.get()`, read back as `this` by its callback.
 * Upstream bug, kept: get.js calls the callback with `this` = `opt.as`
 * (undefined) and skips missing data when `opt.not` is set, so `cb` is never called.
 */
interface NotOpt extends GetOpt {
	not?: NotCb;
}

/** `gun.not(cb)`. */
type Not = <C extends Chain>(this: C, cb: NotCb, opt?: unknown, t?: unknown) => C;

declare module '../src/types' {
	interface Chain {
		/** lib/not.js: call back when the data is not found. */
		not: Not;
	}
	interface ChainMsg {
		/** Legacy: the chain (now `$`). Read by lib/not.js, no longer set. */
		gun?: Chain;
	}
}

import type { Chain, ChainMsg, GetCb, GetListener, GetOpt, GunStatic } from '../src/types';
