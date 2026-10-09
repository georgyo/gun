import type { Chain, ChainMeta, ChainMsg, ChainPut, Dict, GetNext, GunStatic, Lex, LexMatch, MapCb, OntoListener, Soul } from './types';
var Gun: GunStatic = require('./root'), next: GetNext | undefined = Gun.chain.get.next;
Gun.chain.get.next = function(gun, lex){ var tmp: Soul | LexMatch | ChainMeta | undefined;
	if(!Object.plain(lex)){ return (next||noop)(gun, lex) }
	if(tmp = (((tmp = lex['#'] as Lex['#'])||'') as LexMatch)['='] || tmp){ return gun.get(tmp) }
	(tmp = gun.chain()._).lex = lex; // LEX!
	gun.on('in', function(eve){
		if(String.match(eve.get|| ((eve.put||'') as ChainPut)['.'], lex['.'] as LexKey || lex['#'] || lex)){
			(tmp as ChainMeta).on('in', eve as /* on a root (`root.get({'#': {...}})`) this forwards root messages as they are */ ChainMsg);
		}
		this.to.next(eve);
	});
	return tmp.$;
}
Gun.chain.map = function(this: Chain, cb?: MapCb | Lex, opt?: unknown, t?: unknown): Chain<ChainMeta>{
	var gun = this, cat = gun._, lex: Lex | undefined, chain: Chain<ChainMeta> | undefined;
	if(Object.plain(cb)){ lex = cb['.']? cb : {'.': cb}; cb = u }
	if(!cb){
		if(chain = cat.each){ return chain }
		(cat.each = chain = gun.chain())._.lex = lex || chain._.lex || cat.lex;
		chain._.nix = gun.back('nix');
		gun.on('in', map, chain._);
		return chain;
	}
	Gun.log.once("mapfn", "Map functions are experimental, their behavior and API may change moving forward. Please play with it and report bugs and ideas on how to improve it.");
	chain = gun.chain();
	gun.map().on(function(data, key, msg, eve){
		var next = (cb as MapCb||noop).call(this, data, key, msg, eve);
		if(u === next){ return }
		if(data === next){ return chain!._.on('in', msg) }
		if(Gun.is(next)){ return chain!._.on('in', next._) }
		var tmp: Dict<unknown> = {}; Object.keys(msg.put as ChainPut).forEach(function(k){ tmp[k] = (msg.put as Dict<unknown>)[k] }, tmp); tmp['='] = next; 
		chain!._.on('in', {get: key, put: tmp as ChainPut});
	});
	return chain;
}
function map(this: OntoListener<ChainMsg, ChainMeta>, msg: ChainMsg){ this.to.next(msg);
	var cat = this.as, gun = msg.$!, at = gun._, put = msg.put, tmp: Lex | undefined;
	if(!at.soul && !msg.$$){ return } // this line took hundreds of tries to figure out. It only works if core checks to filter out above chains during link tho. This says "only bother to map on a node" for this layer of the chain. If something is not a node, map should not work.
	if((tmp = cat.lex) && !String.match(msg.get|| ((put||'') as ChainPut)['.'], tmp['.'] as LexKey || tmp['#'] || tmp)){ return }
	Gun.on.link(msg, cat);
}
var noop = function(): undefined {}, event = {stun: noop, off: noop}, u: undefined;
	
type LexKey = /* `lex['.']` as `String.match` takes it (`true` only comes from get.js' `soul()`, never from a map's LEX). */ string | LexMatch | undefined;
