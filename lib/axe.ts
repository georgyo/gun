// I don't quite know where this should go yet, so putting it here
// what will probably wind up happening is that minimal AXE logic added to end of gun.js
// and then rest of AXE logic (here) will be moved back to gun/axe.js
// but for now... I gotta rush this out!
var Gun: GunStatic = (typeof window !== "undefined")? window.Gun : require('../gun'), u: undefined;
Gun.on('opt', function(at){ start(at); this.to.next(at) }); // make sure to call the "next" middleware adapter.
// TODO: BUG: panic test/panic/1 & test/panic/3 fail when AXE is on.
function start(root: RootMeta){
	if(root.axe){ return }
	var opt = root.opt, peers = opt.peers;
	if(false === opt.axe){ return }
	if((typeof process !== "undefined") && 'false' === ''+(opt.env=process.env||'').AXE){ return }
	Gun.log.once("AXE", "AXE relay enabled!");
	var axe = root.axe = {} as Axe, tmp: undefined, id: undefined;
	var mesh = opt.mesh = opt.mesh || Gun.Mesh(root); // DAM!
	var dup = root.dup;

	mesh.way = function(msg){
		if(!msg){ return }
		//relayUp(msg); // TEMPORARY!!!
		if(msg.get){ return GET(msg) }
		if(msg.put){ return }
		fall(msg);
	}

	function GET(msg: Msg){
		if(!msg){ return }
		var via = (msg._||'' as AxeNone<'via'>).via, soul: undefined, has: undefined, tmp: undefined, ref;
		if(!via || !via.id){ return fall(msg) }
		// SUBSCRIPTION LOGIC MOVED TO GET'S ACK REPLY.
		if(!(ref = REF(msg)._)){ return fall(msg) }
		ref.asked = +new Date;
		GET.turn(msg, ref.route, 0);
	}
	GET.turn = function(msg: Msg, route: AxeMap<Peer> | undefined, turn: number){
		var tmp: MsgId | number | undefined = msg['#'], tag = dup.s[tmp as string], next; 
		if(!tmp || !tag){ return } // message timed out, GUN may require us to relay, tho AXE does not like that. Rethink?
		// TOOD: BUG! Handle edge case where live updates occur while these turn hashes are being checked (they'll never be consistent), but we don't want to degrade to O(N), if we know the via asking peer got an update, then we should do something like cancel these turns asking for data.
		// Ideas: Save a random seed that sorts the route, store it and the index. // Or indexing on lowest latency is probably better.
		clearTimeout(tag.lack);
		if(tag.ack && (tmp = tag['##']) && msg['##'] === tmp){ return } // hashes match, stop asking other peers!
		next = (Object.maps(route||opt.peers)).slice(turn = turn || 0);
		if(!next.length){
			if(!route){ return } // asked all peers, stop asking!
			GET.turn(msg, u, 0); // asked all subs, now now ask any peers. (not always the best idea, but stays )
			return;
		}
		setTimeout.each(next, function(id){
			var peer = opt.peers[id]; turn++;
			if(!peer || !peer.wire){ route && route.delete(id); return } // bye! // TODO: CHECK IF 0 OTHER PEERS & UNSUBSCRIBE
			if(mesh.say(msg, peer) === false){ return } // was self
			if(0 == (turn % 3)){ return 1 }
		}, function(){
			tag!['##'] = msg['##']; // should probably set this in a more clever manner, do live `in` checks ++ --, etc. but being lazy for now. // TODO: Yes, see `in` TODO, currently this might match against only in-mem cause no other peers reply, which is "fine", but could cause a false positive.
			tag!.lack = setTimeout(function(){ GET.turn(msg, route, turn) }, 25);
		}, 3);
	}
	function fall(msg: Msg){ mesh.say(msg, opt.peers) }
	function REF(msg: Msg){
		var ref: Chain | ('' & AxeNone<'_'>) = '', soul, has, tmp: string | true | LexMatch | AxeMap<1> | undefined;
		if(!msg || !msg.get){ return ref }
		if('string' == typeof (soul = msg.get['#'])){ ref = root.$.get(soul) }
		if('string' == typeof (tmp = msg.get['.'])){ has = tmp } else { has = '' }

		var via = (msg._||'' as AxeNone<'via'>).via!, sub = (via.sub || (via.sub = new Object.Map)); (sub.get(soul) || (sub.set(soul, tmp = new Object.Map) && tmp)).set(has, 1); // {soul: {'':1, has: 1}} // TEMPORARILY REVERT AXE TOWER TYING TO SUBSCRIBING TO EVERYTHING. UNDO THIS!
		via.id && ref._ && (ref._.route || (ref._.route = new Object.Map)).set(via.id, via); // SAME AS ^

		return ref;
	}
	function LEX(lex?: LexMatch | AxeLexKey){ return (lex = lex || '' as AxeLexKey)['='] || lex['*'] || lex['>'] || lex }
	
	root.on('in', function(msg){ var to = this.to, tmp;
		if((tmp = msg['@']) && (tmp = dup.s[tmp as string])){
			tmp.ack = (tmp.ack || 0) + 1; // count remote ACKs to GET. // TODO: If mismatch, should trigger next asks.
			if(tmp.it && tmp.it.get && msg.put){ // WHEN SEEING A PUT REPLY TO A GET...
				var get = tmp.it.get||'', ref = REF(tmp.it)._, via: Peer | '' = (tmp.it._||'' as AxeNone<'via'>).via||'', sub: AxeSubs | AxeMap<1>;
				if(via && ref){ // SUBSCRIBE THE PEER WHO ASKED VIA FOR IT:
					//console.log("SUBSCRIBING", Object.maps(ref.route||''), "to", LEX(get['#']));
					via.id && (ref.route || (ref.route = new Object.Map)).set(via.id, via);
					sub = (via.sub || (via.sub = new Object.Map));
					ref && (sub.get(LEX(get['#'])) || (sub.set(LEX(get['#']), sub = new Object.Map as AxeMap<1>) && sub)).set(LEX(get['.']), 1); // {soul: {'':1, has: 1}}

					via = (msg._||'' as AxeNone<'via'>).via||'';
					if(via){ // BIDIRECTIONAL SUBSCRIBE: REPLIER IS NOW SUBSCRIBED. DO WE WANT THIS?
						via.id && (ref.route || (ref.route = new Object.Map)).set(via.id, via);
						sub = (via.sub || (via.sub = new Object.Map));
						if(ref){
							var soul = LEX(get['#']), sift = sub.get(soul), has = LEX(get['.']);
							if(has){
								(sift || (sub.set(soul, sift = new Object.Map) && sift)).set(has, 1);
							} else
							if(!sift){
								sub.set(soul, sift = new Object.Map);
								sift.set('', 1);
							}
						}
					}
				}
			}
			if((tmp = tmp.back)){ // backtrack OKs since AXE splits PUTs up.
				setTimeout.each(Object.keys(tmp), function(id){
					to.next({'#': msg['#'], '@': id, ok: msg.ok});
				});
				return;
			}
		}
		to.next(msg);
	});

	root.on('create', function(root){
		this.to.next(root);
		var Q = {};
		root.on('put', function(msg){
			var eve = this, at = eve.as, put = msg.put, soul = put['#'], has = put['.'], val = put[':'], state = put['>'], q: undefined, tmp: undefined;
			eve.to.next(msg);
			if(msg['@']){ return } // acks send existing data, not updates, so no need to resend to others.
			if(!soul || !has){ return }
			var ref = root.$.get(soul)._, route = (ref||'').route;
			if(!route){ return }
			if(ref.skip && ref.skip.has == has){ ref.skip.now = msg['#']; return }
			(ref.skip = {now: msg['#'], has: has} as AxeSkip).to = setTimeout(function(){
			setTimeout.each(Object.maps(route!), function(pid){ var peer: Peer | undefined, tmp;
				var skip = ref.skip||'' as AxeNone<'now'>; ref.skip = null;
				if(!(peer = route!.get(pid))){ return }
				if(!peer.wire){ route!.delete(pid); return } // bye!
				var sub = (peer.sub || (peer.sub = new Object.Map)).get(soul);
				if(!sub){ return }
				if(!sub.get(has) && !sub.get('')){ return }
				var put = peer.put || (peer.put = {});
				var node = root.graph[soul], tmp;
				if(node && u !== (tmp = node[has])){
					state = state_is(node, has)!;
					val = tmp as GunValue;
				}
				put[soul] = state_ify(put[soul], has, state, val, soul);
				tmp = dup.track(peer.next = peer.next || String.random(9));
				(tmp.back || (tmp.back = {}))[''+(skip.now||msg['#'])] = 1;
				if(peer.to){ return }
				peer.to = setTimeout(function(){ flush(peer!) }, opt.gap);
			}) }, 9);
		});
	});

	function flush(peer: Peer){
		var msg = {'#': peer.next!, put: peer.put!, ok: {'@': 3, '/': mesh.near}}; // BUG: TODO: sub count!
		// TODO: what about DAM's >< dedup? Current thinking is, don't use it, however, you could store first msg# & latest msg#, and if here... latest === first then likely it is the same >< thing, so if(firstMsg['><'][peer.id]){ return } don't send.
		peer.next = peer.put = peer.to = null;
		mesh.say(msg, peer);
	}
	var state_ify = Gun.state.ify, state_is = Gun.state.is;

	function relayUp(msg: Msg){
		mesh.say(msg, axe.up);
	}

	;(function(){ // THIS IS THE UP MODULE;
		axe.up = {};
		var hi = mesh.hear['?'] as AxeHi; // lower-level integration with DAM! This is abnormal but helps performance.
		mesh.hear['?'] = function(msg, peer){ var p; // deduplicate unnecessary connections:
			hi(msg, peer);
			if(!peer.pid){ return }
			if(peer.pid === opt.pid){ mesh.bye(peer); return } // if I connected to myself, drop.
			if(p = axe.up[peer.pid]){ // if we both connected to each other...
				if(p === peer){ return } // do nothing if no conflict,
				if(opt.pid! > peer.pid){ // else deterministically sort
					p = peer; // so we will wind up choosing the same to keep
					peer = axe.up[p.pid!]!; // and the same to drop.
				}
				p.url = p.url || peer.url; // copy if not
				mesh.bye(peer); // drop
				axe.up[p.pid!] = p; // update same to be same.
				return;
			}
			if(!peer.url){ return }
			axe.up[peer.pid] = peer;
			if(axe.stay){ axe.stay() }
		};

		mesh.hear['opt'] = function(msg, peer){
			if(msg.ok){ return }
			var tmp: AxeOptMsg['opt'] | AxeOptPeers | undefined = msg.opt;
			if(!tmp){ return }
			tmp = tmp.peers;
			if(!tmp || 'string' != typeof tmp){ return }
			if(99 <= Object.keys(axe.up).length){ return } // 99 TEMPORARILY UNTIL BENCHMARKED!
			mesh.hi({id: tmp, url: tmp, retry: 9});
			if(peer){ mesh.say({dam: 'opt', ok: 1, '@': msg['#']}, peer) }
		}

		axe.stay = function(){
			clearTimeout(axe.stay.to);
			axe.stay.to = setTimeout(function(tmp?: StatsStay, urls?: Dict<{}>){
				if(!(tmp = root.stats && root.stats.stay)){ return }
				urls = {}; Object.keys(axe.up||'').forEach(function(p: string | Peer){
					p = (axe.up||'')[p as string]!; if(p.url){ urls[p.url] = {} }
				});
				(tmp.axe = tmp.axe || {}).up = urls;
			}, 1000 * 9);//1000 * 60);
		};
		setTimeout(function(tmp?: AxeStay | Dict<{}> | string[]){
			if(!(tmp = root.stats && root.stats.stay && root.stats.stay.axe)){ return }
			if(!(tmp = tmp.up)){ return }
			if(!(tmp instanceof Array)){ tmp = Object.keys(tmp) }
			setTimeout.each(tmp||[], function(url){ mesh.hear.opt!({opt: {peers: url}}) });
		},1000);
	}());

	setTimeout(function(){ require('./service')(root) },9);

	;(function(){ // THIS IS THE MOB MODULE;
		//return; // WORK IN PROGRESS, TEST FINALIZED, NEED TO MAKE STABLE.
		/*
			AXE should have a couple of threshold items...
			let's pretend there is a variable max peers connected
			mob = 10000
			if we get more peers than that...
			we should start sending those peers a remote command
			that they should connect to this or that other peer
			and then once they (or before they do?) drop them from us.
			sake of the test... gonna set that peer number to 1.
			The mob threshold might be determined by other factors,
			like how much RAM or CPU stress we have.
		*/
		opt.mob = opt.mob || parseFloat((opt.env||'' as AxeEnv).MOB as string) || 999999; // should be based on ulimit, some clouds as low as 10K. (`parseFloat` stringifies a missing MOB.)

		// handle rebalancing a mob of peers:
		root.on('hi', function(peer){
			this.to.next(peer);
			if(peer.url){ return } // I am assuming that if we are wanting to make an outbound connection to them, that we don't ever want to drop them unless our actual config settings change.
			var count = /*Object.keys(opt.peers).length ||*/ mesh.near; // TODO: BUG! This is slow, use .near, but near is buggy right now, fix in DAM.
			//console.log("are we mobbed?", opt.mob, Object.keys(opt.peers).length, mesh.near);
			if(opt.mob! >= count){ return }  // TODO: Make dynamic based on RAM/CPU also. Or possibly even weird stuff like opt.mob / axe.up length?
			var peers: Dict<{}> = {};Object.keys(axe.up).forEach(function(p: string | Peer){ p = axe.up[p as string]!; p.url && (peers[p.url]={}) });
			// TODO: BUG!!! Infinite reconnection loop happens if not enough relays, or if some are missing. For instance, :8766 says to connect to :8767 which then says to connect to :8766. To not DDoS when system overload, figure clever way to tell peers to retry later, that network does not have enough capacity?
			mesh.say({dam: 'mob', mob: count, peers: peers}, peer);
			setTimeout(function(){ mesh.bye(peer) }, 9); // something with better perf?
		});
		root.on('bye', function(peer){
			this.to.next(peer);
		});

	}());

	;(function(){ // THIS IS THE UNIVERSAL NOTIFICATION MODULE
		var to: Dict<AxeWho> = {}, key: Dict<AxeWho> = {}, email: AxeEmail = require('./email');
		if(email.err){ return }
		mesh.hear['tag'] = function(msg, peer, who){
			if(who = key[msg.key as string]){ who.rate = Math.max(msg.rate||1000*60*15, 1000*60); return }
			if(!msg.src || !msg.email){ return }
			if(+new Date < peer.emailed! + 1000*60*2){ mesh.say({dam:'tag',err:'too fast'},peer); return } // peer can only send notifications > 2min
			var src; try{ src = new URL(msg.src = msg.src.split(/\s/)[0]); } catch(e){ return } // throws if invalid URL.
			(who = (to[msg.email] = to[msg.email] || {go:{}})).go[''+src] = 1; // we're keeping in-memory for now, maybe will "stay" to disk in future.
			peer.emailed = +new Date;
			if(who.batch){ return }
			key[who.key = Math.random().toString(36).slice(2)] = who;
			who.batch = setTimeout(function(){
				email.send({
					from: process.env.EMAIL,
					to: msg.email!,
					subject: "Notification:",
					text: 'Someone or a bot tagged you at: (⚠️ only click link if you recognize & trust it ⚠️)\n'+
						'[use #'+who.key+' to unsubscribe please mute this thread by tapping the top most "⋮" button and clicking mute]\n\n' +
						Object.keys(who.go).join('\n'), // TODO: NEEDS TO BE CPU SCHEDULED
					headers: {'message-id': '<123456789.8765@example.com>'} // hardcode id so all batches also group into the same email thread to reduce clutter.
				}, function(err, r){
					who.batch = null; who.go = {};
					err && console.log("email TAG:", err);
				});
			}, who.rate || (1000*60*60*24)); // default to 1 day
		};
	}());
};

