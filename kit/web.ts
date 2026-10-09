;(function(){
var W = window, D = document, SW = screen.width, SH = screen.height, ON: 'addEventListener' = 'addEventListener', HI: 'createElement' = 'createElement', ID: 'getElementById' = 'getElementById', U: undefined, DEV = ('file://'===location.origin);
;(function(){ if(screen.width > screen.height){ return } // phone only debug
  var add = function(){ if(console.view){ return } (console.view = document[HI]('textarea')).style="position:fixed; z-index:99999; inset:0; width:100%; height:4em; padding: 0; background:rgba(100%,100%,100%,0.8); color:black; transition: 0.5s all; white-space: pre-wrap; overflow-wrap: break-word; word-break: break-all;"; console.view.readOnly = 1; setTimeout(function(){D.body.appendChild(console.view!);},99); console.view.onclick = function(eve){ console.view!.style.height = ('4em'==console.view!.style.height)?'50vh':'4em' ; console.view!.select(); D.execCommand('copy'); navigator.clipboard.writeText(console.view!.value) } }
  console.log = console.warn = console.error = function(...args: unknown[]){ if(console.off){ return } add(); console.view!.value += JSON.stringify(args).slice(1,-1); console.view!.scrollTop = console.view!.scrollHeight; }
  window.onerror = window.onunhandledrejection = console.log;
}());
var tmp: HTMLMetaElement | KitStyle | KitStub = D[HI]('meta'); tmp.name = 'viewport'; tmp.content = 'width=device-width, initial-scale=1, interactive-widget=resizes-content'; D.head.appendChild(tmp);
//(tmp=D[HI]('link')).rel="stylesheet"; tmp.href=((D.currentScript||'').src||'').replace('.js','.css'); D.head.appendChild(tmp); // auto-add CSS?
W.parent === W && ((tmp = (D.head.parentNode as HTMLElement).style as KitStyle)['overscroll-behavior-y'] = 'contain') && (tmp['background-color'] = 'var(--fill)');
function LOAD(src: string, h: HTMLScriptElement['onload'], s?: HTMLScriptElement){ (s = D[HI]('script')).onload = h; s.src = src; D.head.appendChild(s) };
function MAP(scroll: number, screen: number){ return (scroll / screen)>>0 }; // scroll, screen
kit = function(){} as Kit;
// dip, dive, into, eat, lid, tin, key, face
kit.ear = function(h: KitHear | KitType, e?: KitType | KitHear, v?: EventTarget){ (v=v||W)[ON](e=(h.call?(h.where=e as KitType):((e as KitHear).where=h,(h=e!).where))||'',h as KitHear); h.off = function(){ v.removeEventListener(e as KitType,h as KitHear) }; W===v&&kit.up(e,'ear'); return h as KitHear; };
kit.say = function(d,e,v,s){ (v=v||W).dispatchEvent(new CustomEvent(e=e||'',{detail:d,bubbles:true})); !s&&(W===v)&&kit.up(d,e) };
kit.up = function up(data,type,tmp?: undefined){
  if(W === W.parent){ return }
  if(U === data){ return } // TODO: BUG? maybe allow?
  if('message' == type){ return }
  //console.log(location.pathname.split('/').slice(-1)[0], "SENDING UP", type, data);
  W.parent.postMessage({detail:data,type:type,wrap:1},DEV?'*':location.origin);
}
W[ON]('message',function(eve: KitMessageEvent,data?: KitMsg,i?: HTMLIFrameElement,tmp?: undefined){
  if(W === eve.source){ return }
  if(eve.origin !== (DEV?'null':location.origin)){//.replace('file://','')||'null')){
    eve.preventDefault();
    eve.stopImmediatePropagation();
    eve.stopPropagation();
    return;
  }
  if(U === (data = eve.data||eve.detail)){ return } // TODO: BUG? maybe allow?
  if(!(i = kit.views.get(eve.source))){ // no iframe view? then message coming down to us from above.
    //console.log(location.pathname.split('/').slice(-1)[0], "GOT FROM ABOVE:", eve);
    kit.say(data.data||data.detail,data.type,0,1);
    return;
  }
  if('ear'==data.type){ kit.ear(data.detail as KitType||data.data as KitType,function hear(eve){ if(!(i||'').contentWindow){(hear as KitHear).off!(); return } i.contentWindow!.postMessage({data:eve.detail||eve.data,type:eve.type,wrap:-1}, DEV?'*':location.origin) }); return; }
  kit.say(data.data||data.detail,data.type,i);
});
kit.views = new Map;
(kit.watch = new MutationObserver(function(eve,b,low?: number){eve.forEach(function(changes){changes.addedNodes.forEach(function(node){ //console.log("observed change on", node);
  node.dispatchEvent(new CustomEvent('join '+node.nodeName.toLowerCase(), {bubbles:true}));
  node.dispatchEvent(new CustomEvent('join', {bubbles:true}));
  //low = kit.watch.low(node, low); 
})});
  //console.log(location.pathname.split('/').slice(-1)[0], "LOWEST", low, kit.watch.low(D.body), D.body.scrollHeight);
  kit.up({height:D.body.scrollHeight,width:D.body.scrollWidth},'style');
})).observe(D.documentElement||D,{childList:true,subtree:true,characterData:true});

kit.watch.low = function(v,l,f){ f='getBoundingClientRect'; return Math.max(((v[f]?v[f]():'' as KitNone<'bottom'>).bottom||0) + (W.pageYOffset || D.documentElement.scrollTop),l||0) }
kit.ear('join iframe',kit.add=function(eve){
  //console.log(location.pathname.split('/').slice(-1)[0], "JOIN");
  kit.views.set(eve.target.contentWindow, eve.target);
});
kit.ear('style',function(eve: KitStyleEvent,i?: undefined){
  if(!eve.target || !eve.target.style){ return }
  //console.log(location.pathname.split('/').slice(-1)[0], "resize:", eve.target, eve.detail);
  var h = (eve.detail||'' as KitNone<'height'>).height; if(h) eve.target.style.height = isNaN(h as number) ? h as string : h+'px'; // `isNaN` converts CSS text too.
  var w = (eve.detail||'' as KitNone<'width'>).width; if(w) eve.target.style.width = isNaN(w as number) ? w as string : w+'px'; // `isNaN` converts CSS text too.
},document);
kit.http = {createServer: function(h){
  h.listen = function(port,ip,cb){cb&&cb()};
  return kit.server = h;
},serve: function(req, res){ if(W.parent !== W){ return }
  kit.fs.createReadStream(req.url).pipe(res);
},req:function(path,body){ return this._last={url:path,
  method:body?'POST':'GET',body:body,
  headers:{},rawHeaders:[],rawTrailers:[],
  socket:tmp={},client:tmp,connection:tmp,
  resume: function(){},
  pause: function(){},
  isPaused: function(){}
}},res:function(end){ return {_req:this._last,
  end: end||kit.http.end,
  getHeader: function(){},
  setHeader: function(name, value){},
  writeHead: function(statusCode,headers){},
  write: function(data){},
  pipe: function(){}
}},end:function(data,id,i){
  id = this._req!.url.replace(location.__dirname,'').replace('file://','')/*.replace('.html','')*/.split('#')[0];
  //console.log("http.end", id, data, 'URL:', this._req.url);
  //(i = ((data||'').src? data : (D[ID](id) || D[HI]('iframe')))).id || (i.id = id);
  (i = D[ID](id) || D[HI]('iframe')).id || (i.id = id);
  D.querySelectorAll('.main').forEach(function(e){ e.classList.remove('main') });
  i.className = 'main page'; i.src||(i===D.body)||(i.srcdoc = data as /* a file's own page has a src */ string, D.body.appendChild(i)); location.hash = i.id; // TODO: BUG? Prevent double hash change
}};
W[ON]('submit', function(eve, act?: string){ eve.preventDefault();
  act = ((eve.target as HTMLFormElement).action||'').replace(location.__dirname+'/','').split('#')[0];
  //console.log(location.pathname.split('/').slice(-1)[0], 'submit', act);
  (kit.server||kit.http.serve)(
    kit.http.req(act,Object.fromEntries(new FormData(eve.target as HTMLFormElement))),
    kit.http.res()
  );
});
location.__dirname = location.href.split('/').slice(0,-1).join('/');
Object.defineProperty(location, 'path', {
  get(){ return kit.path },
  set(path: string){ if(!path){ return }
    path = path.replace(location.__dirname,'');
    if('.' == path[0]){ path = path.slice(1) }
    if('/' == path[0]){  path = path.slice(1) }
    //console.log(location.pathname.split('/').slice(-1)[0], 'path=', path, kit.path);
    if(kit.path === (kit.path = path)){ return }
    (kit.server||kit.http.serve)(kit.http.req(path),kit.http.res());
  }
});
kit.querystring = {
  parse: function(qs){ return Object.fromEntries((new URLSearchParams(qs)).entries()) }
}
kit.fs = {files:{},
  createReadStream(url){ url = (url||'').replace(location.__dirname+'/','').split('#')[0];
    //console.log("fs.cRS:", url);
    var data: string | KitPage | null | undefined = this.files[url], end = 0, tmp: KitStreamCb | undefined;
    return {_:{},
      on(eve,cb){ this._[eve] = cb; 'open'==eve&&setTimeout(cb, 0); return this }, // fake immediate open
      pipe(dest){ var rs = this, i: KitPage | null;
        if(end){ return dest } end = 1;
        function load(){ (data = i!).onload = 0;;
          if(!data){ return (tmp=rs._.error)&&tmp({code:'ENOENT'}) }
          (tmp=rs._.data)&&tmp(data);
          (tmp=rs._.end)&&tmp();
          dest.end(data);
        };
        if(i = D[ID](url)){ setTimeout(load,0) }
        else {
          (i = D[HI]('iframe')).onload = load
          i.id = (i.src = url)/*.replace('.html','')*/; D.body.appendChild(i);
        }
        //setTimeout(i.onload,0);
        return dest;
      }
    };
  }, readFileSync: function(path){

  }, readFile: function(path,opt,cb){

  }, writeFileSync: function(path,data){

  }, writeFile: function(path,data,opt,cb){

  }, createWriteStream: function(path,opt){

  }, readdir: function(path,cb){

  }
};
W[ON]('DOMContentLoaded',function(m: Event | HTMLElement){
  //m = D[HI]('main'); while(D.body.firstChild){ m.appendChild(D.body.firstChild) } D.body.appendChild(m);
  m=D.body;m.className = 'main page'; m.id = (kit.path = location.href.replace(location.__dirname+'/','').split('#')[0])/*.replace('.html','')*/;
  //console.log(location.pathname.split('/').slice(-1)[0], "kit hash add!");
  (function(){ function change(eve?: KitHashArg){ eve = eve||''; eve = eve.detail||eve.data||eve;
    var hash = (eve.newURL||'').split('#')[1]||'';
    if('.' == hash[0]){ location.hash = hash.slice(1); return; }
    if('/' == hash[0]){ location.hash = hash.slice(1); return; }
    //console.log(location.pathname.split('/').slice(-1)[0], "kit hashchange", hash, 'eve:', eve);
    if(!eve && !hash){ return }
    location.path = hash;
    eve && kit.up({newURL: eve.newURL, oldURL: eve.oldURL},'hashchange');
  }; W[ON]('hashchange',change) }());
  kit.up('','load');
  return;
  //if(location.hash){ kit.say('','hashchange') }
});
}());


