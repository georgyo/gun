var Gun: GunStatic & GunDeprecated = require('../gun');

var WebSocket: WsModule = require('ws');

var url: typeof import('url') = require('url');

Gun.on('opt', function mount(ctx){
	this.to.next(ctx);
	var opt = ctx.opt;
	if( !opt.peers )
		if( typeof( opt as unknown == "string" ) )
			opt.peers = [opt] as never; // Unreachable: `opt.peers` is always set.

	if(ctx.once){ return }
	if(false === opt.ws){ return }
	var ws = opt.ws || (opt.ws = {}), batch: string;

	if(opt.web){ 
		ws.server = ws.server || opt.web;
		ws.path = ws.path || '/gun';

		if (!ws.web) ws.web = new WebSocket.Server(ws);

		ws.web.on('connection', function(wire){
			wire.upgradeReq = wire.upgradeReq || {};
			wire.url = url.parse(wire.upgradeReq.url||'', true);
			wire.id = wire.id || Gun.text.random(6);
			var peer = opt.peers[wire.id] = {wire: wire};
			wire.peer = function(){ return peer };
			ctx.on('hi', peer);
			wire.on('message', function(msg){
				//console.log("MESSAGE", msg);
				receive(msg, wire, ctx); // diff: wire is wire.
			});
			wire.on('close', function(){
				ctx.on('bye', peer);
				Gun.obj.del(opt.peers, wire.id as string);
			});
			wire.on('error', function(e){});
		});	
	}
	
	ctx.on('out', function(at){
		this.to.next(at);
		batch = JSON.stringify(at);
		if(ws.drain){
			ws.drain.push(batch);
			return;
		}
		ws.drain = [];
		setTimeout(function(){
			if(!ws.drain){ return }
			var tmp = ws.drain;
			ws.drain = null;
			if(!tmp.length){ return }
			batch = JSON.stringify(tmp);
			Gun.obj.map(opt.peers, send, ctx);
		}, opt.gap || opt.wait || 1);
		Gun.obj.map(opt.peers, send, ctx);
	});

	// EVERY message taken care of. The "extra" ones are from in-memory not having "asked" for it yet - which we won't want it to do for foreign requests. Likewise, lots of chattyness because the put/ack replies happen before the `get` syncs so everybody now has it in-memory already to reply with.
	function send(this: RootMeta, peer: Peer){
		var ctx = this, msg = batch;
		var wire = peer.wire as WsSocket || open(peer, ctx);
		if(!wire){ return }
		if(wire.readyState === wire.OPEN){
			wire.send(msg);
			return;
		}
		(peer.queue = peer.queue || []).push(msg);
	}
	function receive(msg: WsIn | WsInBatch, wire: WsSocket, ctx: RootMeta){
		if(!ctx){ return }
		try{msg = JSON.parse(msg.data || msg as WsFrame);
		}catch(e){}
		if(msg instanceof Array){
			var i = 0, m: WsIn | undefined;
			while(m = msg[i++]){
				receive(m, wire, ctx); // wire not peer!
			}
			return;
		}
		msg.peer = wire.peer;
		ctx.on('in', msg);
	}
	function open(peer: Peer, as: RootMeta){
		if(!peer || !peer.url){ return }
		var url = peer.url.replace('http', 'ws');
		var wire = peer.wire = new WebSocket(url);
		wire.on('close', function(){
			reconnect(peer, as);
		});
		wire.on('error', function(error){
			if(!error){ return }
			if(error.code === 'ECONNREFUSED'){
				reconnect(peer, as); // placement?
			}
		});
		wire.on('open', function(){
			var queue = peer.queue;
			peer.queue = [];
			Gun.obj.map(queue, function(msg){
				batch = msg;
				send.call(as, peer);
			});
		});
		wire.on('message', function(msg){
			receive(msg, wire, as); // diff: wire not peer!
		});
		return wire;
	}

	function reconnect(peer: Peer, as: RootMeta){
		clearTimeout(peer.defer);
		peer.defer = setTimeout(function(){
			open(peer, as);
		}, 2 * 1000);
	}
});

declare module './types' {
	interface WsSocket {
		/** lib/ws.js, lib/uws.js (old `ws` versions): the upgrade request. */
		upgradeReq?: { url?: string };
		url?: import('url').UrlWithParsedQuery;
		id?: string;
		/** lib/ws.js: its peer. */
		peer?: () => Peer;
	}
}

import type { GunDeprecated, GunStatic, Msg, Peer, RootMeta } from '../src/types';
import type { WsFrame, WsIn, WsInBatch, WsModule, WsSocket } from './types';
