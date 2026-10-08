;(function(){
	var Gun: ForgetGun = (typeof window !== "undefined")? window.Gun : require('../gun');

	Gun.on('opt', function(root){
		once(root);
		this.to.next(root);
	});

	function once(root: RootMeta){
		if(root.once){ return }
		var forget = root.opt.forget = root.opt.forget || {};
		root.on('put', function(msg){
			Gun.graph.is(msg.put, function(node, soul){
				if(!Gun.obj.has(forget, soul)){ return }
				delete (msg.put as /* a graph in the legacy format this was written for (else graph.is does not call back) */ PutAtom & GunGraph)[soul];
			});
			this.to.next(msg);
		});
	}

}());

/** `Gun` with the deprecated utilities (src/deprecated.ts) lib/forget.js uses. */
type ForgetGun = GunStatic & Pick<GunDeprecated, 'graph' | 'obj'>;

declare module '../src/types' {
	interface GunOptions {
		/** lib/forget.js: souls (as keys) whose writes are dropped. Legacy: only applies to graph shaped `put` events. */
		forget?: Dict<unknown>;
	}
}

import type { Dict, GunDeprecated, GunGraph, GunStatic, PutAtom, RootMeta } from '../src/types';
