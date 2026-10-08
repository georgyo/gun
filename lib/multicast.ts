var Gun: GunStatic = (typeof window !== "undefined")? window.Gun : require('../gun');

Gun.on('create', function(root){
	this.to.next(root);
	var opt = root.opt;
  if(false === opt.multicast){ return }
  if((typeof process !== "undefined") && 'false' === ''+(process.env||{}).MULTICAST){ return }
	//if(true !== opt.multicast){ return } // disable multicast by default for now.

  var udp = opt.multicast = opt.multicast || {} as MulticastOpt;
  udp.address = udp.address || '233.255.255.255';
  udp.pack = udp.pack || 50000; // UDP messages limited to 65KB.
  udp.port  = udp.port || 8765;

  var noop = function(){}, u: undefined;
  var pid = '2'+Math.random().toString().slice(-8);
  var mesh = opt.mesh = opt.mesh || Gun.Mesh(root);
  var dgram: typeof import('dgram');

  try{ dgram = require("dgram") }catch(e){ return }
  var socket = dgram.createSocket({type: "udp4", reuseAddr: true});
  socket.bind({port: udp.port, exclusive: true}, function(){
    socket.setBroadcast(true);
    socket.setMulticastTTL(128);
  });

  socket.on("listening", function(){
    try { socket.addMembership(udp.address) }catch(e){ console.error(e); return; }
    udp.peer = {id: udp.address + ':' + udp.port, wire: socket};

    udp.peer.say = function(raw){
      var buf = Buffer.from(raw, 'utf8');
      if(udp.pack <= buf.length){ // message too big!!!
        return;
      }
      socket.send(buf, 0, buf.length, udp.port, udp.address, noop);
    }
    //opt.mesh.hi(udp.peer);

    Gun.log.once('multi', 'Multicast on '+udp.peer.id);
    return; // below code only needed for when WebSocket connections desired!
    setInterval(function broadcast(){
      port = port || (opt.web && opt.web.address() as Partial<AddressInfo>||{}).port;
      if(!port){ return }
      udp.peer!.say!(JSON.stringify({id: opt.pid || (opt.pid = Math.random().toString(36).slice(2)), port: port}));
    }, 1000);
  });

  socket.on("message", function(raw: Buffer | string, info) { try {
    if(!raw){ return }
    raw = raw.toString('utf8');
    if('2'===raw[0]){ return check(raw, info) }
    opt.mesh!.hear(raw, udp.peer!);

    return; // below code only needed for when WebSocket connections desired!
    var message: { id?: string };
    message = JSON.parse(raw.toString('utf8'));

    if(opt.pid === message.id){ return } // ignore self

    var url = 'http://' + info.address + ':' + (port || (opt.web && opt.web!.address() as Partial<AddressInfo>||{}).port) + '/gun';
    if(root.opt.peers[url]){ return }

    //console.log('discovered', url, message, info);
    root.$.opt(url);

  } catch(e){
    //console.log('multicast error', e, raw);
    return;
  } });

  function say(this: OntoListener<Msg>, msg: Msg){
    this.to.next(msg);
    if(!udp.peer){ return }
    mesh.say(msg, udp.peer);
  }

  function check(id?: string | Buffer, info?: RemoteInfo){ var tmp: GunStats | GunStats['gap'];
    if(!udp.peer){ return }
    if(!id){
      id = (check as MulticastCheck).id = (check as MulticastCheck).id || Buffer.from(pid, 'utf8');
      socket.send(id, 0, id.length, udp.port, udp.address, noop);
      return;
    }
    if((tmp = root.stats) && (tmp = tmp.gap) && info){ (tmp.near || (tmp.near = {}))[info.address] = info.port || 1 } // STATS!
    if((check as MulticastCheck).on || id === pid){ return }
    root.on('out', (check as MulticastCheck).on = say); // TODO: MULTICAST NEEDS TO BE CHECKED FOR NEW CODE SYSTEM!!!!!!!!!! // TODO: This approach seems interferes with other relays, below does not but...
    //opt.mesh.hi(udp.peer); //  IS THIS CORRECT?
  }

  setInterval(check, 1000 * 1);

});

/**
 * Never declared upstream: only the unreachable WebSocket discovery code reads
 * and writes it (it would be an implicit global).
 */
declare var port: number | undefined;

/** `check`, which remembers its ping and that it hooked `out`. */
interface MulticastCheck {
  (id?: string | Buffer, info?: RemoteInfo): void;
  /** The ping (`pid`). */
  id?: Buffer;
  /** The `out` listener, once installed. */
  on?: (this: OntoListener<Msg>, msg: Msg) => void;
}

/** `opt.multicast`: the UDP multicast transport (lib/multicast.js fills in the defaults). */
interface MulticastOpt {
  /** The multicast group (default `233.255.255.255`). */
  address: string;
  /** Messages this big or bigger are not sent (default 50000, UDP is limited to 65KB). */
  pack: number;
  /** Default 8765. */
  port: number;
  /** The peer every multicast message is said to and heard from. */
  peer?: Peer & { wire: Socket };
}

declare module '../src/types' {
  interface GunOptions {
    /** `false` disables lib/multicast.js. */
    multicast?: MulticastOpt | false;
  }
}

import type { AddressInfo } from 'net';
import type { RemoteInfo, Socket } from 'dgram';
import type { GunStatic, Msg, OntoListener, Peer } from '../src/types';
import type { GunStats } from './types';
