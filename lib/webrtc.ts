;(function(){
	var GUN: GunStatic = (typeof window !== "undefined")? window.Gun : require('../gun');
	GUN.on('opt', function(root){
		this.to.next(root);
		var opt = root.opt;
		if(root.once){ return }
		if(!GUN.Mesh){ return }
		if(false === opt.RTCPeerConnection){ return }

		var env: RtcEnv | undefined;
		if(typeof window !== "undefined"){ env = window }
		if(typeof global !== "undefined"){ env = global }
		env = env || {};

		var rtcpc = opt.RTCPeerConnection || env.RTCPeerConnection || env.webkitRTCPeerConnection || env.mozRTCPeerConnection;
		var rtcsd = opt.RTCSessionDescription || env.RTCSessionDescription || env.webkitRTCSessionDescription || env.mozRTCSessionDescription;
		var rtcic = opt.RTCIceCandidate || env.RTCIceCandidate || env.webkitRTCIceCandidate || env.mozRTCIceCandidate;
		if(!rtcpc || !rtcsd || !rtcic){ return }
		opt.RTCPeerConnection = rtcpc;
		opt.RTCSessionDescription = rtcsd;
		opt.RTCIceCandidate = rtcic;
		opt.rtc = opt.rtc || {'iceServers': [
      {urls: 'stun:stun.l.google.com:19302'},
      {urls: 'stun:stun.cloudflare.com:3478'}/*,
      {urls: "stun:stun.sipgate.net:3478"},
      {urls: "stun:stun.stunprotocol.org"},
      {urls: "stun:stun.sipgate.net:10000"},
      {urls: "stun:217.10.68.152:10000"},
      {urls: 'stun:stun.services.mozilla.com'}*/ 
    ]};
    // TODO: Select the most appropriate stuns. 
    // FIXME: Find the wire throwing ICE Failed
    // The above change corrects at least firefox RTC Peer handler where it **throws** on over 6 ice servers, and updates url: to urls: removing deprecation warning 
    opt.rtc.dataChannel = opt.rtc.dataChannel || {ordered: false, maxRetransmits: 2};
    opt.rtc.sdp = opt.rtc.sdp || {mandatory: {OfferToReceiveAudio: false, OfferToReceiveVideo: false}};
    opt.rtc.max = opt.rtc.max || 55; // is this a magic number? // For Future WebRTC notes: Chrome 500 max limit, however 256 likely - FF "none", webtorrent does 55 per torrent.
    opt.rtc.room = opt.rtc.room || GUN.window && (location.hash.slice(1) || location.pathname.slice(1));
    opt.announce = function(to){
			opt.rtc!.start = +new Date; // handle room logic:
			root.$.get('/RTC/'+opt.rtc!.room+'<?99').get('+').put(opt.pid, function(ack){
				if(!ack.ok || !(ack.ok as OkAck).rtc){ return }
				plan(ack);
			}, {acks: opt.rtc!.max}).on(function(last,key, msg){
				if(last === opt.pid || opt.rtc!.start! > (msg.put as PutAtom)['>']){ return }
				plan({'#': ''+msg['#'], ok: {rtc: {id: last as string}}});
			});
    };

		var mesh = opt.mesh = opt.mesh || GUN.Mesh(root), wired = mesh.wire;
    mesh.hear['rtc'] = plan;
		mesh.wire = function(media){ try{ wired && wired(media);
    	if(!(media instanceof MediaStream)){ return }
    	((open as RtcOpen).media = (open as RtcOpen).media||{})[media.id] = media;
    	for(var p in opt.peers){ p = opt.peers[p] as RtcPeerKey||'';
    		(p as RtcPeerKey).addTrack && media.getTracks().forEach(track => {
			    (p as RtcPeerKey).addTrack(track, media);
			  });
    		(p as RtcPeerKey).createOffer && (p as RtcPeerKey).createOffer(function(offer){
					(p as RtcPeerKey).setLocalDescription(offer);
					mesh.say({'#': root.ask(plan), dam: 'rtc', ok: {rtc: {offer: offer, id: opt.pid}}}, p as RtcPeerKey);
				}, function(){}, opt.rtc!.sdp);
    	}
		} catch(e){console.log(e)} }
		root.on('create', function(at){
			this.to.next(at);
			setTimeout(opt.announce!, 1);
		});

		function plan(msg: Msg){
			if(!msg.ok){ return }
			var rtc = (msg.ok as RtcOk).rtc, peer: RtcPeer, tmp: RTCIceCandidateInit | RtcSdp | undefined;
			if(!rtc || !rtc.id || rtc.id === opt.pid){ return }
			peer = open(msg, rtc);
			if(tmp = rtc.candidate){
				return peer.addIceCandidate(new opt.RTCIceCandidate!(tmp));
			}
			if(tmp = rtc.answer){
				tmp.sdp = tmp.sdp.replace(/\\r\\n/g, '\r\n');
				return peer.setRemoteDescription(peer.remoteSet = new opt.RTCSessionDescription!(tmp)); 
			}
			if(tmp = rtc.offer){
				rtc.offer.sdp = rtc.offer.sdp.replace(/\\r\\n/g, '\r\n');
				peer.setRemoteDescription(new opt.RTCSessionDescription!(tmp));
				return peer.createAnswer(function(answer){
					peer.setLocalDescription(answer);
					root.on('out', {'@': msg['#'], ok: {rtc: {answer: answer, id: opt.pid}}});
				}, function(){}, opt.rtc!.sdp);
			}
		}
		function open(msg: Msg, rtc: RtcSignal, peer?: RtcPeer): RtcPeer{ // `peer` is a local variable.
			if(peer = opt.peers[rtc.id] as RtcPeer || (open as RtcOpen)[rtc.id] as RtcPeer){ return peer }
			(peer = new (opt.RTCPeerConnection as typeof RTCPeerConnection)(opt.rtc) as RtcPeer).id = rtc.id;
			var wire = peer.wire = peer.createDataChannel('dc', opt.rtc!.dataChannel) as RtcWire;
			function rtceve(eve: RtcEvent){ eve.peer = peer; gun.on('rtc', eve) }
			peer.$ = gun;
			(open as RtcOpen)[rtc.id] = peer;
			peer.ontrack = rtceve;
			peer.onremovetrack = rtceve;
			peer.onconnectionstatechange = rtceve;
			wire.to = setTimeout(function(){delete (open as RtcOpen)[rtc.id]},1000*60);
			wire.onclose = function(){ mesh.bye(peer) };
			wire.onerror = function(err){ };
			wire.onopen = function(e){
				delete (open as RtcOpen)[rtc.id];
				mesh.hi(peer);
			}
			wire.onmessage = function(msg){
				if(!msg){ return }
				mesh.hear(msg.data || msg, peer);
			};
			peer.onicecandidate = function(e){ rtceve(e);
        if(!e.candidate){ return }
        root.on('out', {'@': (msg||'')['#'], '#': root.ask(plan), ok: {rtc: {candidate: e.candidate, id: opt.pid}}});
			}
			peer.ondatachannel = function(e){ rtceve(e);
				var rc = e.channel;
				rc.onmessage = wire.onmessage;
				rc.onopen = wire.onopen;
				rc.onclose = wire.onclose;
			}
			if(rtc.offer){ return peer }
			for(var m in (open as RtcOpen).media){ m = (open as RtcOpen).media![m] as MediaKey;
				(m as MediaKey).getTracks().forEach(track => {
			    peer.addTrack(track, m as MediaKey);
			  });
			}
			peer.createOffer(function(offer){
				peer.setLocalDescription(offer);
				root.on('out', {'@': (msg||'')['#'], '#': root.ask(plan), ok: {rtc: {offer: offer, id: opt.pid}}});
			}, function(){}, opt.rtc!.sdp);
			return peer;
		}
	});
}());

