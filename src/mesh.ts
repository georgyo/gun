import type { DamHandler, Debug, Dict, DupEntry, JsonParseAsync, JsonParseCb, JsonStringifyAsync, Mesh as MeshT, MeshHear, MeshOpt, MeshSay, Msg, MsgId, MsgMeta, OkAck, OntoListener, Peer, PeerArg, PeerMap, RootMeta, Thunk, Wire, ConsoleStat, AnyMeta, GunNode } from './types';
type JsonSucks = /* The JSON stringifier, with the hook that warns once when JSON blocks the CPU. */ JsonStringifyAsync & { sucks: (d: number) => void };
type PeerUrl = /* `mesh.hi(url)` (DAM `mob`): a URL string that arrives as `peer` (the implementation of `hi` is cast to `Mesh['hi']`, which takes `Peer | string`). It has no `wire`, so only the first line of `hi` sees it. */ Peer & string;
require('./shim');

var noop = function(){}
var parse: JsonParseAsync = JSON.parseAsync || function(t,cb,r){ var u: undefined, d = +new Date; try{ cb(u, JSON.parse(t,r as Exclude<typeof r, null>), json.sucks(+new Date - d)) }catch(e){ cb(e) } }
var json = (JSON.stringifyAsync || function(v,cb,r,s){ var u: undefined, d = +new Date; try{ cb(u, JSON.stringify(v,r as Exclude<typeof r, null>,s), json.sucks(+new Date - d)) }catch(e){ cb(e) } }) as JsonSucks;
json.sucks = function(d: number){ if(d > 99){ console.log("Warning: JSON blocking CPU detected. Add `gun/lib/yson.js` to fix."); json.sucks = noop } }

