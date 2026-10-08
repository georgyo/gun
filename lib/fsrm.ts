var fs: typeof import('fs') = require('fs');
var nodePath: typeof import('path') = require('path');

var dir = __dirname + '/../';

module.exports = function rm(path: string | null, full?: string) {
	path = full || nodePath.join(dir, path!); // `path` is only `null` with `full` (see `Rm`).
  if(!fs.existsSync(path)){ return }
  fs.readdirSync(path).forEach(function(file,index){
    var curPath = path + "/" + file;
    if(fs.lstatSync(curPath).isDirectory()) { // recurse
      rm(null, curPath);
    } else { // delete file
      fs.unlinkSync(curPath);
    }
  });
  fs.rmdirSync(path);
};

/** `require('gun/lib/fsrm')`: delete a directory (relative to GUN's root, or `full`) recursively. */
interface Rm {
	(path: string): void;
	(path: string | null, full: string): void;
}