/** `console`, with kit/web.js' debug view (phones only). */
declare var console: KitConsole;
/** `location`, with kit/web.js' `__dirname` and `path`. */
declare var location: KitLocation;

/** `(x || '').y`: `''` has none of the keys `K`. */
type KitNone<K extends string> = { [P in K]?: undefined };

/** The textarea that shows the console on phones (`readOnly` is set to `1`). */
type KitView = Omit<HTMLTextAreaElement, 'readOnly'> & { readOnly: boolean | 1 };

/** `console`, with kit/web.js' debug view. */
type KitConsole = Console & {
	view?: KitView;
	/** Mute the debug view. */
	off?: boolean;
};

/** `location`, with what kit/web.js adds. */
type KitLocation = Location & {
	/** The folder of the page. */
	__dirname: string;
	/** The path of the page shown (setting it serves that page). */
	path?: string;
};

/** The style of the root element, by CSS property name. */
type KitStyle = CSSStyleDeclaration & { 'overscroll-behavior-y'?: string; 'background-color'?: string };

/** A stand in object (the socket of a fake request). */
type KitStub = Dict<never>;

/** An event kit/web.js handles: a native event, or a `CustomEvent` (`detail`) or message (`data`) relayed between frames. */
type KitEvent = Event & { detail?: unknown; data?: unknown };

