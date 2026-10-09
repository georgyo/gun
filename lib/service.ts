module.exports = function(root: ServiceRoot){
	var mesh = root.opt.mesh, cmd: Dict<ServiceCmd> = {}, run: typeof import('child_process').exec = require('child_process').exec, fs: typeof import('fs') = require('fs'), home: string = require('os').homedir(), examp: string = require('path').resolve(__dirname, '../examples');
	mesh.hear['service'] = function(msg: ServiceMsg, peer: Peer){
		if(!fs.existsSync('/lib/systemd/system/relay.service')){
			mesh.say({dam: '!', err: "Not serviced."});
			return;
		}
		try{ (cmd[msg.try as string]||cmd.any!)(msg, peer); }catch(err){ mesh.say({dam: '!', err: "service error: "+err}) }
	}
	cmd.https = function(msg, peer){ var log: string;
		if(!msg.email || !msg.domain){
			mesh.say({dam: '!', err: 'Domain/email missing, use `location.hostname`!'});
			return;
		}
		if(fs.existsSync(home+'/cert.pem')){
			mesh.say({dam: '!', err: 'Cert already exists.'});
			return;
		}
		fs.writeFile(examp+'/../email', msg.email, function(){});
		run("bash "+examp+"/https.sh", {env: {'EMAIL': msg.email, 'WEB': examp, 'DOMAIN':  msg.domain}}, function(e, out, err){
			log = "|"+e+"|"+out+"|"+err;
			mesh.say({dam: '!', log: ''+log}, peer);
			setTimeout(function(){ process.exit() },999);
		});
	}
	cmd.update = function(msg, peer){ var log: string, pass: string | undefined;
		try{ pass = (''+fs.readFileSync(home+'/pass')).trim() }catch(e){}
		if(!pass || (msg.pass||'').trim() != pass){ return }
		root.stats.stay.updated = +new Date;
		run("bash "+examp+"/install.sh", {env: {VERSION: msg.version||''}}, function(e, out, err){
			log = e+"|"+out+"|"+err;
			mesh.say({dam: '!', log: ''+log}, peer);
			setTimeout(function(){ process.exit() },999);
		});
	}
	;(function update(){ var last: number;
		if(!fs.existsSync(home+'/cert.pem')){ return }
		setTimeout(update, 1000*60*60*24);
		last = root.stats.stay.updated || 0;
		if(+new Date - last < 1000*60*60*24*15){ return }
		root.stats.stay.updated = +new Date;
		run("bash "+examp+"/install.sh", {}, function(){});
	}());

	cmd.any = function(){};

};

/** A command for the relay's system service (`dam: 'service'`). */
interface ServiceMsg extends Msg {
	/** The command: `https` (get a certificate) or `update` (reinstall GUN). */
	try?: string;
	email?: string;
	domain?: string;
	/** `update`: the password in `~/pass`. */
	pass?: string;
	/** `update`: the version to install. */
	version?: string;
}

type ServiceCmd = (msg: ServiceMsg, peer?: Peer) => void;

/** The root lib/service.js is installed on: a relay with a mesh and lib/stats.js. */
interface ServiceRoot extends RootMeta {
	opt: GunOptions & { mesh: Mesh };
	stats: GunStats & { stay: StatsStay };
}

/** `require('gun/lib/service')(root)`: answer `service` commands (relays run as a systemd service), and update daily. */
type Service = (root: ServiceRoot) => void;

declare module '../src/types' {
	interface MeshHear {
		/** lib/service.js. */
		service?: DamHandler;
	}
	interface Msg {
		/** lib/service.js: the output of a command (`dam: '!'`). */
		log?: string;
	}
}

import type { Dict, GunOptions, Mesh, Msg, Peer, RootMeta } from '../src/types';
import type { GunStats, StatsStay } from './types';
