var Gun: GunStatic = Gun! || require('../gun'); // `!`: TypeScript cannot see that this reads the global Gun (browser <script>), or the hoisted undefined (Node).
Gun.chain.open || require('./open');

Gun.chain.later = function<C extends Chain>(this: C, cb: OpenCb, age: number): C{
	var gun = this;
	age = age * 1000; // convert to milliseconds.
	setTimeout(function(){
		gun.open(cb, {off: true});
	}, age);
	return gun;
}

/** `gun.later(cb, seconds)`: `.open()` the data once, `seconds` from now. */
type Later = <C extends Chain>(this: C, cb: OpenCb, age: number) => C;

declare module '../src/types' {
	interface Chain {
		/** lib/later.js: a snapshot of the full depth of the data, later. */
		later: Later;
	}
}

import type { Chain, GunStatic } from '../src/types'; import type { OpenCb } from './types';
