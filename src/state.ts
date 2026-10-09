import type { StateFn, StateIs, StateMap, HamState, NodeLike, GunNode, Soul, Dict } from './types';
require('./shim');
function State(): HamState{
	var t = +new Date;
	if(last < t){
		return N = 0, last = t + State.drift;
	}
	return last = t + ((N += 1) / D) + State.drift;
}
State.drift = 0;
var NI = -Infinity, N = 0, D = 999, last = NI, u: undefined; // WARNING! In the future, on machines that are D times faster than 2016AD machines, you will want to increase D by another several orders of magnitude so the processing speed never out paces the decimal resolution (increasing an integer effects the state accuracy).
State.is = function(n?: NodeLike | null, k?: string, o?: StateMap | 1): HamState | undefined { // convenience function to get the state on a key on a node and return it.
	var tmp: StateMap | HamState | undefined = (k && n && n._ && n._['>']) || o as StateMap | undefined;
	if(!tmp){ return }
	return ('number' == typeof (tmp = tmp[k as string]))? tmp : NI;
} as StateIs
State.ify = function(n?: NodeLike | null, k?: string, s?: HamState, v?: unknown, soul?: Soul): GunNode { // put a key's state on a node.
	(n = n || {})._ = n._ || {}; // safety check or init.
	if(soul){ n._!['#'] = soul } // set a soul if specified.
	var tmp = n._!['>'] || (n._!['>'] = {}); // grab the states data.
	if(u !== k && k !== '_'){
		if('number' == typeof s){ tmp[k] = s } // add the valid state.
		if(u !== v){ (n as Dict<unknown>)[k] = v } // Note: Not its job to check for valid values!
	}
	return n as GunNode;
}
module.exports = State satisfies StateFn;
	