/** A listener of `kit.ear`, which can `off()` itself. */
type KitHear = Bivariant<(eve: KitEvent) => void> & {
	/** Its event type. */
	where?: string;
	off?: () => void;
};

/** An event type, where `kit.ear` also takes a listener (the arguments can be swapped). */
type KitType = string & { call?: undefined; where?: undefined; off?: undefined };

/** What frames post to each other. */
interface KitMsg {
	data?: unknown;
	detail?: unknown;
	type?: string;
	/** `1` going up, `-1` going down. */
	wrap?: number;
}

/** A `message` event (or a relayed one, in `detail`). */
interface KitMessageEvent extends MessageEvent {
	detail?: KitMsg;
}

/** A `join iframe` event: an iframe was added. */
interface KitJoinEvent extends Event {
	readonly target: HTMLIFrameElement;
}

/** The size a frame asks for. */
interface KitSize {
	height?: number | string;
	width?: number | string;
}

/** A `style` event: a frame asks to be resized. */
interface KitStyleEvent extends Event {
	readonly target: HTMLElement | null;
	detail?: KitSize | '';
}

/** A `hashchange` (native, or relayed in `detail` / `data`). */
interface KitHash {
	detail?: KitHash;
	data?: KitHash;
	newURL?: string;
	oldURL?: string;
}