function Mesh(root: RootMeta): MeshT{
	var mesh = function(){} as MeshT;
	var opt = (root.opt || {}) as MeshOpt;
	opt.log = opt.log || console.log;
	opt.gap = opt.gap || opt.wait || 0;
	opt.max = opt.max || (opt.memory? (opt.memory * 999 * 999) : 300000000) * 0.3;
	opt.pack = opt.pack || (opt.max * 0.01 * 0.01);
	opt.puff = opt.puff || 9; // IDEA: do a start/end benchmark, divide ops/result.
	var puff: (f: Thunk, t: number) => void = setTimeout.turn || setTimeout;

	var dup = root.dup, dup_check = dup.check, dup_track = dup.track;

	var ST = +new Date, LT = ST;

	var hear = mesh.hear = function(this: unknown, raw: string | Msg, peer: Peer){
		if(!raw){ return }
		if(opt.max <= (raw as string).length){ return mesh.say({dam: '!', err: "Message too big!"}, peer) }
		if(mesh === this){
			/*if('string' == typeof raw){ try{
				var stat = console.STAT || {};
				//console.log('HEAR:', peer.id, (raw||'').slice(0,250), ((raw||'').length / 1024 / 1024).toFixed(4));
				
				//console.log(setTimeout.turn.s.length, 'stacks', parseFloat((-(LT - (LT = +new Date))/1000).toFixed(3)), 'sec', parseFloat(((LT-ST)/1000 / 60).toFixed(1)), 'up', stat.peers||0, 'peers', stat.has||0, 'has', stat.memhused||0, stat.memused||0, stat.memax||0, 'heap mem max');
			}catch(e){ console.log('DBG err', e) }}*/
			hear.d += (raw as string).length||0 ; ++hear.c } // STATS!
		var S = peer.SH = +new Date;
		var tmp = (raw as string)[0], msg: Msg | undefined;
		//raw && raw.slice && console.log("hear:", ((peer.wire||'').headers||'').origin, raw.length, raw.slice && raw.slice(0,50)); //tc-iamunique-tc-package-ds1
		if('[' === tmp){
			parse(raw as string, function(err?: unknown, msg?: Msg[]){
				if(err || !msg){ return mesh.say({dam: '!', err: "DAM JSON parse error."}, peer) }
				console.STAT && console.STAT(+new Date, msg.length, '# on hear batch');
				var P = opt.puff;
				(function go(){
					var S = +new Date;
					var i = 0, m: Msg | undefined; while(i < P && (m = msg![i++])){ mesh.hear(m, peer) }
					msg = msg!.slice(i); // slicing after is faster than shifting during.
					console.STAT && console.STAT(S, +new Date - S, 'hear loop');
					flush(peer); // force send all synchronously batched acks.
					if(!msg.length){ return }
					puff(go, 0);
				}());
			} as /* untrusted JSON from the wire is handled as messages, as upstream does */ JsonParseCb);
			raw = ''; // 
			return;
		}
		if('{' === tmp || (((raw as Msg)['#'] || Object.plain(raw)) && (msg = raw as Msg))){
			if(msg){ return hear.one(msg, peer, S) }
			parse(raw as string, function(err?: unknown, msg?: Msg){
				if(err || !msg){ return mesh.say({dam: '!', err: "DAM JSON parse error."}, peer) }
				hear.one(msg, peer, S);
			} as /* untrusted JSON from the wire is handled as a message, as upstream does */ JsonParseCb);
			return;
		}
	} as MeshHear;
	hear.one = function(msg: Msg, peer: Peer, S?: number){ // S here is temporary! Undo.
		var id: MsgId | undefined, hash: number | undefined, tmp, ash: string | undefined, DBG: Debug | undefined;
		if(msg.DBG){ msg.DBG = DBG = {DBG: msg.DBG} }
		DBG && (DBG.h = S);
		DBG && (DBG.hp = +new Date);
		if(!(id = msg['#'])){ id = msg['#'] = String.random(9) }
		if(tmp = dup_check(id)){ return }
		// DAM logic:
		if(!(hash = msg['##']) && false && u !== msg.put){ /*hash = msg['##'] = Type.obj.hash(msg.put)*/ } // disable hashing for now // TODO: impose warning/penalty instead (?)
		if(hash && (tmp = msg['@'] || (msg.get && id)) && dup.check(ash = (tmp as string)+hash)){ return } // Imagine A <-> B <=> (C & D), C & D reply with same ACK but have different IDs, B can use hash to dedup. Or if a GET has a hash already, we shouldn't ACK if same.
		(msg._ = function(){} as MsgMeta).via = mesh.leap = peer;
		if((tmp = msg['><']) && 'string' == typeof tmp){ tmp.slice(0,99).split(',').forEach(function(this: Dict<1>, k){ this[k] = 1 }, (msg._).yo = {}) } // Peers already sent to, do not resend.
		// DAM ^
		if(tmp = msg.dam){
			(dup_track(id)||{} as Partial<DupEntry>).via = peer;
			if(tmp = mesh.hear[tmp]){
				(tmp as /* upstream calls whatever the verb names, without a function check: {dam: 'c'} calls a number and throws */ DamHandler)(msg, peer, root);
			}
			return;
		}
		if(tmp = msg.ok){ msg._.near = (tmp as OkAck)['/'] }
		var S: number | undefined = +new Date;
		DBG && (DBG.is = S); peer.SI = id;
		dup_track.ed = function(d: MsgId | DupEntry | undefined){
			if(id !== d){ return }
			dup_track.ed = 0;
			if(!(d = dup.s[id as string])){ return }
			d.via = peer;
			if(msg.get){ d.it = msg }
		}
		root.on('in', mesh.last = msg);
		DBG && (DBG.hd = +new Date);
		console.STAT && console.STAT(S, +new Date - S, msg.get? 'msg get' : msg.put? 'msg put' : 'msg');
		dup_track(id); // in case 'in' does not call track.
		if(ash){ dup_track(ash) } //dup.track(tmp+hash, true).it = it(msg);
		mesh.leap = mesh.last = null; // warning! mesh.leap could be buggy.
	}
	var tomap = function(k: unknown,i: unknown,m: (k: unknown, v: boolean) => void){m(k,true)};
	hear.c = hear.d = 0;

	;(function(){
		var SMIA = 0;
		var loop: number | undefined;
		mesh.hash = function(msg, peer){ var h: number | undefined, s: string | undefined, t: string | undefined;
			var S = +new Date;
			json(msg.put, function hash(err?: unknown, text?: string){
				var ss = (s || (s = t = text||'')).slice(0, 32768); // 1024 * 32
			  h = String.hash(ss, h); s = s!.slice(32768);
			  if(s){ puff(hash, 0); return }
				console.STAT && console.STAT(S, +new Date - S, 'say json+hash');
			  msg._!.$put = t;
			  msg['##'] = h;
			  mesh.say(msg, peer);
			  delete msg._!.$put;
			}, sort);
		}
		function sort(k: string, v: unknown){ var tmp: Dict<unknown>;
			if(!(v instanceof Object)){ return v }
			Object.keys(v).sort().forEach(sorta, {to: tmp = {}, on: v as Dict<unknown>});
			return tmp;
		} function sorta(this: {to: Dict<unknown>, on: Dict<unknown>}, k: string){ this.to[k] = this.on[k] }

		var say = mesh.say = function(this: MeshT | OntoListener<Msg> | void, msg?: Msg, peer?: PeerArg){ var tmp;
			if((tmp = this) && (tmp = tmp.to) && tmp.next){ tmp.next(msg!) } // compatible with middleware adapters.
			if(!msg){ return false }
			var id: MsgId | undefined, hash: number | undefined, raw: string | undefined, ack = msg['@'];
//if(opt.super && (!ack || !msg.put)){ return } // TODO: MANHATTAN STUB //OBVIOUSLY BUG! But squelch relay. // :( get only is 100%+ CPU usage :(
			var meta = msg._||(msg._=function(){} as MsgMeta);
			var DBG = msg.DBG, S = +new Date; meta.y = meta.y || S; if(!peer){ DBG && (DBG.y = S) }
			if(!(id = msg['#'])){ id = msg['#'] = String.random(9) }
			!loop && dup_track(id);//.it = it(msg); // track for 9 seconds, default. Earth<->Mars would need more! // always track, maybe move this to the 'after' logic if we split function.
			//if(msg.put && (msg.err || (dup.s[id]||'').err)){ return false } // TODO: in theory we should not be able to stun a message, but for now going to check if it can help network performance preventing invalid data to relay.
			if(!(hash = msg['##']) && u !== msg.put && !meta.via && ack){ mesh.hash(msg, peer); return } // TODO: Should broadcasts be hashed?
			if(!peer && ack){ peer = ((tmp = dup.s[ack as string]) && (tmp.via || ((tmp = tmp.it) && (tmp = tmp._) && tmp.via))) || ((tmp = mesh.last) && ack === tmp['#'] && mesh.leap) } // warning! mesh.leap could be buggy! mesh last check reduces this. // TODO: CLEAN UP THIS LINE NOW? `.it` should be reliable.
			if(!peer && ack){ // still no peer, then ack daisy chain 'tunnel' got lost.
				if(dup.s[ack as string]){ return } // in dups but no peer hints that this was ack to ourself, ignore.
				console.STAT && console.STAT(+new Date, ++SMIA, 'total no peer to ack to'); // TODO: Delete this now. Dropping lost ACKs is protocol fine now.
				return false;
			} // TODO: Temporary? If ack via trace has been lost, acks will go to all peers, which trashes browser bandwidth. Not relaying the ack will force sender to ask for ack again. Note, this is technically wrong for mesh behavior.
			if(ack && !msg.put && !hash && ((((dup.s[ack as string]||'') as Partial<DupEntry>).it||'') as Partial<Msg>)['##']){ return false } // If we're saying 'not found' but a relay had data, do not bother sending our not found. // Is this correct, return false? // NOTE: ADD PANIC TEST FOR THIS!
			if(!peer && mesh.way){ return mesh.way(msg) }
			DBG && (DBG.yh = +new Date);
			if(!(raw = meta.raw)){ mesh.raw(msg, peer); return }
			DBG && (DBG.yr = +new Date);
			if(!peer || !peer.id){
				if(!Object.plain(peer || opt.peers)){ return false }
				var S = +new Date;
				var P = opt.puff, ps = opt.peers, pl = Object.keys(peer || opt.peers || {}); // TODO: .keys( is slow
				console.STAT && console.STAT(S, +new Date - S, 'peer keys');
				;(function go(){
					var S = +new Date;
					//Type.obj.map(peer || opt.peers, each); // in case peer is a peer list.
					loop = 1; var wr = meta.raw; meta.raw = raw; // quick perf hack
					var i = 0, p: string | Peer | undefined; while(i < 9 && (p = (pl||'')[i++])){
						if(!(p = ps[p] || ((peer||'') as PeerMap)[p])){ continue }
						mesh.say(msg, p);
					}
					meta.raw = wr; loop = 0;
					pl = pl.slice(i); // slicing after is faster than shifting during.
					console.STAT && console.STAT(S, +new Date - S, 'say loop');
					if(!pl.length){ return }
					puff(go, 0);
					ack && dup_track(ack); // keep for later
				}());
				return;
			}
			// TODO: PERF: consider splitting function here, so say loops do less work.
			if(!peer.wire && mesh.wire){ mesh.wire(peer) }
			if(id === peer.last){ return } peer.last = id;  // was it just sent?
			if(peer === meta.via){ return false } // don't send back to self.
			if((tmp = meta.yo) && (tmp[peer.url as string] || tmp[peer.pid as string] || tmp[peer.id]) /*&& !o*/){ return false }
			console.STAT && console.STAT(S, ((DBG||meta).yp = +new Date) - (meta.y || S), 'say prep');
			!loop && ack && dup_track(ack); // streaming long responses needs to keep alive the ack.
			if(peer.batch){
				peer.tail = (tmp = peer.tail || 0) + raw.length;
				if(peer.tail <= opt.pack){
					peer.batch += (tmp?',':'')+raw;
					return;
				}
				flush(peer);
			}
			peer.batch = '['; // Prevents double JSON!
			var ST = +new Date;
			setTimeout(function(){
				console.STAT && console.STAT(ST, +new Date - ST, '0ms TO');
				flush(peer);
			}, opt.gap); // TODO: queuing/batching might be bad for low-latency video game performance! Allow opt out?
			send(raw, peer);
			console.STAT && (ack === peer.SI) && console.STAT(S, +new Date - peer.SH!, 'say ack');
		} as MeshSay;
		mesh.say.c = mesh.say.d = 0;
		// TODO: this caused a out-of-memory crash!
		mesh.raw = function(msg, peer){ // TODO: Clean this up / delete it / move logic out!
			if(!msg){ return '' }
			var meta = ((msg as Msg)._) || {} as Partial<MsgMeta>, put: string | undefined, tmp: string | number | Msg | Dict<unknown> | OkAck | PeerMap | undefined;
			if(tmp = meta.raw){ return tmp }
			if('string' == typeof msg){ return msg }
			var hash = msg['##'], ack = msg['@'];
			if(hash && ack){
				if(!meta.via && dup_check((ack as string)+hash)){ return false } // for our own out messages, memory & storage may ack the same thing, so dedup that. Tho if via another peer, we already tracked it upon hearing, so this will always trigger false positives, so don't do that!
				if(tmp = ((dup.s[ack as string]||'') as Partial<DupEntry>).it){
					if(hash === tmp['##']){ return false } // if ask has a matching hash, acking is optional.
					if(!tmp['##']){ tmp['##'] = hash } // if none, add our hash to ask so anyone we relay to can dedup. // NOTE: May only check against 1st ack chunk, 2nd+ won't know and still stream back to relaying peers which may then dedup. Any way to fix this wasted bandwidth? I guess force rate limiting breaking change, that asking peer has to ask for next lexical chunk.
				}
			}
			if(!msg.dam && !msg['@']){
				var i = 0, to: (string | undefined)[] = []; tmp = opt.peers;
				for(var k in tmp){ var p = (tmp as PeerMap)[k]!; // TODO: Make it up peers instead!
					to.push(p.url || p.pid || p.id);
					if(++i > 6){ break }
				}
				if(i > 1){ msg['><'] = to.join() } // TODO: BUG! This gets set regardless of peers sent to! Detect?
			}
			if(msg.put && (tmp = msg.ok)){ msg.ok = {'@':((tmp as OkAck)['@']||1)-1, '/': ((tmp as OkAck)['/']==msg._!.near)? mesh.near : (tmp as OkAck)['/']}; }
			if(put = meta.$put){
				tmp = {} as Dict<unknown>; Object.keys(msg).forEach(function(k){ (tmp as Dict<unknown>)[k] = msg[k as keyof Msg] });
				(tmp as Dict<unknown>).put = ':])([:';
				json(tmp, function(err?: unknown, raw?: string){
					if(err){ return } // TODO: Handle!!
					var S = +new Date;
					tmp = raw!.indexOf('"put":":])([:"');
					res(u, raw = raw!.slice(0, tmp+6) + put + raw!.slice(tmp + 14));
					console.STAT && console.STAT(S, +new Date - S, 'say slice');
				});
				return;
			}
			json(msg, res);
			function res(err?: unknown, raw?: string){
				if(err){ return } // TODO: Handle!!
				meta.raw = raw; //if(meta && (raw||'').length < (999 * 99)){ meta.raw = raw } // HNPERF: If string too big, don't keep in memory.
				mesh.say(msg as Msg, peer);
			}
		}
	}());

	function flush(peer: Peer){
		var tmp = peer.batch, t = 'string' == typeof tmp, l: undefined;
		if(t){ tmp += ']' }// TODO: Prevent double JSON!
		peer.batch = peer.tail = null;
		if(!tmp){ return }
		if(t? 3 > tmp.length : !tmp.length){ return } // TODO: ^
		if(!t){try{tmp = (1 === tmp.length? tmp[0] : JSON.stringify(tmp));
		}catch(e){return opt.log('DAM JSON stringify error', e)}}
		if(!tmp){ return }
		send(tmp as string, peer);
	}
	// for now - find better place later.
	function send(raw: string, peer: Peer){ try{
		var wire = peer.wire as /* no wire (and no peer.say) throws on purpose: the catch below queues the message */ Wire;
		if(peer.say){
			peer.say(raw);
		} else
		if(wire.send){
			wire.send(raw);
		}
		mesh.say.d += raw.length||0; ++mesh.say.c; // STATS!
	}catch(e){
		(peer.queue = peer.queue || []).push(raw);
	}}

	mesh.near = 0;
	mesh.hi = function(peer: Peer){
		var wire = peer.wire, tmp: string | string[] | undefined;
		if(!wire){ (mesh.wire as /* unset without websocket.js / a WebSocket (or a plugin's wire): upstream then throws here */ NonNullable<MeshT['wire']>)(((peer as PeerUrl).length && {url: peer as PeerUrl, id: peer as PeerUrl}) || peer); return }
		if(peer.id){
			opt.peers[peer.url || peer.id] = peer;
		} else {
			tmp = peer.id = peer.id || peer.url || String.random(9);
			mesh.say({dam: '?', pid: root.opt.pid}, opt.peers[tmp] = peer);
			delete dup.s[peer.last as string]; // IMPORTANT: see https://gun.eco/docs/DAM#self
		}
		if(!peer.met){
			mesh.near++;
			peer.met = +(new Date);
			root.on('hi', peer)
		}
		// @rogowski I need this here by default for now to fix go1dfish's bug
		tmp = peer.queue; peer.queue = [];
		setTimeout.each(tmp||[],function(msg: string){
			send(msg, peer);
		},0,9);
		//Type.obj.native && Type.obj.native(); // dirty place to check if other JS polluted.
	} as /* a URL string only reaches the first line, see PeerUrl */ MeshT['hi']
	mesh.bye = function(peer){
		peer.met && --mesh.near;
		delete peer.met;
		root.on('bye', peer);
		var tmp = +(new Date); tmp = (tmp - (peer.met||tmp));
		mesh.bye.time = ((mesh.bye.time || tmp) + tmp) / 2;
	}
	mesh.hear['!'] = function(msg, peer){ opt.log('Error:', msg.err) }
	mesh.hear['?'] = function(msg, peer){
		if(msg.pid){
			if(!peer.pid){ peer.pid = msg.pid }
			if(msg['@']){ return }
		}
		mesh.say({dam: '?', pid: opt.pid, '@': msg['#']}, peer);
		delete dup.s[peer.last as string]; // IMPORTANT: see https://gun.eco/docs/DAM#self
	}
	mesh.hear['mob'] = function(msg, peer){ // NOTE: AXE will overload this with better logic.
		if(!msg.peers){ return }
		var peers = Object.keys(msg.peers), one = peers[(Math.random()*peers.length) >> 0];
		if(!one){ return }
		mesh.bye(peer);
		mesh.hi(one);
	}

	root.on('create', function(root){
		root.opt.pid = root.opt.pid || String.random(9);
		this.to.next(root);
		root.on('out', mesh.say);
	});

	root.on('bye', function(peer: Peer, tmp?: Wire | null){
		peer = opt.peers[(peer.id || peer) as string] || peer;
		this.to.next(peer);
		peer.bye? peer.bye() : (tmp = peer.wire) && tmp.close && tmp.close();
		delete opt.peers[peer.id as string];
		peer.wire = null;
	});

	var gets: Dict<boolean> = {};
	root.on('bye', function(peer: Peer, tmp?: ConsoleStat | string){ this.to.next(peer);
		if(tmp = console.STAT){ tmp.peers = mesh.near; }
		if(!(tmp = peer.url)){ return } gets[tmp] = true;
		setTimeout(function(){ delete gets[tmp as string] },opt.lack || 9000);
	});
	root.on('hi', function(peer: Peer, tmp?: ConsoleStat){ this.to.next(peer);
		if(tmp = console.STAT){ tmp.peers = mesh.near }
		if(opt.super){ return } // temporary (?) until we have better fix/solution?
		var souls = Object.keys(root.next||''); // TODO: .keys( is slow
		if(souls.length > 9999 && !console.SUBS){ console.log(console.SUBS = "Warning: You have more than 10K live GETs, which might use more bandwidth than your screen can show - consider `.off()`.") }
		setTimeout.each(souls, function(soul){ var node = root.next![soul]!;
			if(opt.super || ((node.ask||'') as Dict<AnyMeta>)['']){ mesh.say({get: {'#': soul}}, peer); return }
			setTimeout.each(Object.keys(node.ask||''), function(key){ if(!key){ return }
				// is the lack of ## a !onion hint?
				mesh.say({'##': String.hash(((root.graph[soul]||'') as Partial<GunNode>)[key]), get: {'#': soul, '.': key}}, peer);
				// TODO: Switch this so Book could route?
			})
		});
	});

	return mesh;
}
	  var empty = {}, ok = true, u: undefined;

	  try{ module.exports = Mesh }catch(e){}

	
