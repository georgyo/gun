function Store(opt?: RfsOpt): RfsStore{
	opt = opt || {};
	opt.log = opt.log || console.log;
	opt.file = String(opt.file || 'radata');
	var fs: typeof import('fs') = require('fs'), u: undefined;

	var store = function Store(){} as RfsStore;
	if((Store as RfsStatic)[opt.file]){
		console.log("Warning: reusing same fs store and options as 1st.");
		return (Store as RfsStatic)[opt.file]!;
	}
	(Store as RfsStatic)[opt.file] = store;
	var puts: Dict<{id: string, data: string}> = {};

	// TODO!!! ADD ZLIB INFLATE / DEFLATE COMPRESSION!
	store.put = function(file, data, cb){
		var random = Math.random().toString(36).slice(-3);
		puts[file] = {id: random, data: data};
		var tmp = opt.file+'-'+file+'-'+random+'.tmp';
		fs.writeFile(tmp, data, function(err, ok?: undefined){
			if(err){
				if(random === ((puts[file]||'') as {id?: string}).id){ delete puts[file] }
				return cb(err);
			}
			move(tmp, opt.file+'/'+file, function(err, ok){
				if(random === ((puts[file]||'') as {id?: string}).id){ delete puts[file] }
				cb(err, ok || !err);
			});
		});
	};
	store.get = function(file, cb){ var tmp: {id: string, data: string} | undefined; // this took 3s+?
		if(tmp = puts[file]){ cb(u, tmp.data); return }
		fs.readFile(opt.file+'/'+file, function(err, data){
			if(err){
				if('ENOENT' === (err.code||'').toUpperCase()){
					return cb();
				}
				opt.log!("ERROR:", err);
			}
			cb(err, data);
		});
	};

	if(!fs.existsSync(opt.file)){ fs.mkdirSync(opt.file) }

	function move(oldPath: string, newPath: string, cb: StoreAck) {
		fs.rename(oldPath, newPath, function (err) {
			if (err) {
				if (err.code === 'EXDEV') {
					var readStream = fs.createReadStream(oldPath);
					var writeStream = fs.createWriteStream(newPath);

					readStream.on('error', cb);
					writeStream.on('error', cb);

					readStream.on('close', function () {
						fs.unlink(oldPath, cb);
					});

					readStream.pipe(writeStream);
				} else {
					cb(err);
				}
			} else {
				cb();
			}
		});
	};

	store.list = function(cb, match, params, cbs){
		var dir = fs.readdirSync(opt.file!);
		dir.forEach(function(file){
			cb(file);
		})
		cb();
	};
	
	return store;
}

var Gun: GunStatic = (typeof window !== "undefined" && window.Gun) ? window.Gun : require('../gun');
Gun.on('create', function(root){
	this.to.next(root);
	var opt = root.opt;
	if(opt.rfs === false){ return }
	opt.store = opt.store || ((!Gun.window || opt.rfs === true) && Store(opt));
});

module.exports = Store;

/** `require('gun/lib/rfs')`: `Store(opt)`, which also keeps the stores by directory. */
interface RfsStatic {
	(opt?: RfsOpt): RfsStore;
	[file: string]: RfsStore | undefined;
}

declare module '../src/types' {
	interface GunOptions {
		/** `false` disables lib/rfs.js, `true` enables it in a browser too. */
		rfs?: boolean;
	}
}

import type { Dict, GunStatic } from '../src/types';
import type { RadiskStore, RfsOpt, RfsStore, StoreAck } from './types';
