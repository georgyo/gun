import type { AnyMeta, Chain, ChainData, ChainMsg, ChainPut, Dict, GetListener, GunNode, GunStatic, Link, MsgMeta, NodeLike, NodeMeta, OntoListener, OntoNode, PutAs, PutCb, PutCtx, PutFrame, PutRun, PutStun, PutThunk, RootMeta, Soul, StunHost, StunTest, Thunk } from './types';
var Gun: GunStatic = require('./root');
Gun.chain.put = function(this: Chain, data: unknown, cb?: PutCb | Soul, as?: PutAs): Chain{ // I rewrote it :)
	var gun = this, at = gun._, root = at.root;
	as = as || {};
	as.root = at.root;
	as.run || (as.run = root.once);
	stun(as as /* root and run are set above */ PutStun, at.id); // set a flag for reads to check if this chain is writing.
	as.ack = as.ack || cb;
	as.via = as.via || gun;
	as.data = as.data || data;
	as.soul || (as.soul = at.soul || ('string' == typeof cb && cb));
	var s = as.state = as.state || Gun.state();
	if('function' == typeof data){ (data as PutThunk)(function(d){ as.data = d; gun.put(u,u,as) }); return gun }
	if(!as.soul){ return get(as as /* root, run and via are set above */ PutCtx), gun }
	as.$ = root.$.get(as.soul); // TODO: This may not allow user chaining and similar?
	as.todo = [{it: as.data, ref: as.$}];
	as.turn = as.turn || turn;
	as.ran = as.ran || ran;
	//var path = []; as.via.back(at => { at.get && path.push(at.get.slice(0,9)) }); path = path.reverse().join('.');
	// TODO: Perf! We only need to stun chains that are being modified, not necessarily written to.
	(function walk(){
		var to = as.todo, at: PutFrame = to.pop()!, d = at.it, cid = at.ref && at.ref._.id, v: boolean | Soul | Partial<Link> | undefined, k: string | undefined, cat: PutFrame, tmp: string[] | PutFrame | AnyMeta | Partial<AnyMeta> | ChainData | ChainPut | Partial<GunNode> | undefined, g: boolean | undefined;
		stun(as as PutStun, at.ref);
		if(tmp = at.todo){
			k = tmp.pop()!; d = (d as Dict<unknown>)[k];
			if(tmp.length){ to.push(at) }
		}
		k && (to.path || (to.path = [])).push(k);
		if(!(v = valid(d)) && !(g = Gun.is(d))){
			if(!Object.plain(d)){ ran.err(as as /* walk only runs once the context is complete, see above */ PutRun, "Invalid data: "+ check(d) +" at " + (as.via.back(function(at){at.get && (tmp as string[]).push(at.get)}, tmp = []) as undefined || tmp.join('.'))+'.'+(to.path||[]).join('.')); return }
			var seen = as.seen || (as.seen = []), i = seen.length;
			while(i--){ if(d === (tmp = seen[i]).it){ v = d = tmp.link; break } }
		}
		if(k && v){ at.node = state_ify(at.node, k, s, d) } // handle soul later.
		else {
			if(!as.seen){ ran.err(as as PutRun, "Data at root of graph must be a node (an object)."); return }
			as.seen.push(cat = {it: d, link: {}, todo: g? [] : Object.keys(d as object).sort().reverse(), path: (to.path||[]).slice(), up: at}); // Any perf reasons to CPU schedule this .keys( ?
			at.node = state_ify(at.node, k, s, cat.link);
			!g && cat.todo!.length && to.push(cat);
			// ---------------
			var id = as.seen.length;
			(as.wait || (as.wait = {}))[id] = '';
			tmp = (cat.ref = (g? d as Chain : k? at.ref!.get(k) : at.ref!))._;
			(tmp = ((d as NodeLike) && ((d as NodeLike)._||'' as NodeMeta)['#']) || tmp.soul || tmp.link)? resolve({soul: tmp}) : cat.ref.get(resolve, {run: as.run, /*hatch: 0,*/ v2020:1, out:{get:{'.':' '}}}); // TODO: BUG! This should be resolve ONLY soul to prevent full data from being loaded. // Fixed now?
			//setTimeout(function(){ if(F){ return } console.log("I HAVE NOT BEEN CALLED!", path, id, cat.ref._.id, k) }, 9000); var F; // MAKE SURE TO ADD F = 1 below!
			function resolve(msg: ChainMsg, eve?: GetListener){
				var end = cat.link!['#'];
				if(eve){ eve.off(); eve.rid(msg) } // TODO: Too early! Check all peers ack not found.
				// TODO: BUG maybe? Make sure this does not pick up a link change wipe, that it uses the changign link instead.
				var soul: Soul | Array<Soul | undefined> | undefined = end || msg.soul || (tmp = ((msg.$$||msg.$)!._||'') as Partial<AnyMeta>).soul || tmp.link || (((tmp = tmp.put||'') as Partial<GunNode>)._||'' as NodeMeta)['#'] || (tmp as Partial<Link>)['#'] || (((tmp = msg.put||'') && msg.$$)? (tmp as ChainPut)['#'] : (((tmp as ChainPut)['=']||(tmp as ChainPut)[':']||'') as Partial<Link>)['#']);
				!end && stun(as as PutStun, msg.$);
				if(!soul && !at.link!['#']){ // check soul link above us
					(at.wait || (at.wait = [])).push(function(){ resolve(msg, eve) }) // wait
					return;
				}
				if(!soul){
					soul = [];
					(msg.$$||msg.$)!.back(function(at){
						if(tmp = at.soul || at.link){ return (soul as Array<Soul | undefined>).push(tmp) }
						(soul as Array<Soul | undefined>).push(at.get);
					});
					soul = soul.reverse().join('/');
				}
				cat.link!['#'] = soul;
				!g && ((((as as PutRun).graph || ((as as PutRun).graph = {}))[soul] = (cat.node || (cat.node = {_:{}})))._['#'] = soul);
				delete (as as PutRun).wait![id];
				cat.wait && setTimeout.each(cat.wait, function(cb){ cb && cb() });
				(as as PutRun).ran(as as PutRun);
			};
			// ---------------
		}
		if(!to.length){ return as.ran(as as PutRun) }
		as.turn(walk);
	}());
	return gun;
} as Chain['put']