;(function(){
	var from = Array.from as typeof Array.from | undefined;
	Object.maps = function(o){
		if(from && o instanceof Map){ return from(o.keys()) }
		if(o instanceof Object.Map){ o = o.s! }
		return Object.keys(o);
	}
	if(from){ return Object.Map = Map }
	(Object.Map = function(){ this.s = {} }).prototype = {set:function(this: AxeMapShim, k: string, v: unknown){this.s[k]=v;return this},get:function(this: AxeMapShim, k: string){return this.s[k]},delete:function(this: AxeMapShim, k: string){delete this.s[k]}};
}());

/** `(x || '').y`: `''` has none of the keys `K`. */
type AxeNone<K extends string> = { [P in K]?: undefined };

/** The environment variables lib/axe.js reads. */
interface AxeEnv {
	/** `'false'` disables AXE. */
	AXE?: string;
	/** How many peers a relay takes before it sends new ones elsewhere. */
	MOB?: string;
}

/** A key of a LEX query (a soul or a key; `true`: "just the soul"). Keys have no `=`, `*` nor `>`, which is how `LEX` tells them from matches. */
type AxeLexKey = (string | true) & { '='?: undefined; '*'?: undefined; '>'?: undefined };

/** What lib/axe.js needs of a `Map` (`Object.Map`: `Map`, or a shim where there is none). */
interface AxeMap<V> {
	get(k: unknown): V | undefined;
	set(k: unknown, v: V): AxeMap<V>;
	delete(k: unknown): unknown;
	/** The record of the shim. */
	s?: Dict<V>;
}
/** `Object.Map`. */
type AxeMapCtor = new <V = unknown>() => AxeMap<V>;
/** An instance of the `Object.Map` shim. */
interface AxeMapShim {
	s: Dict<unknown>;
}

