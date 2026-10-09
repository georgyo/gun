// Take caution running this in production, it ONLY saves to disk what is in memory.

var Gun: FileGun = require('../gun'),
fs: typeof import('fs') = require('fs');

Gun.on('opt', function(ctx){
	this.to.next(ctx);
	var opt = ctx.opt;
	if(ctx.once){ return }
	opt.file = String(opt.file || 'data.json');
	var graph = ctx.graph, acks: Dict<true> = {}, count = 0, to: Timer | false | undefined;
	var disk: GunGraph = Gun.obj.ify((fs.existsSync || require('path').existsSync)(opt.file)? 
		fs.readFileSync(opt.file).toString()
	: null) as GunGraph || {};
	
	ctx.on('put', function(at){
		this.to.next(at);
		Gun.graph.is(at.put, null, map);
		if(!at['@']){ acks[at['#'] as MsgId as string] = true; } // only ack non-acks.
		count += 1;
		if(count >= (opt.batch || 10000)){
			return flush();
		}
		if(to){ return }
		to = setTimeout(flush, opt.wait || 1);
	});

	ctx.on('get', function(at){
		this.to.next(at);
		var lex = at.get, soul: Soul | LexMatch | undefined, data: GunNode | undefined, opt: undefined, u: undefined;
		//setTimeout(function(){
		if(!lex || !(soul = lex['#'])){ return }
		//if(0 >= at.cap){ return }
		var field = lex['.'] as /* a LexMatch is used as the key '[object Object]' and misses */ string | undefined;
		data = disk[soul as /* likewise */ Soul] || u;
		if(data && field){
			data = Gun.state.to(data, field);
		}
		ctx.on('in', {'@': at['#'], put: Gun.graph.node(data)});
		//},11);
	});

	var map = function(val: GunValue, key: string, node: GunNode, soul: Soul){
		disk[soul] = Gun.state.to(node, key, disk[soul]);
	}

	var wait: boolean | undefined;
	var flush = function(){
		if(wait){ return }
		wait = true;
		clearTimeout(to as /* `false` is ignored */ Timer | undefined);
		to = false;
		var ack = acks;
		acks = {};
		fs.writeFile(opt.file!, JSON.stringify(disk, null, 2), function(err: unknown, ok?: undefined){
			wait = false;
			var tmp = count;
			count = 0;
			Gun.obj.map(ack, function(yes: true, id: string){
				ctx.on('in', {
					'@': id,
					err: err as /* upstream forwards the Error as is; readers only test and log it */ string,
					ok: 0 // memdisk should not be relied upon as permanent storage.
				});
			});
			if(1 < tmp){ flush() }
		});
	}
});

import type { Dict, GunDeprecated, GunGraph, GunNode, GunStatic, GunValue, LexMatch, MsgId, Soul, Timer } from '../src/types';

/** `Gun` with the deprecated utilities (src/deprecated.ts) used here: missing under Node, see lib/file.js. */
type FileGun = GunStatic & Pick<GunDeprecated, 'obj' | 'graph' | 'state'>;
