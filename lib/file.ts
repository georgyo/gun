// This was written by the wonderful Forrest Tait
// modified by Mark to be part of core for convenience
// twas not designed for production use
// only simple local development.

var Gun: FileGun = require('../gun'),
fs: typeof import('fs') = require('fs');

Gun.on('create', function(root){
	this.to.next(root);
	var opt = root.opt;
	if(true !== opt.localStorage){ return }
	if(false === (opt.localStorage as /* already known to be `true` here: a dead check */ boolean)){ return }
	//if(process.env.RAD_ENV){ return }
	//if(process.env.AWS_S3_BUCKET){ return }
	opt.file = String(opt.file || 'data.json');
	var graph = root.graph, acks: Dict<true> = {}, count = 0, to: Timer | false | undefined;
	var disk: GunGraph = Gun.obj.ify((fs.existsSync || require('path').existsSync)(opt.file)? 
		fs.readFileSync(opt.file).toString()
	: null) as GunGraph || {};

	Gun.log.once(
		'file-warning',
		'WARNING! This `file.js` module for gun is ' +
		'intended for local development testing only!'
	);
	
	root.on('put', function(at){
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

	root.on('get', function(at){
		this.to.next(at);
		var lex = at.get, soul: Soul | LexMatch | undefined, data: GunNode | undefined, opt: undefined, u: undefined;
		//setTimeout(function(){
		if(!lex || !(soul = lex['#'])){ return }
		//if(0 >= at.cap){ return }
		if(Gun.obj.is(soul)){ return match(at) }
		var field = lex['.'] as /* a LexMatch is used as the key '[object Object]' and misses */ string | undefined;
		data = disk[soul as Soul] || u;
		if(data && field){
			data = Gun.state.to(data, field);
		}
		root.on('in', {'@': at['#'], put: Gun.graph.node(data)});
		//},11);
	});

	var map = function(val: GunValue, key: string, node: GunNode, soul: Soul){
		disk[soul] = Gun.state.to(node, key, disk[soul]);
	}

	var wait: boolean | undefined, u: undefined;
	var flush = function(){
		if(wait){ return }
		clearTimeout(to as /* `false` is ignored */ Timer | undefined);
		to = false;
		var ack = acks;
		acks = {};
		fs.writeFile(opt.file!, JSON.stringify(disk), function(err: unknown, ok?: undefined){
			wait = false;
			var tmp = count;
			count = 0;
			Gun.obj.map(ack, function(yes: true, id: string){
				root.on('in', {
					'@': id,
					err: err as /* upstream forwards the Error as is; readers only test and log it */ string,
					ok: err? u : 1
				});
			});
			if(1 < tmp){ flush() }
		});
	}

	function match(at: GetMsg){
		var rgx = at.get['#'] as Soul | LexMatch, has = at.get['.'] as /* see `field` */ string | undefined;
		Gun.obj.map(disk, function(node: GunNode, soul: Soul, put: GunGraph | DepMapT){
			if(!Gun.text.match(soul, rgx)){ return }
			if(has){ node = Gun.state.to(node, has) }
			(put = {} as GunGraph)[soul] = node;
			root.on('in', {put: put, '@': at['#']});
		});
	}
});
/**
 * `Gun` with the deprecated utilities (src/deprecated.ts) this adapter relies
 * on (lib/memdisk.js and lib/level.js too). src/deprecated.ts only installs
 * them where `Gun` is a global (browsers): under Node these adapters throw on
 * their first use of them.
 */
type FileGun = GunStatic & Pick<GunDeprecated, 'obj' | 'graph' | 'state' | 'text'>;

import type { DepMapT, Dict, GetMsg, GunDeprecated, GunGraph, GunNode, GunStatic, GunValue, LexMatch, MsgId, Soul, Timer } from '../src/types';