/** What a peer is subscribed to: soul -> key (`''`: the whole node) -> 1. */
type AxeSubs = AxeMap<AxeMap<1>>;

/** A soul chain's update being relayed (`chain._.skip`). */
interface AxeSkip {
	/** The id of the latest message, which the relayed batch acks. */
	now?: MsgId;
	/** Its key. */
	has: string;
	to?: Timer;
}

/** `root.stats.stay.axe`: the relays to reconnect to after a restart. */
interface AxeStay {
	up?: Dict<{}> | string[];
}

/** DAM `?`, which lib/axe.js wraps (and calls without `root`). */
type AxeHi = (msg: Msg, peer: Peer, root?: RootMeta) => void;

/** DAM `tag`: email `email` when someone tags it at `src` (or, with `key`, change the `rate` of its batch). */
interface AxeTagMsg extends Msg {
	key?: string;
	rate?: number;
	src?: string;
	email?: string;
}

/** The pending notifications of an email address. */
interface AxeWho {
	/** The URLs it was tagged at. */
	go: Dict<1>;
	/** The id to change the rate with. */
	key?: string;
	/** How long to batch notifications (ms). */
	rate?: number;
	batch?: Timer | null;
}

/** `require('./email')` as lib/axe.js uses it (it also sends `headers`, which `emailjs` passes on). */
interface AxeEmail {
	err?: unknown;
	send(msg: Omit<EmailMessage, 'from'> & { from?: string; headers?: Dict<string> }, cb?: (err: unknown, msg?: unknown) => void): void;
}

