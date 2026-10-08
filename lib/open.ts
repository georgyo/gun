var Gun: GunStatic = (typeof window !== "undefined")? window.Gun : require('../gun');

Gun.chain.open = function<C extends Chain>(this: C, cb?: OpenCb | null, opt?: OpenOpt, at?: OpenDoc, depth?: number): C{ // this is a recursive function, BEWARE! // (the defaults of `opt` are filled in first thing: the callbacks below run after that, hence `!`)
	depth = depth || 1;
	opt = opt || {}; // init top level options.
	opt.doc = opt.doc || {};
	opt.ids = opt.ids || {};
	opt.any = opt.any || cb;
	opt.meta = opt.meta || false;
	opt.eve = opt.eve || {off: function(){ // collect all recursive events to unsubscribe to if needed.
		Object.keys(opt.eve!.s).forEach(function(i,e: number | GetListener | undefined){ // switch to CPU scheduled setTimeout.each?
			if(e = opt.eve!.s[i]){ e.off() }
		});
		opt.eve!.s = {};
	}, s:{}}
	return this.on(function(data, key, ctx, eve){ // subscribe to 1 deeper of data!
		clearTimeout(opt.to); // do not trigger callback if bunch of changes...
		opt.to = setTimeout(function(){ // but schedule the callback to fire soon!
			if(!opt.any){ return }
			opt.any.call(opt.at!.$, opt.doc, opt.key, opt, opt.eve!); // call it.
			if(opt.off){ // check for unsubscribing.
				opt.eve!.off();
				opt.any = null;
			}
		}, opt.wait || 9);
		opt.at = opt.at || ctx; // opt.at will always be the first context it finds.
		opt.key = opt.key || key;
		opt.eve!.s[this._.id as /* the root has no id: "undefined" */ number] = eve; // collect all the events together.
		if(true === Gun.valid(data)){ // if primitive value...
			if(!at){
				opt.doc = data as GunValue;
			} else {
				at[key as /* a primitive always has a key */ string] = data;
			}
			return;
		}
		var tmp = this; // else if a sub-object, CPU schedule loop over properties to do recursion.
		setTimeout.each(Object.keys(data as /* not a primitive: a node */ GunNode), function(key, val?: unknown){
			if('_' === key && !opt.meta){ return }
			val = (data as GunNode)[key];
			var doc = at || opt.doc as /* a primitive only if the top level data was one */ OpenDoc, id; // first pass this becomes the root of open, then at is passed below, and will be the parent for each sub-document/object.
			if(!doc){ return } // if no "parent"
			if('string' !== typeof (id = Gun.valid(val))){ // if primitive...
				doc[key] = val;
				return;
			}
			if(opt.ids![id as string]){ // if we've already seen this sub-object/document
				doc[key] = opt.ids![id as string]; // link to itself, our already in-memory one, not a new copy.
				return;
			}
			if((opt.depth as /* undefined: no limit (compares false) */ number) <= depth){ // stop recursive open at max depth.
				doc[key] = doc[key] || val; // show link so app can load it if need.
				return;
			} // now open up the recursion of sub-documents!
			tmp.get(key).open(opt.any, opt, opt.ids![id as string] = doc[key] = {}, depth+1); // 3rd param is now where we are "at".
		});
	})
}

/** `gun.open(cb, opt)`. `at` and `depth` are for the recursion. */
type Open = <C extends Chain>(this: C, cb?: OpenCb | null, opt?: OpenOpt, at?: OpenDoc, depth?: number) => C;

declare module '../src/types' {
	interface Chain {
		/** lib/open.js: the full depth of the data, on every change. */
		open: Open;
	}
}

import type { Chain, ChainMsg, Dict, GetListener, GunNode, GunStatic, GunValue, Timer } from '../src/types';
import type { OpenCb, OpenDoc, OpenOpt } from './types';
