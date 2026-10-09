;(function(){
	var Gun: TimeGun = (typeof window !== "undefined")? window.Gun : require('../gun');
	var ify = Gun.node.ify, u: undefined;
	Gun.chain.time = function(this: Chain, data: TimeCb | TimeData, a?: TimeArg, b?: TimeArg): Chain{
		if(data instanceof Function){
			return travel(data, a as TravelOpt | number | undefined, b, this);
		}
		var gun = this, root = gun.back(-1);
		var cb = (a instanceof Function && a) || (b instanceof Function && b);
		if(Gun.is(data)){
			data.get(function(soul){
				if(!soul){
					return cb && cb({err: "Timegraph cannot link `undefined`!"});
				}
				gun.time(Gun.val.link.ify(soul), a, b);
			}, true);
			return gun;
		}
		opt = (cb === a)? b as TimeOpt : a as TimeOpt; // the one that is not the callback
		opt = Gun.text.is(opt)? {key: opt} : opt || {};
		var t = new Date(Gun.state()).toISOString().split(/[\-t\:\.z]/ig);
		var p: Soul | undefined, tmp = t.pop();
		gun.get(function(soul){
			var id = soul as Soul | undefined;
			p = id;
			if(!p){ id = p = (gun.back('opt.uuid') || Gun.text.random)(9) }
			// could shrink this into a loop. Do later?
			t = [p].concat(t);
			var rid = opt.key || (gun.back('opt.uuid') || Gun.text.random)(9);
			var milli = ify({}, t.join(':'));
			milli[rid] = data;
			tmp = t.pop();
			var sec = ify({}, t.join(':'));
			sec[tmp!] = milli;
			tmp = t.pop();
			var min = ify({}, t.join(':'));
			min[tmp!] = sec;
			tmp = t.pop();
			var hour = ify({}, t.join(':'));
			hour[tmp!] = min;
			tmp = t.pop();
			var day = ify({}, t.join(':'));
			day[tmp!] = hour;
			tmp = t.pop();
			var month = ify({}, t.join(':'));
			month[tmp!] = day;
			tmp = t.pop();
			var year = ify({}, t.join(':'));
			year[tmp!] = month;
			tmp = t.pop();
			var time = ify({}, t.join(':') || id);
			time[tmp!] = year;
			gun.put(time, cb as /* or false: none */ TimeAck);
		}, true);
		return gun;
	}
	function travel(cb: TimeCb, opt: TravelOpt | number | undefined, b: unknown, gun: Chain){
		var root = gun.back(-1), tmp: undefined;
		(opt = Gun.num.is(opt)? {last: opt as number} as TravelOpt : opt as TravelOpt || {}).seen = opt.seen || {};
		var t = now(opt.start as /* still the user's start */ TimeStart);
		gun.on(function(data, key, msg, eve){
			var at = msg.$!._, id = at.link || at.soul || Gun.node.soul(data) as Soul | undefined;
			if(!id){ return }
			if(false === opt.next){ eve.off() }
			else { opt.next = true }
			opt.start = [opt.id = id].concat(t);
			opt.low = opt.low || opt.start;
			opt.top = opt.top || opt.start;
			opt.now = [id].concat(now());
			//console.log("UPDATE");
			find(opt, cb, root, opt.at? opt.now : opt.at = opt.start);
		});
		return gun;
	}
	function now(t?: TimeStart){
		return new Date(t || Gun.state()).toISOString().split(/[\-t\:\.z]/ig).slice(0,-1);
	}
	function find(o: TravelOpt, cb: TimeCb, root: Chain<RootMeta>, at: TimePath, off?: boolean){
		var at = at || o.at, t = at.join(':'), tmp: TimePath;
		if(!off){
			if(o.seen![t]){ return }
			o.seen![t] = true;
		}
		var next = (o.low || o.start as TimePath)[at.length];
		root.get(t).get(function(msg, ev){
			if(off){ ev.off() }
			var g = this;
			//console.log(at, msg.put);
			if(u === msg.put){
				find(o, cb, root, at.slice(0,-1), off);
				return;
			}
			if(7 < at.length){
				var l = Object.keys(msg.put as GunNode).length;
				if(l === o.seen![t]){ return }
				var when = +(toDate(at));
				Gun.node.is(msg.put, function(v, k){
					cb(v, k, when, ev);
					if(o.last){ --o.last }
				});
				o.seen![t] = l;
				if(!o.last){ return }
				if(o.last <= 0){ return }
				o.low = at;
				var tmp = at.slice(0,-1);
				find(o, cb, root, tmp, true);
				return;
			}
			if(o.last && false !== off){
				var keys = Object.keys(msg.put as GunNode).sort().reverse();
				var less = Gun.list.map(keys, function(k){
					if(parseFloat(k) < parseFloat(next as /* Infinity works too */ string)){ return k }
				});
				if(!less){
					find(o, cb, root, at.slice(0,-1), true);
				} else {
					var tmp = (at || o.at).slice();
					tmp.push(less as string);
					(o.low = tmp.slice() as TimePath).push(Infinity);
					find(o, cb, root, tmp, true);
				}
			}
			if(off){ return }
			if(!o.next){ return }
			if(at < (o.start as TimePath).slice(0, at.length)){ return }
			var n = [o.id].concat(now()), top = n[at.length];
			Gun.node.is(msg.put, function(v: GunValue | TimePath, k){
				if(k > top!){ return }
				(v = at.slice()).push(k);
				find(o, cb, root, v, false);
			});
		})
	}
	function toDate(at: TimePath){ // the parts are numeric strings: Date.UTC coerces them (TypeScript only takes numbers).
		at = at.slice(-7);
		return new Date(Date.UTC(at[0] as number, parseFloat(at[1] as string)-1, at[2] as number, at[3] as number, at[4] as number, at[5] as number, at[6] as number));
	}
}());

