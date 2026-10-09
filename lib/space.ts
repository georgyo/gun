;(function(){
	var Gun: SpaceGun = (typeof window !== "undefined")? window.Gun : require('../gun');
	var ify = Gun.node.ify, empty: { rank?: undefined; get?: undefined; put?: undefined } = {}, u: undefined;
	console.log("Index space is beta, API may change!");
	Gun.chain.space = function(this: Chain, key: string, data: SpaceCb | SpaceData, opt?: SpaceAck | SpaceOpt): Chain | void{
		if(data instanceof Function){
			return travel(key, data, opt as SpaceOpt | undefined, this);
		}
		var gun = this;
		if(Gun.is(data)){
			data.get(function(soul){
				if(!soul){
					return cb && cb({err: "Indexspace cannot link `undefined`!"});
				}
				gun.space(key, Gun.val.link.ify(soul), opt);
			}, true);
			return gun;
		}
		var cb = (opt instanceof Function && opt), rank = (opt||empty).rank || opt, root = gun.back(-1), tmp: undefined;
		gun.get(function(soul){
			if(!soul){
				soul = (gun.back('opt.uuid') || Gun.text.random)(9);
			}
      /*var space = ify({}, soul), sub = space, l = 0, tmp;
      var atom = Gun.text.ify({get: key, put: data});
      Gun.list.map(index(0, key.length), function(i){
          sub[(tmp = key.slice(l, i))+'"'] = atom;
          sub = sub[tmp] = ify({}, soul+'"'+key.slice(0,i));
          l = i;
      });
      tmp = {}; tmp[key] = atom.put; tmp = ify(tmp, soul+'"');
      sub[key.slice(l, key.length)] = tmp;
      console.log('????', space);*/
			var shell: Dict<Dict<unknown>> = {}, l = 0, tmp: Dict<unknown>;
			var atom = Gun.text.ify({get: key, put: data});
			tmp = {}; tmp[key] = data;
			shell.$ = ify(tmp, soul as /* or true: the data is a primitive */ Soul);
			tmp = {}; tmp[key.slice(0,l = 1)] = atom;
			shell[0] = ify(tmp, soul+'"');
			Gun.list.map(index(1, key.length), function(i: number){
				tmp = {}; tmp[key.slice(l,i)] = atom;
				shell[i] = ify(tmp, soul+'"'+key.slice(0,l));
				l = i;
			});
			tmp = {}; tmp[key.slice(l, key.length)] = atom;
			shell[l+1] = ify(tmp, soul+'"'+key.slice(0,l));
			//tmp = {}; tmp[key.slice(l, key.length)] = Gun.val.link.ify(soul); shell[l+1] = ify(tmp, soul+'"'+key.slice(0,l));
			//console.log('???', shell);
			gun.put(shell, cb as /* or false: none */ SpaceAck, {soul: soul as Soul, shell: shell});
		},true);
		return gun;
	} as Space
	function travel(key: string, cb: SpaceCb, opt: SpaceOpt | undefined, ref: Chain){
		var root = ref.back(-1), tmp: undefined;
		opt = opt || {};
		opt.ack = opt.ack || {};
		ref.get(function(soul){
			ref.get(key).get(function(msg, eve){
				eve.off();
				opt.exact = true;
				opt.ack!.key = key;
				opt.ack!.data = msg.put;
				if(opt.match){ cb(opt.ack!, key, msg, eve) }
			});
			//if(u !== msg.put){
			//	cb(msg.put, msg.get, msg, eve);
			//	return;
			//}
			opt.soul = soul;
			opt.start = soul+'"';
			opt.key = key;
			opt.top = index(0, opt.find);
			opt.low = opt.top.reverse();
			find(opt as /* filled in above */ SpaceState, cb, root);
		}, true);
	}
	function find(o: SpaceState, cb: SpaceCb, root: Chain<RootMeta>){
		var id = o.start+o.key.slice(0,o.low[0]);
		root.get(id).get(function(msg, eve){
			eve.off();
			o.ack.tree = {};
			if(u === msg.put){
				if(!o.exact){ return o.match = true }
				cb(o.ack, id, msg, eve);
				return;
				o.low = o.low.slice(1);
				if(!o.low.length){
					cb(u, o.key, msg, eve);
					return;
				}
				find(o, cb, root);
				return;
			}
			Gun.node.is(msg.put, function(v,k: string | Partial<SpaceAtom>){
				if(!(k = Gun.obj.ify(v) as Partial<SpaceAtom> || empty).get){ return }
				o.ack.tree![k.get!] = k.put;
			});
			if(!o.exact){ return o.match = true }
			cb(o.ack, id, msg, eve);
		});
	}
	function index(n: number, m: number | undefined, l?: number[], k?: number): number[]{
		l = l || [];
		if(!m){ return l }
	  k = Math.ceil((n||1) / 10);
	  if((n+k) >= m){ return l }
	  l.push(n + k);
	  return index(n + k, m, l);
	}
}());

