;(function(){

	var sT = setTimeout || {} as typeof setTimeout, u: undefined;
  if(typeof window !== ''+u){ sT.window = window }
	var AXE: AxeStatic = (sT.window||'' as AxeNone<'AXE'>).AXE || function(){};
  if(AXE.window = sT.window){ AXE.window.AXE = AXE }

	var Gun: GunStatic = (AXE.window||'' as AxeNone<'GUN'>).GUN || require('./gun');
	(Gun.AXE = AXE).GUN = AXE.Gun = Gun;

  //if(!Gun.window){ try{ require('./lib/axe') }catch(e){} }
  if(!Gun.window){ require('./lib/axe') }

	Gun.on('opt', function(at){ start(at) ; this.to.next(at) }); // make sure to call the "next" middleware adapter.

	function start(root: RootMeta){
		if(root.axe){ return }
		var opt = root.opt, peers = opt.peers;
		if(false === opt.axe){ return }
		if(!Gun.window){ return } // handled by ^ lib/axe.js
		var w = Gun.window, lS: AxeStorage = w.localStorage || opt.localStorage as AxeStorage | undefined || {}, loc: AxeLocation = w.location || opt.location || {}, nav: AxeNavigator = w.navigator || opt.navigator || {};
		var axe = root.axe = {} as /* only axe.fall: lib/axe.js, which sets the rest, is not loaded in browsers */ Axe, tmp: Peer, id: string;
		var mesh = opt.mesh = opt.mesh || Gun.Mesh(root); // DAM!

		tmp = peers[id = loc.origin + '/gun'] = peers[id] || {};
		tmp.id = tmp.url = id; tmp.retry = tmp.retry || 0;
		tmp = peers[id = 'http://localhost:8765/gun'] = peers[id] || {};
		tmp.id = tmp.url = id; tmp.retry = tmp.retry || 0;
		Gun.log.once("AXE", "AXE enabled: Trying to find network via (1) local peer (2) last used peers (3) a URL parameter, and last (4) hard coded peers.");
		Gun.log.once("AXEWarn", "Warning: AXE is in alpha, use only for testing!");
		var last = lS.peers || ''; if(last){ last += ' ' }
		last += ((loc.search||'').split('peers=')[1]||'').split('&')[0];

		root.on('bye', function(peer){
			this.to.next(peer);
			if(!peer.url){ return } // ignore WebRTC disconnects for now.
			if(false === nav.onLine){ peer.retry = 1 } else { peer.retry = 0 }
			if(peer.retry){ return }
			if(axe.fall){ delete axe.fall[peer.url || peer.id!] }
			(function next(){
				if(!axe.fall){ setTimeout(next, 9); return } // not found yet
				var fall = Object.keys(axe.fall||''), one = fall[(Math.random()*fall.length) >> 0];
				if(!fall.length){ lS.peers = ''; one = 'https://gunjs.herokuapp.com/gun' } // out of peers
				if(peers[one]){ next(); return } // already choose
				mesh.hi(one);
			}());
		});

		root.on('hi', function(peer){ // TEMPORARY! Try to connect all peers.
			this.to.next(peer);
			if(!peer.url){ return } // ignore WebRTC disconnects for now.
			return; // DO NOT COMMIT THIS FEATURE YET! KEEP TESTING NETWORK PERFORMANCE FIRST!
			(function next(){
				if(!peer.wire){ return }
				if(!axe.fall){ setTimeout(next, 9); return } // not found yet
				var one = ((next as AxeNext).fall = (next as AxeNext).fall || Object.keys(axe.fall||'')).pop();
				if(!one){ return }
				setTimeout(next, 99);
				mesh.say({dam: 'opt', opt: {peers: one}} as AxeOptMsg, peer);
			}());
		});

		function found(text?: string){

			axe.fall = {};
			((text||'').match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/ig)||[]).forEach(function(url){
				axe.fall![url] = {url: url, id: url, retry: 0}; // RETRY
			});
			
			return;

			// TODO: Finish porting below? Maybe not.

			Object.keys((last as string & AxeNone<'peers'>).peers||'').forEach(function(key){
				tmp = peers[id = key] = peers[id] || {};
				tmp.id = tmp.url = id;
			});
			tmp = peers[id = 'https://guntest.herokuapp.com/gun'] = peers[id] || {};
			tmp.id = tmp.url = id;

			var mesh = opt.mesh = opt.mesh || Gun.Mesh(root); // DAM!
			mesh.way = function(msg){
				if(root.$ === msg.$ || (msg._||'' as AxeNone<'via'>).via){
					mesh.say(msg, opt.peers);
					return;
				}
				var at = (msg.$||'' as AxeNone<'_'>)._ as /* not the root's: checked above */ ChainMeta | undefined;
				if(!at){ mesh.say(msg, opt.peers); return }
				if(msg.get){
					if(at.axe){ return } // don't ask for it again!
					at.axe = {};
				}
				mesh.say(msg, opt.peers);
			}
		}

		if(last){ found(last); return }
		try{ fetch(((loc.search||'').split('axe=')[1]||'').split('&')[0] || loc.axe || 'https://raw.githubusercontent.com/wiki/amark/gun/volunteer.dht.md').then(function(res){
	  	return res.text()
	  }).then(function(text){
	  	found(lS.peers = text);
	  }).catch(function(){
	  	found(); // nothing
	  })}catch(e){found()}
	}

	var empty = {}, yes = true;
  try{ if(typeof module != ''+u){ module.exports = AXE } }catch(e){}
}());


