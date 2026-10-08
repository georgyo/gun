var fs: typeof import('fs') = require('fs');
var path: typeof import('path') = require('path');
var dot = /\.\.+/g;
var slash = /\/\/+/g;

function CDN(dir: string): ServeHandler{
	return function(req, res){
		req.url = (req.url||'').replace(dot,'').replace(slash,'/');
		if(serve(req, res)){ return } // filters GUN requests!
		if (req.url.slice(-3) === '.js') {
			res.writeHead(200, {'Content-Type': 'text/javascript'});
		}
		fs.createReadStream(path.join(dir, req.url)).on('error',function(tmp){ // static files!
			fs.readFile(path.join(dir, 'index.html'), function(err, tmp){
				try{ res.writeHead(200, {'Content-Type': 'text/html'});
				res.end(tmp+''); }catch(e){} // or default to index
		})}).pipe(res); // stream
	}
}
function serve(dir: string): ServeHandler; function serve(req?: IncomingMessage | null, res?: ServerResponse | null, next?: ServeNext): unknown;
function serve(req?: IncomingMessage | string | null, res?: ServerResponse | null, next?: ServeNext): unknown{ var tmp: ServeSocket | ServeServer | ServeRoutes | ServeNext | undefined;
	if(typeof req === 'string'){
		return CDN(req);
	}
	if(!req || !res){ return false }
	next = next || serve;
	if(!req.url){ return next() }
	if(res.setHeader){ res.setHeader('Access-Control-Allow-Origin', '*') }
	if(0 <= req.url.indexOf('gun.js')){
		res.writeHead(200, {'Content-Type': 'text/javascript'});
		res.end(serve.js = serve.js || require('fs').readFileSync(__dirname + '/../gun.js'));
		return true;
	}
	if(0 <= req.url.indexOf('gun/')){
		var path = __dirname + '/../' + req.url.split('/').slice(2).join('/');
		if('/' === path.slice(-1)){
			fs.readdir(path, function(err, dir){ res.end((dir || (err && 404))+'') });
			return true;
		}
		var S = +new Date;
		var rs = fs.createReadStream(path);
		rs.on('open', function(){ console.STAT && console.STAT(S, +new Date - S, 'serve file open'); rs.pipe(res) });
		rs.on('error', function(err){ res.end(404+'') });
		rs.on('end', function(){ console.STAT && console.STAT(S, +new Date - S, 'serve file end') });
		return true;
	}
	if((tmp = req.socket as ServeSocket) && (tmp = tmp.server) && (tmp = tmp.route)){ var url: undefined;
		if(tmp = (tmp as ServeRoutes)[(((req.url||'').slice(1)).split('/')[0]||'').split('.')[0]]){
			try{ return tmp(req, res, next) }catch(e){ console.log(req.url+' crashed with '+e) }
		}
	}
	return next();
}

module.exports = serve;

/** A request handler for `http.createServer` (what `Gun.serve(dir)` returns). */
type ServeHandler = (req: IncomingMessage, res: ServerResponse) => void;

/** What `serve` calls when it does not handle a request: the `next` of a middleware, or a route handler (with `req, res, next`). */
type ServeNext = (req?: IncomingMessage, res?: ServerResponse, next?: ServeNext) => unknown;

/** Custom routes: `server.route[name]` handles `/name...` (and `/name.ext`). */
type ServeRoutes = { [name: string]: ServeNext | undefined };

/** An http server with custom routes. */
interface ServeServer {
	route?: ServeRoutes;
}

/** The socket of a request, with the server that accepted it. */
interface ServeSocket {
	server?: ServeServer;
}

/**
 * `Gun.serve` (lib/serve.js): with a directory, a handler serving GUN and
 * the static files of the directory; as a middleware `(req, res, next)`, it
 * serves `gun.js` and `/gun/*` files, else custom routes, else calls `next`.
 */
type Serve = typeof serve;

declare module '../src/types' {
	interface GunStatic {
		/** lib/serve.js, set by lib/server.js. */
		serve?: Serve;
	}
}

import type { IncomingMessage, ServerResponse } from 'http'; declare namespace serve { /** The cached `gun.js`. */ var js: Buffer | undefined }
