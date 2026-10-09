var Gun: ByeGun = (typeof window !== "undefined")? window.Gun : require('../gun');

Gun.on('create', function(root){
	this.to.next(root);
	var mesh = root.opt.mesh;
	if(!mesh){ return }
	mesh.hear['bye'] = function(msg, peer){
		(peer.byes = peer.byes || []).push(msg.bye);
	}
	root.on('bye', function(peer){
		this.to.next(peer);
		if(!peer.byes){ return }
		var gun = root.$;
		Gun.obj.map(peer.byes, function(data){
			Gun.obj.map(data, function(put, soul){
				gun.get(soul).put(put);
			});
		});
		peer.byes = [];
	});
});

Gun.chain.bye = function(this: Chain): ByeChain{
	var gun = this, bye: ByeChain = gun.chain(), root = gun.back(-1), put = bye.put;
	bye.put = function(data){
		gun.back(function(at){
			if(!at.get){ return }
			var tmp = data;
			(data = {} as Dict<unknown>)[at.get] = tmp;
		});
		root.on('out', {bye: data});
		return gun;
	}
	return bye;
}

/** `Gun` with the deprecated utilities (src/deprecated.ts) lib/bye.js uses. */
type ByeGun = GunStatic & Pick<GunDeprecated, 'obj'>;

declare module '../src/types' {
	interface Chain {
		/** lib/bye.js: what to write when we disconnect. */
		bye(this: Chain): ByeChain;
	}
	interface MeshHear {
		/** lib/bye.js: a peer tells us what to write when it disconnects. */
		bye?: DamHandler;
	}
	interface Msg {
		/** lib/bye.js: the graph to write when the sender disconnects. */
		bye?: unknown;
	}
	interface Peer {
		/** lib/bye.js: what to write when it disconnects. */
		byes?: unknown[];
	}
}

import type { Chain, ChainMeta, Dict, GunDeprecated, GunStatic } from '../src/types';
import type { ByeChain } from './types';