/** `.time(cb)`: each item found, with its key, when it was added (ms) and the listener. */
type TimeCb = (data: unknown, key: string, when: number, eve: GetListener) => void;

/** `.time(data, cb)`: the ack of the write (or an error if a chain to link has no soul). */
type TimeAck = (ack: Msg | ErrAck) => void;

/** What `.time()` adds: a value, a node, or a chain (linked). */
type TimeData = Chain | GunValue | Dict<unknown> | undefined;

/** The options of `.time(data)` (or the key as a string): the key of the item (default: random). */
interface TimeOpt {
	key?: string;
}

/** A date, as `new Date()` takes it. */
type TimeStart = string | number | Date;

/** A path in the timegraph: the soul, then the year, month, day, hours, minutes, seconds and ms. `Infinity` caps a lower bound. */
type TimePath = Array<string | number>;

/** The options of `.time(cb)` (or a number: `last`). Filled in with the state of the travel. */
interface TravelOpt {
	/** How many items to get, newest first. */
	last?: number;
	/** Where to start (default: now); then the path it started at. */
	start?: TimeStart | TimePath;
	/** `false`: stop listening after the first data. */
	next?: boolean;
	// --- state
	seen?: Dict<true | number>;
	id?: Soul;
	low?: TimePath;
	top?: TimePath;
	now?: TimePath;
	at?: TimePath;
}

/** Whatever `.time()` takes after the data: the callback and the options, in any order. */
type TimeArg = TimeAck | TimeOpt | TravelOpt | string | number;

/** `gun.time(...)`: a timegraph. */
interface Time {
	/** Travel: call `cb` with the items, newest first. */
	(this: Chain, cb: TimeCb, opt?: number | TravelOpt): Chain;
	/** Add `data` to the timegraph of this chain. */
	(this: Chain, data: TimeData, cb?: TimeAck, opt?: TimeOpt | string): Chain;
	(this: Chain, data: TimeData, opt?: TimeOpt | string, cb?: TimeAck): Chain;
	(this: Chain, data: TimeCb | TimeData, a?: TimeArg, b?: TimeArg): Chain;
}

/** `Gun` with the deprecated utilities (src/deprecated.ts) lib/time.js uses. */
type TimeGun = GunStatic & Pick<GunDeprecated, 'node' | 'val' | 'text' | 'num' | 'list'>;

/** Never declared upstream: `.time(data)` assigns its options to an implicit global `opt` (in sloppy mode). */
declare var opt: TimeOpt;

declare module '../src/types' {
	interface Chain {
		/** lib/time.js. */
		time: Time;
	}
}

import type { Chain, Dict, ErrAck, GetListener, GunDeprecated, GunNode, GunStatic, GunValue, Msg, RootMeta, Soul } from '../src/types';
