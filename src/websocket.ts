import type { GunStatic, Peer, Timer, WebSocketCtor, Wire, Msg } from './types';
var Gun: GunStatic = require('./root');
Gun.Mesh = require('./mesh');

// TODO: resync upon reconnect online/offline
//window.ononline = window.onoffline = function(){ console.log('online?', navigator.onLine) }

Gun.on('opt', function(root){
	this.to.next(root);
	if(root.once){ return }
	var opt = root.opt;
	if(false === opt.WebSocket){ return }

	var env: WsEnv = Gun.window || {};
	var websocket = opt.WebSocket || env.WebSocket || env.webkitWebSocket || env.mozWebSocket;
	if(!websocket){ return }
	opt.WebSocket = websocket;

	var mesh = opt.mesh = opt.mesh || Gun.Mesh(root);

	var wired = mesh.wire || opt.wire;
	mesh.wire = opt.wire = open;
	function open(peer?: Peer): Wire | void{ try{
		if(!peer || !peer.url){ return wired && wired(peer) }
		var url = peer.url.replace(/^http/, 'ws');
		var wire = peer.wire = new (opt.WebSocket as WebSocketCtor)(url);
		wire.onclose = function(){
			reconnect(peer);
			opt.mesh!.bye(peer);
		};
		wire.onerror = function(err){
			reconnect(peer);
		};
		wire.onopen = function(){
			opt.mesh!.hi(peer);
		}
		wire.onmessage = function(msg){
			if(!msg){ return }
			opt.mesh!.hear((msg.data || msg) as string | Msg, peer);
		};
		return wire;
	}catch(e){ opt.mesh!.bye(peer as Peer) }}

	setTimeout(function(){ !opt.super && root.on('out', {dam:'hi'}) },1); // it can take a while to open a socket, so maybe no longer lazy load for perf reasons?

	var wait = 2 * 999;
	function reconnect(peer: Peer){
		clearTimeout(peer.defer);
		if(!opt.peers[peer.url!]){ return }
		if(doc && (peer.retry as /* undefined on the first retry: compares false */ number) <= 0){ return }
		peer.retry = (peer.retry || (opt.retry as /* undefined: NaN, so the default 60 */ number)+1 || 60) - ((-(peer.tried as /* undefined on the first retry: NaN compares false */ number) + (peer.tried = +new Date) < wait*4)?1:0);
		peer.defer = setTimeout(function to(): Timer | undefined{
			if(doc && doc.hidden){ return setTimeout(to,wait) }
			open(peer);
		}, wait);
	}
	var doc = (''+u !== typeof document) && document;
});
var noop = function(){}, u: undefined;

type WsEnv = /* Where websocket.js looks for a WebSocket constructor (the browser `window`, see the `Window` augmentation in types.ts). */ Partial<Pick<Window, 'webkitWebSocket' | 'mozWebSocket'>> & { WebSocket?: WebSocketCtor };
	