/** A `hashchange`, or `''` for none. */
type KitHashArg = KitHash | (string & KitNone<'detail' | 'data' | 'newURL' | 'oldURL'>);

/** A page: an element with the id of a path, usually an iframe (`onload` is cleared with `0`). */
type KitPage = Omit<HTMLElement, 'onload'> & { onload: HTMLElement['onload'] | 0; src?: string; srcdoc?: string };

/** The form data of a fake request. */
type KitBody = Dict<FormDataEntryValue>;

/** A fake node request. */
interface KitReq {
	url: string;
	method: string;
	body?: KitBody;
	headers: Dict<string>;
	rawHeaders: string[];
	rawTrailers: string[];
	socket: KitStub;
	client: KitStub;
	connection: KitStub;
	resume(): void;
	pause(): void;
	isPaused(): void;
}

/** Ends a fake response: shows `data` in the page of the request's path. */
type KitEnd = (this: KitRes, data?: string | KitPage, id?: string, i?: KitPage) => void;

/** A fake node response. */
interface KitRes {
	_req?: KitReq;
	end: KitEnd;
	getHeader(name?: string): void;
	setHeader(name: string, value: unknown): void;
	writeHead(statusCode: number, headers?: unknown): void;
	write(data: unknown): void;
	pipe(): void;
}

/** A request handler (`http.createServer(h)`). */
interface KitServer {
	(req: KitReq, res: KitRes): void;
	listen?: (port?: unknown, ip?: unknown, cb?: () => void) => void;
}

/** `kit.http`: node's `http` in a page, serving pages into iframes. */
interface KitHttp {
	createServer(h: KitServer): KitServer;
	/** Serve the file of the request. */
	serve(req: KitReq, res: KitRes): void;
	req(this: KitHttp, path: string, body?: KitBody): KitReq;
	res(this: KitHttp, end?: KitEnd): KitRes;
	end: KitEnd;
	/** The last request. */
	_last?: KitReq;
}

/** A callback of a fake read stream. */
type KitStreamCb = (arg?: unknown) => void;

/** A fake read stream of a file (a page loaded into an iframe). */
interface KitReadStream {
	_: Dict<KitStreamCb>;
	on(this: KitReadStream, eve: string, cb: KitStreamCb): KitReadStream;
	pipe<T extends KitRes>(this: KitReadStream, dest: T): T;
}

/** `kit.fs`: node's `fs` in a page (only `createReadStream` works). */
interface KitFs {
	files: Dict<string>;
	createReadStream(this: KitFs, url?: string): KitReadStream;
	readFileSync(path: string): void;
	readFile(path: string, opt?: unknown, cb?: unknown): void;
	writeFileSync(path: string, data: unknown): void;
	writeFile(path: string, data: unknown, opt?: unknown, cb?: unknown): void;
	createWriteStream(path: string, opt?: unknown): void;
	readdir(path: string, cb?: unknown): void;
}

/** `kit.watch`: announces the nodes added to the document (`join` events) and the size of the page to the parent frame. */
type KitWatch = MutationObserver & {
	/** The bottom of `v` on the page (at least `l`). */
	low?: (v: Element, l?: number, f?: 'getBoundingClientRect') => number;
};

/** `kit` (kit/web.js, a global): events across frames, and node's `http` and `fs` in a page. */
interface Kit {
	(): void;
	/** Listen to `type` on `v` (default `window`; then frames above are asked to relay it). The arguments can be swapped. */
	ear: {
		(type: string, h: KitHear, v?: EventTarget): KitHear;
		(h: KitHear, type: string, v?: EventTarget): KitHear;
	};
	/** Dispatch `d` as a `CustomEvent` of type `e` on `v` (default `window`; then also send it up, unless `s`). */
	say: (d: unknown, e?: string, v?: EventTarget | 0, s?: number | boolean) => void;
	/** Post `data` as an event of `type` to the parent frame. */
	up: (data: unknown, type: string) => void;
	/** The iframes by their window. */
	views: Map<MessageEventSource | null, HTMLIFrameElement>;
	watch: KitWatch;
	/** Register an iframe. */
	add: Bivariant<(eve: KitJoinEvent) => void>;
	http: KitHttp;
	/** The handler of `http.createServer`. */
	server?: KitServer;
	querystring: { parse(qs: string): Dict<string> };
	fs: KitFs;
	/** The path of the page shown. */
	path?: string;
}

declare global {
	/** kit/web.js. */
	var kit: Kit;
}

import type { Bivariant, Dict } from '../src/types';
