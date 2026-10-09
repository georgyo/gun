;(function(){
	function upload(this: UploadJQuery, cb?: UploadCb, opt?: UploadOpt | string){
		var el = $(this); cb = cb || function(){};
		opt = $.isPlainObject(opt)? opt : {input: opt}; 
		el.on('drop', function(e){
			e.preventDefault();
			(upload as Upload).drop(((e.originalEvent||e).dataTransfer||{} as Partial<DataTransfer>).files||[], 0);
		}).on('dragover', function(e){
			e.preventDefault();
		});
		$(opt.input||el).on('change', function(e: UploadEvent | FileList | null | undefined){
			if(!(e = ((e as UploadEvent).target||this||{} as { files?: undefined }).files)){ return }
			(upload as Upload).drop(e, 0);
		});
		(upload as Upload).drop = function(files,i){
			if(opt.max && ((files[i].fileSize as /* or undefined (compares false) */ number) > opt.max || files[i].size > opt.max)){
				cb({err: "File size is too large.", file: file[i]}, upload as Upload);
				if(files[++i]){ (upload as Upload).drop(files,i) }
				return false;
			}
			var reader = new FileReader();
			reader.onload = function(e){
				cb({file: files[i], event: e, id: i}, upload as Upload);
				if(files[++i]){ (upload as Upload).drop(files,i) }
			};
			if(files[i]){ reader.readAsDataURL(files[i]) }
		}
		return this;
	}
	upload.shrink = function(e?: UploadShrinkIn, cb?: UploadShrinkCb, w?: number, h?: number){ // via stackoverflow
		if(!e){ return cb && cb({err: "No file!"}) }
		if(e.err){ return }
		var file = (((e.event || e).target || e).result || e) as /* the data URL */ string, img = new Image();
		if(!((file||'').split(';')[0].indexOf('image') + 1)){ e.err = "Not an image!"; return cb!(e) }
    img.crossOrigin = "Anonymous";
    img.src = file;
    img.onload = function(){
    	if(img.width < (w = w || 1000) && img.height < (h||Infinity) && "data:" == file.slice(0,5)){
    		e.base64 = file;
    		return cb!(e || file);
    	}
      if(!h){ h = img.height * (w / img.width) }
			var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
	    canvas.width = w;
	    canvas.height = h;
	    ctx!.drawImage(img, 0, 0, w, h); // draw source image to canvas.
	    var b64 = e.base64 = canvas.toDataURL(); // base64 the shrunk image.
	    cb!((e.base64 && e) || b64); 
    };
	}
	$.fn.upload = upload as /* with `drop` once called */ Upload;
}());

/** A file, with the size property of old Firefox. */
type UploadFile = File & { fileSize?: number };

/** What `upload` calls back with for each file: the file read as a data URL (`event.target.result`), or an error. */
interface UploadAck {
	err?: string;
	file?: UploadFile;
	event?: ProgressEvent<FileReader>;
	/** Its index in the files dropped. */
	id?: number;
}

type UploadCb = (ack: UploadAck, upload: Upload) => void;

interface UploadOpt {
	/** A file input (or its selector) to read files from too. */
	input?: string | Element | UploadJQuery;
	/** The max size of a file, in bytes. */
	max?: number;
}

/** What `upload.shrink` takes: an `UploadAck`, or anything with a data URL in `target.result` / `result`. It adds `base64`. */
interface UploadShrinkIn {
	err?: string;
	event?: { target?: { result?: unknown } | null };
	target?: { result?: unknown } | null;
	result?: unknown;
	/** The image as a data URL, shrunk to fit `w` x `h` if needed. */
	base64?: string;
}

/** `upload.shrink`'s callback: the input with `base64` (or the data URL itself), or `{err}`. */
type UploadShrinkCb = (e: UploadShrinkIn | string) => void;

/**
 * `$(el).upload(cb, opt)`: the jQuery plugin of lib/upload.js. Read the files
 * dropped on the elements (or picked with `opt.input`) as data URLs.
 */
interface Upload {
	(this: UploadJQuery, cb?: UploadCb, opt?: UploadOpt | string): UploadJQuery;
	/** Read `files` from `i` on. Set by each `upload()` call (the last one wins). */
	drop(files: ArrayLike<UploadFile>, i: number): false | void;
	/** Shrink an image to `w` (default 1000) x `h` pixels. */
	shrink(e?: UploadShrinkIn, cb?: UploadShrinkCb, w?: number, h?: number): void;
}

/** A jQuery event, as lib/upload.js reads it. */
interface UploadEvent {
	preventDefault(): void;
	originalEvent?: { dataTransfer?: DataTransfer | null };
	dataTransfer?: DataTransfer | null;
	target?: { files?: FileList | null } | null;
}

/** The parts of jQuery (a global) lib/upload.js uses. */
interface UploadJQuery {
	on(events: string, handler: (this: HTMLInputElement, e: UploadEvent) => void): UploadJQuery;
}
interface UploadJQueryStatic {
	(selector: string | Element | UploadJQuery): UploadJQuery;
	isPlainObject(o: unknown): o is object;
	fn: { upload?: Upload };
}
declare var $: UploadJQueryStatic;

/** Never declared upstream (`files` was meant): reading it throws a ReferenceError. */
declare var file: ArrayLike<UploadFile>;