/** The app's global `gun`: upstream reads it as an implicit global (a ReferenceError without one) to emit `rtc` events on. */
declare var gun: Chain<RootMeta>;

/** Where the WebRTC constructors are looked up: `window` or node's `global`. */
interface RtcEnv {
	RTCPeerConnection?: typeof RTCPeerConnection;
	webkitRTCPeerConnection?: typeof RTCPeerConnection;
	mozRTCPeerConnection?: typeof RTCPeerConnection;
	RTCSessionDescription?: typeof RTCSessionDescription;
	webkitRTCSessionDescription?: typeof RTCSessionDescription;
	mozRTCSessionDescription?: typeof RTCSessionDescription;
	RTCIceCandidate?: typeof RTCIceCandidate;
	webkitRTCIceCandidate?: typeof RTCIceCandidate;
	mozRTCIceCandidate?: typeof RTCIceCandidate;
}

/** `opt.rtc`: the `RTCPeerConnection` configuration, plus lib/webrtc.js' settings. */
interface RtcOpt extends RTCConfiguration {
	/** The data channel options (default unordered, 2 retransmits). */
	dataChannel?: RTCDataChannelInit;
	/** The (legacy) offer / answer constraints. */
	sdp?: RTCOfferOptions & { mandatory?: { OfferToReceiveAudio?: boolean; OfferToReceiveVideo?: boolean } };
	/** How many peers to connect to (default 55). */
	max?: number;
	/** The room peers announce themselves in (default: the page's hash or path). */
	room?: string;
	/** When we last announced ourselves. */
	start?: number;
}

