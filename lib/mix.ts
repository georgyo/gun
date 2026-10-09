;(function(){
	var Gun: MixGun = (typeof window !== "undefined")? window.Gun : require('../gun');
	Gun.state.node = function(node: GunNode, vertex: GunNode, opt?: { state?: HamState }){
		opt = opt || {};
		opt.state = opt.state || Gun.state();
		var now = Gun.obj.copy(vertex);
		Gun.node.is(node, function(val, key){
			var ham = Gun.HAM(opt.state!, Gun.state.is(node, key), Gun.state.is(vertex, key), val, vertex[key]);
			if(!ham.incoming){
				// if(ham.defer){}
				return;
			}
			now = Gun.state.to(node, key, now);
		});
		return now;
	}
}());

/** The legacy HAM (conflict resolution) result. */
interface MixHam {
	/** The incoming value wins. */
	incoming?: boolean;
	/** It is from the future: try again later. */
	defer?: boolean;
	current?: boolean;
	state?: boolean;
	converge?: boolean;
	err?: string;
}

/** `Gun.state.node(node, vertex, opt)`: a copy of `vertex` with the keys of `node` that win HAM merged in. */
type MixNode = (node: GunNode, vertex: GunNode, opt?: { state?: HamState }) => GunNode;

/**
 * `Gun` with the utilities lib/mix.js uses: the deprecated ones of
 * src/deprecated.ts, and `Gun.HAM`, which no longer exists (so `state.node`
 * throws on a node with keys).
 */
type MixGun = GunStatic & Pick<GunDeprecated, 'obj' | 'node' | 'state'> & {
	state: { node: MixNode };
	HAM(machineState: HamState, incomingState: HamState | undefined, currentState: HamState | undefined, incomingValue: unknown, currentValue: unknown): MixHam;
};

import type { GunDeprecated, GunNode, GunStatic, HamState } from '../src/types';
