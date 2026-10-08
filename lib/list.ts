var Gun: GunStatic = Gun! || require('../gun'); // `!`: TypeScript cannot see that this reads the global Gun (browser <script>), or the hoisted undefined (Node).

Gun.chain.list = function(this: Chain, cb?: unknown, opt?: unknown): ListChain{
	opt = opt || {};
	cb = cb || function(){}; 
	var gun = this.put({}) as /* described with the legacy API it was written for */ ListChain; // insert assumes a graph node. So either create it or merge with the existing one.
	gun.last = function(obj?: unknown, cb?: PutCb){
		var last = gun.path('last');
		if(!arguments.length){ return last }
		return gun.path('last').put(null).put(obj).val(function(val){ // warning! these are not transactional! They could be.
			console.log("last is", val);
			last.path('next').put(this._.node, cb);
		});
	}
	gun.first = function(obj?: unknown, cb?: PutCb){
		var first = gun.path('first');
		if(!arguments.length){ return first }
		return gun.path('first').put(null).put(obj).val(function(){ // warning! these are not transactional! They could be.
			first.path('prev').put(this._.node, cb);
		});
	}
	return gun;
};

(function(){ // list tests
	return;
	var Gun: GunStatic & { log: GunLog & { verbose?: boolean } } = require('../index');
	var gun = Gun({file: 'data.json'});
	Gun.log.verbose = true;
	
	var list = gun.list();
	list.last({name: "Mark Nadal", type: "human", age: 23}).val(function(val){
		//console.log("oh yes?", val, '\n', this.__.graph);
	});
	list.last({name: "Timber Nadal", type: "cat", age: 3}).val(function(val){
		//console.log("oh yes?", val, '\n', this.__.graph);
	});
	list.list().last({name: "Hobbes", type: "kitten", age: 4}).val(function(val){
		//console.log("oh yes?", val, '\n', this.__.graph);
	});
	list.list().last({name: "Skid", type: "kitten", age: 2}).val(function(val){
		//console.log("oh yes?", val, '\n', this.__.graph);
	});
	setTimeout(function(){ list.val(function(val){
		console.log("the list!", list.__.graph);
		return;
		list.path('first').val(Gun.log)
			.path('next').val(Gun.log)
			.path('next').val(Gun.log);
	})}, 1000);

	return;
	gun.list().map(function(val, id){
		console.log("each!", id, val);
	})

}());

/**
 * A list (`gun.list()`), described with the legacy (0.3) chain API lib/list.js
 * was written for: `.val()`, `_.node` and `__` no longer exist, so `last` and
 * `first` throw when given an item.
 */
interface ListChain extends Chain {
	_: AnyMeta & { node?: GunNode };
	__: { graph: GunGraph };
	val(cb?: (this: ListChain, val: unknown, key?: string) => void): ListChain;
	path(this: Chain, field?: PathField, opt?: string): ListChain;
	/** The last item's chain, or append an item. */
	last(obj?: unknown, cb?: PutCb): ListChain;
	/** The first item's chain, or prepend an item. */
	first(obj?: unknown, cb?: PutCb): ListChain;
	list(this: Chain, cb?: unknown, opt?: unknown): ListChain;
}

declare module '../src/types' {
	interface Chain {
		/** lib/list.js (legacy). */
		list(this: Chain, cb?: unknown, opt?: unknown): ListChain;
	}
}

import type { AnyMeta, Chain, GunGraph, GunLog, GunNode, GunStatic, PutCb } from '../src/types'; import type { PathField } from './types';
