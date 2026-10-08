;(function(){
	if('debug' !== process.env.GUN_ENV){ return }

	var db: DebugDb = {length: 0, hash: {}};

	console.log("start :)");
	global.DEBUG = 1;
	setInterval(function(){
		var print = '', tmp: number | string | undefined;
		var mem = process.memoryUsage();
		var used: number | string = mem.rss / 1024 / 1024;
		used = used.toFixed(1);
		print += used +' MB rss. ';
		var used: number | string = mem.heapTotal / 1024 / 1024;
		used = used.toFixed(1);
		print += used +' MB hT. ';
		var used: number | string = mem.heapUsed / 1024 / 1024;
		used = used.toFixed(1);
		print += used +' MB hU. ';
		if(db.root){
			db.concurrency = Object.keys(db.peers||{}).length;
			print += db.concurrency +' peers. ';
			db.nodes = Object.keys(db.root.graph||{}).length;
			print += db.nodes + ' nodes. ';
			if(db.count){ print += db.count + ' msgs. '}
			if(tmp = db.root.msgsLength){
				tmp = (tmp / 1024 / 1024).toFixed(2);
				print += tmp + ' length MB. ';
			}
			if(db.last){ print += '\n' + JSON.stringify(db.last, null, 2) }
			if(db.hash){ 
				print += '\nSome 100 Fast Hash Counts: \n' + JSON.stringify(db.hash, null, 2);
				var l = Object.keys(db.hash), i = l.length;
				if(i > 100){
					i = i - 100;
					Gun.list.map(l, function(k){
						if(--i <= 0){ return }
						delete db.hash[k];
					});
				}
			}

		}
		db.print = print;
		print = print.split('\n')[0];
		console.log(print);
	}, 2500);

	var Gun: GunStatic & GunDeprecated = require('../gun');
	Gun.on('opt', function(root){
		this.to.next(root);
		if(root.once){ return }
		console.log(">>>>>>>>>", root);
		root.debug = db;
		db.root = root;
		db.peers = root.opt.peers;

		db.count = 0;
		root.on('in', function(msg){
			this.to.next(msg);
			if(!msg.NTS){ db.last = msg }
			db.count!++;
			var tmp = msg['##'];
			if(tmp && msg.put){
				if(!db.hash[tmp]){ db.hash[tmp] = [0, ''] }
				db.hash[tmp][0] = (db.hash[tmp][0] || 0) + 1;
				var preview: KeyList = Object.keys(msg.put||{});
				db.hash[tmp][1] = preview.toString(', ').slice(0,500) + ' ...';
			}
		});
	})

}());

/** Upstream passes a separator to `toString`, which arrays ignore. */
type KeyList = string[] & { toString(ignored?: string): string };

/** `root.debug`: what lib/debug.js (`GUN_ENV=debug`) prints every 2.5 seconds. */
interface DebugDb {
	length: number;
	/** Some message hashes (`##`): how many times each was heard, and a preview of its souls. */
	hash: { [hash: string]: [number, string] };
	root?: RootMeta;
	peers?: PeerMap;
	/** How many peers. */
	concurrency?: number;
	/** How many nodes in memory. */
	nodes?: number;
	/** How many messages heard. */
	count?: number;
	/** The last message heard. */
	last?: Msg;
	/** The last print out. */
	print?: string;
}

declare module '../src/types' {
	interface RootMeta {
		/** lib/debug.js. */
		debug?: DebugDb;
		/** Read by lib/debug.js; never set. */
		msgsLength?: number;
	}
}

declare global {
	/** Set by lib/debug.js. */
	var DEBUG: number | undefined;
}

import type { GunDeprecated, GunStatic, Msg, PeerMap, RootMeta } from '../src/types';