/** An SDP description from the wire. */
type RtcSdp = RTCSessionDescriptionInit & { sdp: string };

/** WebRTC signalling, carried in the `ok` of messages (`ok.rtc`). */
interface RtcSignal {
	/** The process id (`opt.pid`) of the peer. */
	id: string;
	offer?: RtcSdp;
	answer?: RtcSdp;
	candidate?: RTCIceCandidateInit;
}

/** The `ok` of a signalling message. */
interface RtcOk extends OkAck {
	rtc?: RtcSignal;
}

/** The data channel of a WebRTC peer. */
type RtcWire = RTCDataChannel & {
	/** Forget the connection attempt after a minute. */
	to?: Timer;
};

/** A WebRTC peer: the connection itself is the peer. */
interface RtcPeer extends RTCPeerConnection, Peer {
	id?: string;
	wire?: RtcWire;
	/** The chain its `rtc` events are emitted on. */
	$?: Chain;
	/** The remote description of an answer. */
	remoteSet?: RTCSessionDescription;
	/** Legacy event. */
	onremovetrack?: ((ev: RtcEvent) => void) | null;
	createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>;
	createAnswer(successCallback: RTCSessionDescriptionCallback, failureCallback: RTCPeerConnectionErrorCallback): Promise<void>;
	/** Upstream also passes the offer constraints to the legacy callback form. */
	createAnswer(successCallback: RTCSessionDescriptionCallback, failureCallback: RTCPeerConnectionErrorCallback, options?: RtcOpt['sdp']): Promise<void>;
}

/** A WebRTC event, emitted as `gun.on('rtc', eve)` with its peer. */
type RtcEvent = Event & { peer?: RtcPeer };

/** Upstream reuses the `for in` key variable for the peer it names (a key variable is typed `string`). */
type RtcPeerKey = string & RtcPeer;
/** Upstream reuses the `for in` key variable for the stream it names. */
type MediaKey = string & MediaStream;

/** `open`, which also keeps the connections in progress (by peer id) and the local media streams. */
interface RtcOpen {
	(msg: Msg, rtc: RtcSignal): RtcPeer;
	/** The media streams to add to new peers (`mesh.wire(stream)`), by id. */
	media?: Dict<MediaStream>;
	[id: string]: RtcPeer | Dict<MediaStream> | undefined;
}

declare module '../src/types' {
	interface GunOptions {
		/** `false` disables lib/webrtc.js. */
		RTCPeerConnection?: typeof RTCPeerConnection | false;
		RTCSessionDescription?: typeof RTCSessionDescription;
		RTCIceCandidate?: typeof RTCIceCandidate;
		rtc?: RtcOpt;
		/** lib/webrtc.js: announce ourselves in the room (on create). */
		announce?: (to?: unknown) => void;
	}
	interface MeshHear {
		/** lib/webrtc.js: WebRTC signalling. */
		rtc?: DamHandler;
	}
}

import type { Chain, Dict, GunStatic, Msg, OkAck, Peer, PutAtom, RootMeta, Timer } from '../src/types';