declare module '../src/types' {
	interface GunOptions {
		/** `false` disables lib/axe.js. */
		axe?: boolean;
		/** lib/axe.js: `process.env`. */
		env?: AxeEnv;
		/** lib/axe.js: how many peers a relay takes before it sends new ones elsewhere. */
		mob?: number;
	}
	interface RootMeta {
		/** lib/axe.js. */
		axe?: Axe;
	}
	interface MetaBase {
		/** lib/axe.js: the peers subscribed to this soul, by id. */
		route?: AxeMap<Peer>;
		/** lib/axe.js: when a peer last asked for it. */
		asked?: number;
		/** lib/axe.js: the update being relayed to the subscribers (debounced per key). */
		skip?: AxeSkip | null;
	}
	interface DupEntry {
		/** lib/axe.js: remote acks to a GET. */
		ack?: number;
		/** lib/axe.js: the hash of the data the GET got. */
		'##'?: number;
		/** lib/axe.js: the retry timer of a GET. */
		lack?: Timer;
		/** lib/axe.js: the ids of the messages a relayed batch acks. */
		back?: Dict<1>;
	}
	interface Peer {
		/** lib/axe.js: what the peer is subscribed to. */
		sub?: AxeSubs;
		/** lib/axe.js: the id of the batch of updates being sent to it. */
		next?: string | null;
		/** lib/axe.js: the batch of updates being sent to it. */
		put?: GunGraph | null;
		/** lib/axe.js: the timer that sends the batch. */
		to?: Timer | null;
		/** lib/axe.js: when it last asked for an email notification. */
		emailed?: number;
	}
	interface Msg {
		/** lib/axe.js: DAM `mob`, how many peers the relay has. */
		mob?: number;
	}
	interface MeshHear {
		/** lib/axe.js: connect to the relay in `msg.opt.peers` (also called without a peer). */
		opt?: (msg: AxeOptMsg, peer?: Peer) => void;
		/** lib/axe.js: email notifications. Called with `root` as `who`, which it overwrites. */
		tag?: (msg: AxeTagMsg, peer: Peer, who?: RootMeta | AxeWho) => void;
	}
}

declare module './types' {
	interface StatsStay {
		/** lib/axe.js. */
		axe?: AxeStay;
	}
}

declare global {
	interface ObjectConstructor {
		/** lib/axe.js: the keys of an object, a `Map` or an `Object.Map`. */
		maps(o: object): string[];
		/** lib/axe.js: `Map`, or a shim of the parts it uses. */
		get Map(): AxeMapCtor;
		set Map(v: AxeMapCtor | ((this: AxeMapShim) => void));
	}
}

import type { Chain, Dict, GunStatic, GunValue, LexMatch, Msg, MsgId, Peer, RootMeta, Timer } from '../src/types'; import type { Axe, AxeOptMsg, AxeOptPeers, EmailMessage, StatsStay } from './types'; 
