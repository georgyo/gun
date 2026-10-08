var Gun: GunStatic = require('../gun');

/*
	An Ad-Hoc Mesh-Network Daisy-Chain
	should work even if humans are
	communicating with each other blind.

	To prevent infinite broadcast loops,
	we use a deduplication process
	based on the message's identifier.
	This is currently implemented in core.

	However, because this still creates a
	N*2 (where N is the number of connections)
	flood, it is not scalable for traditional
	services that have a hub network topology.

	Does this mean we have to abandon mesh
	algorithms? No, we can simply layer more
	efficient optimizations in based on constraints.
	If these constraints exist, it automatically
	upgrades, but if not, it falls back to the
	brute-force mesh based robust algorithm.
	A simple example is to limit peer connections
	and rely upon daisy chaining to relay messages.

	Another example, is if peers are willing to
	identify themselves, then we can improve the
	efficiency of the network by having each peer
	include the names of peers it is connected in
	each message. Then each subsequent peer will
	not relay it to them, since it is unnecessary.
	This should create N (where N is the number of
	peers) messages (or possibly N+ if there is a
	common peer of uncommon peers that receives it
	and relays at exact latency timings), which is
	optimal.

	Since computer networks aren't actually blind,
	we will implement the above method to improve
	the performance of the ad-hoc mesh network.

	But why not have every message contain the
	whole history of peers that it relayed through?
	Because in sufficiently large enough networks,
	with extensive daisy chaining, this will cause
	the message to become prohibitively slow and
	increase indefinitely in size.

*/

Gun.on('opt', function (root) {
	var opt = root.opt;
	if (false === opt.ws || opt.once) {
		this.to.next(root);
		return;
	}
	opt.mesh = opt.mesh || Gun.Mesh(root);
	opt.WebSocket = opt.WebSocket || require('ws') as WsModule;
	var ws = opt.ws = opt.ws || {};
	ws.path = ws.path || '/gun';
	// if we DO need an HTTP server, then choose ws specific one or GUN default one.
	if (!opt.web || ws.noServer) {
		this.to.next(root);
		return;// no server no sockets
	}
	ws.noServer = true;//workaround for ws.path
	ws.web = ws.web || new (opt.WebSocket as WsModule).Server(ws);
	opt.web.on('upgrade', (req, socket, head) => {
		opt.web!.host = opt.web!.host || (req.headers||'').origin || (req.headers||'').host; 
		if (req.url == ws.path) {
			ws.web!.handleUpgrade(req, socket, head, function done(ws) {
				open(ws, req);
			});
		}
	});
	function open(wire: WsSocket, req?: IncomingMessage) {
		var peer: Peer;
		wire.headers = wire.headers || (req || '' as Partial<IncomingMessage>).headers || '' as NoHeaders;
		console.STAT && ((console.STAT.sites || (console.STAT.sites = {}))[wire.headers.origin as string] = 1);
		opt.mesh!.hi(peer = { wire: wire });
		wire.on('message', function (msg) {
			opt.mesh!.hear(msg.data || msg, peer);
		});
		wire.on('close', function () {
			opt.mesh!.bye(peer);
		});
		wire.on('error', function (e) { });
		setTimeout(function heart() { if (!opt.peers[peer.id as string]) { return } try { wire.send("[]") } catch (e) { }; setTimeout(heart, 1000 * 20) }, 1000 * 20); // Some systems, like Heroku, require heartbeats to not time out. // TODO: Make this configurable? // TODO: PERF: Find better approach than try/timeouts?
	}
	this.to.next(root);
});

/** `''` used as "no headers": reading a header of it gives `undefined`, as on an empty headers object. */
type NoHeaders = '' & IncomingHttpHeaders;

/** The http(s) server GUN attaches its websockets to (`Gun({web: server})`). */
type GunWeb = HttpServer & {
	/** lib/wire.js: the origin (or host) of the first websocket upgrade. */
	host?: string;
};

declare module '../src/types' {
	interface GunOptions {
		/** The websocket server options; `false` disables the websocket server. */
		ws?: WsOptions | false;
		/** The http(s) server to attach the websocket server to. */
		web?: GunWeb;
		/** Never set by GUN: lib/wire.js reads it (upstream checks `opt.once` where `root.once` may have been meant). */
		once?: number;
	}
}

import type { IncomingHttpHeaders, IncomingMessage, Server as HttpServer } from 'http';
import type { Duplex } from 'stream';
import type { GunStatic, Peer } from '../src/types';
import type { WsModule, WsOptions, WsSocket } from './types';