/** `(x || '').y`: `''` has none of the keys `K`. */
type AxeNone<K extends string> = { [P in K]?: undefined };

/** The retry loop of a new peer (unused draft): the relays left to tell it of. */
interface AxeNext {
	(): void;
	fall?: string[];
}

/** `AXE` (`require('gun/axe')`, `window.AXE`): a marker function, linked with `Gun`. */
interface AxeStatic {
	(): void;
	/** The browser window, when there is one. */
	window?: Window & typeof globalThis;
	GUN?: GunStatic;
	Gun?: GunStatic;
}

/** Where axe.js remembers the last used peers (`localStorage`, or `opt.localStorage`). */
interface AxeStorage {
	/** Space separated URLs. */
	peers?: string;
	[key: string]: unknown;
}

/** What axe.js reads of `location` (or `opt.location`). */
interface AxeLocation {
	origin?: string;
	/** May hold `peers=` and `axe=` (a URL of the list of peers) parameters. */
	search?: string;
	/** A URL of the list of peers. */
	axe?: string;
}

/** What axe.js reads of `navigator` (or `opt.navigator`). */
interface AxeNavigator {
	onLine?: boolean;
}

declare module './src/types' {
	interface GunStatic {
		/** axe.js. */
		AXE?: AxeStatic;
	}
	interface GunOptions {
		/** axe.js: `location`, where there is no window. */
		location?: AxeLocation;
		/** axe.js: `navigator`, where there is no window. */
		navigator?: AxeNavigator;
	}
	interface ChainMeta {
		/** axe.js (unused draft): set once a GET of the chain was routed. */
		axe?: object;
	}
}

declare module './lib/types' {
	interface Axe {
		/** axe.js (browser): the relays to fall back to, by URL. */
		fall?: Dict<Peer>;
	}
}

declare global {
	namespace setTimeout {
		/** axe.js: the browser window, when there is one. */
		var window: (Window & typeof globalThis) | undefined;
	}
	interface Window {
		/** axe.js. */
		AXE?: AxeStatic;
	}
}

import type { GunStatic, RootMeta, Peer, Dict, ChainMeta } from './src/types';
import type { Axe, AxeOptMsg } from './lib/types';
