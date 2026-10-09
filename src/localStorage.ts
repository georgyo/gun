import type { Dict, GunGraph, GunNode, GunStatic, JsonParseAsync, JsonStringifyAsync, Lex, MsgId, OkAck, Soul, Timer } from './types';
;(function(){

if(typeof Gun === 'undefined'){ return }

var noop: (() => void) & { localStorage?: undefined } = function(){}, store: Store | undefined, u: undefined;
try{store = (Gun.window||noop).localStorage}catch(e){}
if(!store){
	Gun.log("Warning: No localStorage exists to persist data to!");
	store = {setItem: function(this: Dict<string>, k,v){this[k]=v}, removeItem: function(this: Dict<string>, k){delete this[k]}, getItem: function(this: Dict<string>, k){return this[k]}};
}

var parse: JsonParseAsync = JSON.parseAsync || function(t,cb,r){ var u: undefined; try{ cb(u, JSON.parse(t,r as Exclude<typeof r, null>)) }catch(e){ cb(e) } }
var json: JsonStringifyAsync = JSON.stringifyAsync || function(v,cb,r,s){ var u: undefined; try{ cb(u, JSON.stringify(v,r as Exclude<typeof r, null>,s)) }catch(e){ cb(e) } }

Gun.on('create', function lg(root){
	this.to.next(root);
	var opt = root.opt, graph = root.graph, acks: MsgId[] = [], disk: GunGraph, to: Timer | false | undefined, size: string | number | null | undefined, stop: unknown;
	if(false === opt.localStorage){ return }
	opt.prefix = opt.file || 'gun/';
	try{ disk = (lg as Disks<typeof lg>)[opt.prefix] = (lg as Disks<typeof lg>)[opt.prefix] || JSON.parse(size = store!.getItem(opt.prefix) as string) || {}; // TODO: Perf! This will block, should we care, since limited to 5MB anyways?
	}catch(e){ disk = (lg as Disks<typeof lg>)[opt.prefix] = {}; }
	size = (size as string||'').length;

	root.on('get', function(msg){
		this.to.next(msg);
		var lex = msg.get, soul: Soul | undefined, data: GunNode | undefined, tmp: Lex['.'], u: undefined;
		if(!lex || !(soul = lex['#'] as /* a LexMatch soul is used as the key '[object Object]' and misses */ Soul)){ return }
		data = disk[soul] || u;
		if(data && (tmp = lex['.']) && !Object.plain(tmp)){ // pluck!
			data = Gun.state.ify({}, tmp as /* `true` (get.js soul()) is used as the key 'true', which is what property access does with it */ string, Gun.state.is(data, tmp as string), data[tmp as string], soul);
		}
		//if(data){ (tmp = {})[soul] = data } // back into a graph.
		//setTimeout(function(){
		Gun.on.get.ack(msg, data); //root.on('in', {'@': msg['#'], put: tmp, lS:1});// || root.$});
		//}, Math.random() * 10); // FOR TESTING PURPOSES!
	});

	root.on('put', function(msg){
		this.to.next(msg); // remember to call next middleware adapter
		var put = msg.put, soul = put['#'], key = put['.'], id = msg['#'], ok = (msg.ok||'') as OkAck, tmp: undefined; // pull data off wire envelope
		disk[soul] = Gun.state.ify(disk[soul], key, put['>'], put[':'], soul); // merge into disk object
		if(stop && size as number > (4999880)){ root.on('in', {'@': id, err: "localStorage max!"}); return; }
		//if(!msg['@']){ acks.push(id) } // then ack any non-ack write. // TODO: use batch id.
		if(!msg['@'] && (!msg._.via || Math.random() < ((ok['@'] as /* undefined (no or a numeric msg.ok): NaN, so no ack */ number) / (ok['/'] as number)))){ acks.push(id) } // then ack any non-ack write. // TODO: use batch id.
		if(to){ return }
		to = setTimeout(flush, 9+(size as number / 333)); // 0.1MB = 0.3s, 5MB = 15s 
	});
	function flush(){
		if(!acks.length && ((setTimeout.turn||'').s||'').length){ setTimeout(flush,99); return; } // defer if "busy" && no saves.
		var err: undefined, ack = acks; clearTimeout(to as Timer); to = false; acks = [];
		json(disk, function(err, tmp){
			try{!err && store!.setItem(opt.prefix!, tmp!);
			}catch(e){ err = stop = e || "localStorage failure" }
			if(err){
				Gun.log(err as /* the thrown value (usually a DOMException), stringified by + */ string + " Consider using GUN's IndexedDB plugin for RAD for more storage space, https://gun.eco/docs/RAD#install");
				root.on('localStorage:error', {err: err, get: opt.prefix, put: disk});
			}
			size = tmp!.length;

			//if(!err && !Object.empty(opt.peers)){ return } // only ack if there are no peers. // Switch this to probabilistic mode
			setTimeout.each(ack, function(id){
				root.on('in', {'@': id, err: err as /* upstream forwards the thrown value (usually a DOMException) as is; readers only test and log it */ string, ok: 0}); // localStorage isn't reliable, so make its `ok` code be a low number.
			},0,99);
		})
	}

});
	

}());

declare var Gun: /* The browser global `Gun` (window.Gun). This module returns early when it does not exist, so it is typed as present. */ GunStatic;
type Store = /* `localStorage`, or the in-memory stand-in used without one. */ Pick<Storage, 'setItem' | 'removeItem'> & { getItem(key: string): string | null | undefined };
type Disks<F> = /* The `create` listener `lg` doubles as the cache of loaded disks, by prefix. */ F & Dict<GunGraph>;
