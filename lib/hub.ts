const fs: typeof import('fs') = require('fs');
const Gun: GunStatic = require('../index.js');

const gun = Gun();

let chokidar: Chokidar | undefined;

try { chokidar = require('chokidar') } catch (error) {
} // Must install chokidar to use this feature.

/**
 * Watches a directory and send all its content in the database
 * @constructor
 * @param {string} what - Which directory hub should watch.
 * @param {Object} options - https://gun.eco/docs/hub.js#options
 */
function watch(what: string, options?: HubOptions) {
  options = options ?? { msg: true, hubignore: false, alias: require('os').userInfo().username }
  
  options.msg = options.msg ?? true;
  options.hubignore = options.hubignore ?? false;
  options.alias = options.alias ?? require('os').userInfo().username
  
  let modifiedPath = options.alias;

  let watcher!: ChokidarWatcher; 
  try {

    if (options.hubignore) {

      watcher = chokidar!.watch(what, { // A missing chokidar throws here (caught below).
        persistent: true
      });
    
    } else if (!options.hubignore) {

      watcher = chokidar!.watch(what, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
      });

    }
    
    const log = console.log.bind(console);
    
    let hubignore: string | undefined;

    // Handle events !
    watcher
      .on('add', async function(path) { 

        if (options.hubignore && path.includes('.hubignore')) {

          hubignore = fs.readFileSync(what + '/.hubignore', 'utf-8');

        } else if (!path.includes('.hubignore') && !hubignore?.includes(path.substring(path.lastIndexOf("/") + 1))) {

          if (options.msg) log(`File ${path} has been added`);

          if(path[path.search(/^./gm)] === "/" || ".") {
            gun.get('hub').get(modifiedPath + path.split(require('os').userInfo().username)[1]).put(fs.readFileSync(path, 'utf-8'))
          } else {
            gun.get('hub').get(modifiedPath + '/' + path.split(require('os').userInfo().username)[1]).put(fs.readFileSync(path, 'utf-8'))
          }

        } else {

          if(options.msg) log(`The addition of ${path} has been ignored !`)

        }
     
      })
      .on('change', async function(path) { 

        if (options.hubignore && path.includes('.hubignore')) {

          hubignore = fs.readFileSync(what + '/.hubignore', 'utf-8');

        } else if (!path.includes('.hubignore') && !hubignore?.includes(path.substring(path.lastIndexOf('/') + 1))) {
          
          if (options.msg) log(`File ${path} has been changed`);
          if(path[path.search(/^./gm)] === "/" || ".") {
            gun.get('hub').get(modifiedPath + path.split(require('os').userInfo().username)[1]).put(fs.readFileSync(path, 'utf-8'))
          } else {
            gun.get('hub').get(modifiedPath + '/' + path.split(require('os').userInfo().username)[1]).put(fs.readFileSync(path, 'utf-8'))
          }
        
        } else {

          if(options.msg) log(`The changes on ${path} has been ignored.`)

        }

      })
      .on('unlink', async function (path) {
        
        if (options.hubignore && path.includes('.hubignore')) {
          
          hubignore = fs.readFileSync(what + '/.hubignore', 'utf-8');

        } else if (!path.includes('.hubignore') && !hubignore?.includes(path.substring(path.lastIndexOf('/') + 1))) {

          if(options.msg) log(`File ${path} has been removed`);  
          if(path[path.search(/^./gm)] === "/" || ".") {
            gun.get('hub').get(modifiedPath + path.split(require('os').userInfo().username)[1]).put(null)
          } else {
						gun.get('hub').get(modifiedPath + '/' + path.split(require('os').userInfo().username)[1]).put(null)
          }


        } else {

          if(options.msg) log(`The deletion of ${path} has been ignored!`)

        }
      
      })
      if (options.msg) {
        watcher
        .on('addDir', path => log(`Directory ${path} has been added`))
        .on('unlinkDir', path => log(`Directory ${path} has been removed`))
        .on('error', error => log(`Watcher error: ${error}`))
        .on('ready', () => log('Initial scan complete. Ready for changes'))
      }

  } catch (err) {
    console.log('If you want to use the hub feature, you must install `chokidar` by typing `npm i chokidar` in your terminal.')
  }
}

module.exports = { watch : watch }

/** https://gun.eco/docs/hub.js#options */
interface HubOptions {
  /** Log what happens (default `true`). */
  msg?: boolean;
  /** Ignore the files listed in `<what>/.hubignore` (instead of dot files). */
  hubignore?: boolean;
  /** The name to store the files under (default: the OS user name). */
  alias?: string;
}

/** A chokidar watcher (only what lib/hub.js uses). */
interface ChokidarWatcher {
  on(ev: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir', cb: (path: string) => void): ChokidarWatcher;
  on(ev: 'error', cb: (error: unknown) => void): ChokidarWatcher;
  on(ev: 'ready', cb: () => void): ChokidarWatcher;
}

/** `require('chokidar')` (an optional peer of lib/hub.js, not a dependency of GUN). */
interface Chokidar {
  watch(what: string, opt: { ignored?: RegExp; persistent?: boolean }): ChokidarWatcher;
}

/** `require('gun/lib/hub')`: `watch(dir, options)` puts the files of `dir` (and their changes) in `gun.get('hub')`. */
interface Hub {
  watch: typeof watch;
}

import type { GunStatic } from '../src/types';