/*
gun.user('google').space('martti', "testing 123!");
gun.user('google').get('search').space('ma', function(){
	// tree & index
	// UNFINISHED API!
});
*/


/** What `.space(key, data)` indexes: a value, a node, or a chain (linked). */
type SpaceData = Chain | GunValue | Dict<unknown> | undefined;

/** `.space(key, data, cb)`: the ack of the write. */
interface SpaceAck {
	(ack: Msg | ErrAck): void;
	/** Read as an option (`opt.rank`): a callback has none. */
	rank?: undefined;
}

/** An entry of the index (stored as JSON). */
interface SpaceAtom {
	get: string;
	put: unknown;
}

/** What `.space(key, cb)` calls back with: the exact match, and the index entries of the prefix. */
interface SpaceFound {
	key?: string;
	data?: ChainMsg['put'];
	tree?: Dict<unknown>;
}

/** `.space(key, cb)`. */
type SpaceCb = (ack: SpaceFound | undefined, key: string | undefined, msg: ChainMsg, eve: GetListener) => void;

/** The options of `.space()`, filled in with the state of a search. */
interface SpaceOpt {
	/** Not used yet. */
	rank?: unknown;
	/** How long a prefix to search. */
	find?: number;
	ack?: SpaceFound;
	exact?: boolean;
	match?: boolean;
	soul?: Soul | boolean;
	start?: string;
	key?: string;
	top?: number[];
	low?: number[];
}

/** The state of a search, once `travel` filled it in. */
interface SpaceState extends SpaceOpt {
	ack: SpaceFound;
	start: string;
	key: string;
	top: number[];
	low: number[];
}

/** `gun.space(...)`: an index of words by prefix (beta). */
interface Space {
	/** Search. Returns nothing. */
	(this: Chain, key: string, cb: SpaceCb, opt?: SpaceOpt): void;
	/** Index `data` under `key`. */
	(this: Chain, key: string, data: SpaceData, opt?: SpaceAck | SpaceOpt): Chain;
	(this: Chain, key: string, data: SpaceCb | SpaceData, opt?: SpaceAck | SpaceOpt): Chain | void;
}

/** `Gun` with the deprecated utilities (src/deprecated.ts) lib/space.js uses. */
type SpaceGun = GunStatic & Pick<GunDeprecated, 'node' | 'val' | 'text' | 'obj' | 'list'>;

declare module '../src/types' {
	interface Chain {
		/** lib/space.js. */
		space: Space;
	}
	interface PutAs {
		/** lib/space.js passes the tree it writes (legacy, unused). */
		shell?: unknown;
	}
}

import type { Chain, ChainMsg, Dict, ErrAck, GetListener, GunDeprecated, GunValue, GunStatic, Msg, RootMeta, Soul } from '../src/types';