function stun(as: PutStun, id?: number | Chain){
	if(!id){ return } id = (((id as Partial<Chain>)._||'') as Partial<AnyMeta>).id||id;
	var run: StunHost = as.root.stun || (as.root.stun = {on: Gun.on}), test: StunTest = {}, tmp: OntoNode<StunTest> | undefined;
	as.stun || (as.stun = run.on('stun', function(){ }));
	if(tmp = run.on(''+id)){ ((tmp as OntoListener<StunTest>).the.last as OntoListener<StunTest>).next(test) }
	if((test.run as /* undefined (no write in progress) compares false */ number) >= as.run){ return }
	run.on(''+id, function(test){
		if(as.stun!.end){
			this.off();
			this.to.next(test);
			return;
		}
		test.run = test.run || as.run;
		test.stun = test.stun || as.stun; return;
		if(this.to.to){
			(this.the.last as OntoListener<StunTest>).next(test);
			return;
		}
		test.stun = as.stun;
	});
}

function ran(as: PutRun){
	if(as.err){ ran.end(as.stun, as.root); return } // move log handle here.
	if(as.todo.length || as.end || !Object.empty(as.wait)){ return } as.end = 1;
	//(as.retry = function(){ as.acks = 0;
	var cat = (as.$.back(-1)._), root = cat.root, ask = cat.ask(function(ack){
		root.on('ack', ack);
		if(ack.err && !ack.lack){ Gun.log(ack) }
		if(++acks > (as.acks || 0)){ this.off() } // Adjustable ACKs! Only 1 by default.
		if(!as.ack){ return }
		(as.ack as PutCb)(ack, this);
	}, as.opt), acks = 0, stun: OntoListener<StunTest> | Dict<Thunk> | '' | undefined = as.stun, tmp: MsgMeta;
	(tmp = function(){ // this is not official yet, but quick solution to hack in for now.
		if(!stun){ return }
		ran.end(stun as OntoListener<StunTest>, root);
		setTimeout.each(Object.keys(stun = (stun as OntoListener<StunTest>).add||''), function(cb: string | Thunk | undefined){ if(cb = (stun as Dict<Thunk>)[cb as string]){cb()} }); // resume the stunned reads // Any perf reasons to CPU schedule this .keys( ?
	} as MsgMeta).hatch = tmp; // this is not official yet ^
	//console.log(1, "PUT", as.run, as.graph);
	if(as.ack && !as.ok){ as.ok = as.acks || 9 } // TODO: In future! Remove this! This is just old API support.
	(as.via._).on('out', {put: as.out = as.graph, ok: as.ok && {'@': as.ok+1}, opt: as.opt, '#': ask, _: tmp});
	//})();
}; ran.end = function(stun: OntoListener<StunTest>, root: RootMeta){
	stun.end = noop; // like with the earlier id, cheaper to make this flag a function so below callbacks do not have to do an extra type check.
	if(stun.the.to === stun && stun === stun.the.last){ delete root.stun }
	stun.off();
}; ran.err = function(as: PutRun, err: string){
	((as.ack||noop) as PutCb).call(as, as.out = { err: as.err = Gun.log(err) });
	as.ran(as);
}

function get(as: PutCtx){
	var at = as.via._, tmp: unknown;
	as.via = as.via.back(function(at){
		if(at.soul || !at.get){ return at.$ }
		tmp = as.data; (as.data = {} as Dict<unknown>)[at.get] = tmp;
	}) as /* undefined is replaced right below */ Chain;
	if(!as.via || !as.via._.soul){
		as.via = at.root.$.get((((as.data||'') as Partial<GunNode>)._||'' as NodeMeta)['#'] || at.$.back('opt.uuid')())
	}
	as.via.put(as.data, as.ack, as);
	

	return;
	if(at.get && at.back!.soul){
		tmp = as.data;
		as.via = at.back!.$;
		(as.data = {} as Dict<unknown>)[at.get!] = tmp; 
		as.via.put(as.data, as.ack, as);
		return;
	}
}
function check(d: unknown, tmp?: { name: string }){ return ((d && (tmp = d.constructor) && tmp.name) || typeof d) }

var u: undefined, empty = {}, noop = function(){}, turn = setTimeout.turn, valid = Gun.valid, state_ify = Gun.state.ify;
var iife = function(fn: (this: object) => void, as?: object){fn.call(as||empty)}
	
