console.log("IPFS PLUGIN NOT OFFICIALLY MAINTAINED! PROBABLY WON'T WORK! USE AT YOUR OWN RISK! PLEASE CONTRIBUTE FIXES!");
var opt = gun._.opt, u: undefined;
if (u === opt.ipfs.directory) {
  opt.ipfs.directory = '/gun';
}
opt.store = {} as RadiskStore;
opt.store.put = function(file, data, cb){
  var uri = opt.ipfs.directory + '/' + file;
  opt.ipfs.instance.files.write(uri, Buffer.from(JSON.stringify(data)), {create:true})
  .then(res => {
    console.log('File written to IPFS directory', uri, res);
    return opt.ipfs.instance.files.stat(opt.ipfs.directory, {hash:true});
  }).then(res => {
    console.log('Directory hash:', res.hash);
    return opt.ipfs.instance.name.publish(res.hash);
    // currently throws "This command must be run in online mode. Try running 'ipfs daemon' first." for some reason, maybe js-ipfs IPNS not ready yet
  }).then(res => {
    console.log('IPFS put request successful:', res);
    cb(undefined, 1);
  }).catch(error => {
    console.error('IPFS put request failed', error);
  });
}
opt.store.get = function(file, cb){
    var uri = opt.ipfs.directory + '/' + file;
    opt.ipfs.instance.files.read(uri, {})
    .then(res => {
      var data = JSON.parse(res.toString());
      console.log(uri + ' was loaded from ipfs:', data);
      cb(data);
    });
}
opt.store.list = function(cb){
    var stream = opt.ipfs.files.lsReadableStream(opt.ipfs.directory);

    stream.on('data', (file) => {
      console.log('ls', file.name);
      if (cb(file.name)) {
        stream.destroy();
      }
    });

    stream.on('finish', () => {
      cb();
    });
}

/** The global `gun` this script makes store its files on IPFS: created with `{ipfs: {instance, ...}}`. */
declare var gun: Chain<RootMeta> & { _: { opt: GunOptions & { ipfs: IpfsOpt } } };

/** A stream of the files of a directory. */
interface IpfsLsStream {
	on(ev: 'data', cb: (file: { name: string }) => void): void;
	on(ev: 'finish', cb: () => void): void;
	destroy(): void;
}

/** The parts of a js-ipfs node (not a dependency of GUN) lib/ipfs.js uses. */
interface IpfsInstance {
	files: {
		write(path: string, data: Buffer, opt: { create: boolean }): Promise<unknown>;
		stat(path: string, opt: { hash: boolean }): Promise<{ hash: string }>;
		read(path: string, opt: {}): Promise<{ toString(): string }>;
	};
	name: {
		publish(hash: string): Promise<unknown>;
	};
}

/** `opt.ipfs`. */
interface IpfsOpt {
	instance: IpfsInstance;
	/** The IPFS directory of the files (default `/gun`, filled in by lib/ipfs.js). */
	directory: string;
	/** Upstream lists the files with `opt.ipfs.files`, not `opt.ipfs.instance.files`. */
	files: {
		lsReadableStream(path: string): IpfsLsStream;
	};
}

declare module '../src/types' {
	interface GunOptions {
		/** lib/ipfs.js. */
		ipfs?: IpfsOpt;
	}
}

import type { Chain, GunOptions, RootMeta } from '../src/types';
import type { RadiskStore } from './types';
