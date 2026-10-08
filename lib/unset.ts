var Gun: GunStatic = (typeof window !== "undefined")? window.Gun : require('../gun');

const rel_ = '#';  // '#'
const node_ = '_';  // '_'

Gun.chain.unset = function<C extends Chain>(this: C | undefined, node?: Chain | null){ // `put` is cast to a node: a primitive has no `_` (`undefined`, which ends the check).
	if( this && node && node[node_] && node[node_].put && (node[node_].put as GunNode)[node_] && (node[node_].put as GunNode)[node_][rel_] ){
		this.put( { [(node[node_].put as GunNode)[node_][rel_]!]:null} );
	}
	return this;
} as /* `this` is tested, but is always the chain of a method call */ Unset


/** `gun.unset(item)`: remove an item (its chain, with its node loaded) from a set, by putting `null` at its soul. */
type Unset = <C extends Chain>(this: C, node?: Chain | null) => C;

declare module '../src/types' {
	interface Chain {
		/** lib/unset.js. */
		unset: Unset;
	}
}

import type { Chain, GunNode, GunStatic } from '../src/types';
