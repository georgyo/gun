import type { AnyMeta, Chain, ChainData, ChainGet, ChainMeta, ChainMsg, ChainPut, Dict, GetCb, GetErrCb, GetListener, GetNext, GetOk, GetOpt, GunNode, GunStatic, Hatch, Lex, NodeMeta, OnCb, OntoListener, RidAt, SoulCb, StunHost, StunTest, V2020Cb } from './types';
var Gun: GunStatic = require('./root');
Gun.chain.get = function(this: Chain, key: string | number | Lex | GetOk, cb?: GetCb | GetOpt | true, as?: GetOpt): Chain{
	var gun: Chain | ChainMeta | '' | undefined, tmp: boolean | string | GetNext | Dict<AnyMeta | 1> | undefined;
	if(typeof key === 'string'){
		if(key.length == 0) {	
			(gun = this.chain())._.err = {err: Gun.log('0 length key!', key)};
			if(cb){ (cb as GetErrCb).call(gun, gun._.err) }
			return gun;
		}
		var back = this, cat = back._;
		var next = cat.next || empty;
		if(!(gun = next[key])){
			gun = key && cache(key, back);
		}
		gun = gun && gun.$;
	} else
	if('function' == typeof key){
		if(true === cb){ return soul(this, key as SoulCb, cb, as), this }
		gun = this;
		var cat = gun._, opt = (cb || {}) as GetOpt, root = cat.root, id: string;
		opt.at = cat;
		opt.ok = key;
		var wait: Dict<1> = {}; // can we assign this to the at instead, like in once?
		//var path = []; cat.$.back(at => { at.get && path.push(at.get.slice(0,9))}); path = path.reverse().join('.');
		function any(msg: ChainMsg, eve?: GetListener, f?: 0 | 1){
			if((any as GetListener).stun){ return }
			if((tmp = root.pass) && !(tmp as Dict<AnyMeta | 1>)[id]){ return }
			var at = msg.$!._, sat = ((msg.$$||'') as Partial<Chain>)._, data: ChainData | undefined = (sat||at).put, odd = (!at.has && !at.soul), test: StunTest = {}, link: boolean, tmp: Dict<AnyMeta | 1> | ChainPut | ChainData | StunHost | Hatch | undefined;
			if(odd || u === data){ // handles non-core
				data = (u === (((tmp = msg.put)||'') as ChainPut)['='])? (u === ((tmp||'') as ChainPut)[':'])? tmp as ChainData : (tmp as ChainPut)[':'] : (tmp as ChainPut)['='];
			}
			if(link = ('string' == typeof (tmp = Gun.valid(data)))){
				data = (u === (tmp = root.$.get(tmp as string)._.put))? opt.not? u : data : tmp as ChainData;
			}
			if(opt.not && u === data){ return }
			if(u === opt.stun){
				if((tmp = root.stun) && tmp.on){
					cat.$.back(function(a){ // our chain stunned?
						(tmp as StunHost).on(''+a.id, test = {});
						if((test.run || 0) < any.id){ return test } // if there is an earlier stun on gapless parents/self.
					});
					!test.run && tmp.on(''+at.id, test = {}); // this node stunned?
					!test.run && sat && tmp.on(''+sat.id, test = {}); // linked node stunned?
					if(any.id > (test.run as /* undefined (no write in progress) compares false */ number)){
						if(!test.stun || test.stun.end){
							test.stun = tmp.on('stun') as OntoListener<StunTest> | undefined;
							test.stun = test.stun && test.stun.last;
						}
						if(test.stun && !test.stun.end){
							//if(odd && u === data){ return }
							//if(u === msg.put){ return } // "not found" acks will be found if there is stun, so ignore these.
							(test.stun.add || (test.stun.add = {}))[id] = function(){ any(msg,eve,1) } // add ourself to the stun callback list that is called at end of the write.
							return;
						}
					}
				}
				if(/*odd &&*/ u === data){ f = 0 } // if data not found, keep waiting/trying.
				/*if(f && u === data){
					cat.on('out', opt.out);
					return;
				}*/
				if((tmp = root.hatch) && !tmp.end && u === opt.hatch && !f){ // quick hack! // What's going on here? Because data is streamed, we get things one by one, but a lot of developers would rather get a callback after each batch instead, so this does that by creating a wait list per chain id that is then called at the end of the batch by the hatch code in the root put listener.
					if(wait[at.$._.id as number]){ return } wait[at.$._.id as number] = 1;
					tmp.push(function(){any(msg,eve,1)});
					return;
				}; wait = {}; // end quick hack.
			}
			// call:
			if(root.pass){ if(root.pass[id+at.id]){ return } root.pass[id+at.id] = 1 }
			if(opt.on){ (opt.ok as OnCb).call(at.$, data, at.get, msg, eve || any); return } // TODO: Also consider breaking `this` since a lot of people do `=>` these days and `.call(` has slower performance.
			if(opt.v2020){ (opt.ok as V2020Cb)(msg, eve || any); return }
			Object.keys(msg).forEach(function(k){ (tmp as Dict<unknown>)[k] = msg[k as keyof ChainMsg] }, tmp = {}); msg = tmp as ChainMsg; msg.put = data; // 2019 COMPATIBILITY! TODO: GET RID OF THIS!
			(opt.ok as GetCb).call(opt.as, msg, eve || any); // is this the right
		};
		any.at = cat;
		//(cat.any||(cat.any=function(msg){ setTimeout.each(Object.keys(cat.any||''), function(act){ (act = cat.any[act]) && act(msg) },0,99) }))[id = String.random(7)] = any; // maybe switch to this in future?
		(cat.any||(cat.any={}))[id = String.random(7)] = any;
		any.off = function(){ (any as GetListener).stun = 1; if(!cat.any){ return } delete cat.any[id] }
		any.rid = rid; // logic from old version, can we clean it up now?
		any.id = opt.run || ++root.once; // used in callback to check if we are earlier than a write. // will this ever cause an integer overflow?
		tmp = root.pass; (root.pass = {} as Dict<1>)[id] = 1; // Explanation: test trade-offs want to prevent recursion so we add/remove pass flag as it gets fulfilled to not repeat, however map map needs many pass flags - how do we reconcile?
		opt.out = opt.out || {get: {}};
		cat.on('out', opt.out);
		root.pass = tmp;
		return gun;
	} else
	if('number' == typeof key){
		return this.get(''+key, cb as GetCb, as);
	} else
	if('string' == typeof (tmp = valid(key))){
		return this.get(tmp, cb as GetCb, as);
	} else
	if(tmp = this.get.next){
		gun = tmp(this, key);
	}
	if(!gun){
		(gun = this.chain())._.err = {err: Gun.log('Invalid get request!', key)}; // CLEAN UP
		if(cb){ (cb as GetErrCb).call(gun, gun._.err) }
		return gun;
	}
	if(cb && 'function' == typeof cb){
		(gun as Chain).get(cb, as);
	}
	return gun as Chain;
} as ChainGet
function cache(key: string, back: Chain): ChainMeta{
	var cat = back._, next = cat.next, gun = back.chain(), at = gun._;
	if(!next){ next = cat.next = {} }
	next[at.get = key] = at;
	if(back === cat.root.$){
		at.soul = key;
		//at.put = {};
	} else
	if(cat.soul || cat.has){
		at.has = key;
		//if(obj_has(cat.put, key)){
			//at.put = cat.put[key];
		//}
	}
	return at;
}
function soul(gun: Chain, cb: SoulCb, opt: true, as?: unknown){
	var cat = gun._, acks = 0, tmp: string | number | Array<[SoulCb, unknown]> | null | undefined;
	if(tmp = cat.soul || cat.link){ return cb(tmp, as, cat) }
	if(cat.jam){ return cat.jam.push([cb, as]) }
	cat.jam = [[cb,as]];
	gun.get(function go(msg, eve){
		if(u === msg.put && !cat.root.opt.super && (tmp = Object.keys(cat.root.opt.peers).length) && ++acks <= tmp){ // TODO: super should not be in core code, bring AXE up into core instead to fix? // TODO: .keys( is slow
			return;
		}
		eve.rid(msg);
		var at: Chain | Partial<AnyMeta> | undefined = ((at = msg.$) && at._) || {}, i = 0, as: unknown;
		tmp = cat.jam!; delete cat.jam; // tmp = cat.jam.splice(0, 100);
		//if(tmp.length){ process.nextTick(function(){ go(msg, eve) }) }
		while(as = tmp[i++]){ //Gun.obj.map(tmp, function(as, cb){
			var cb = (as as [SoulCb, unknown])[0], id: string | boolean | undefined; as = (as as [SoulCb, unknown])[1];
			cb && cb(id = at.link || at.soul || Gun.valid(msg.put) || ((((msg.put||{}) as Partial<GunNode>)._||{}) as NodeMeta)['#'], as, msg, eve);
		} //);
	}, {out: {get: {'.':true}}});
	return gun;
}
function rid(this: GetListener, at?: ChainMsg | Chain | AnyMeta | RidAt | number): true | void{
	var cat = this.at || this.on;
	if(!at || cat.soul || cat.has){ return this.off() }
	if(!(at = (at = (at = (at as RidAt).$ || at as RidAt)._ || at).id)){ return }
	var map = cat.map, tmp: true | undefined, seen: Dict<true>;
	//if(!map || !(tmp = map[at]) || !(tmp = tmp.at)){ return }
	if(tmp = (seen = this.seen || (this.seen = {}))[at]){ return true }
	seen[at] = true;
	//tmp.echo[cat.id] = {}; // TODO: Warning: This unsubscribes ALL of this chain's listeners from this link, not just the one callback event.
	//obj.del(map, at); // TODO: Warning: This unsubscribes ALL of this chain's listeners from this link, not just the one callback event.
	return;
}
var empty: Dict<never> = {}, valid = Gun.valid, u: undefined;
	
