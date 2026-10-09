var Gun: GunStatic = (typeof window !== "undefined")? window.Gun : require('../gun');
Gun.chain.open || require('./open');

Gun.chain.load = function<C extends Chain>(this: C, cb?: OpenCb | null, opt?: OpenOpt, at?: OpenDoc): C{
	(opt = opt || {}).off = !0;
	return this.open(cb, opt, at);
}

/** `gun.load(cb, opt)`: `.open()` once (with `opt.off`). */
type Load = <C extends Chain>(this: C, cb?: OpenCb | null, opt?: OpenOpt, at?: OpenDoc) => C;

declare module '../src/types' {
	interface Chain {
		/** lib/load.js: the full depth of the data, once. */
		load: Load;
	}
}

import type { Chain, GunStatic } from '../src/types'; import type { OpenCb, OpenDoc, OpenOpt } from './types';
