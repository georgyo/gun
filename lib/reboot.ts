;(function(){
	var exec: typeof import('child_process').execSync = require('child_process').execSync;
	var dir = __dirname, tmp: Error | Buffer | string | undefined;

	try{exec("crontab -l");
	}catch(e){tmp = e as Error}
	if(0 > tmp!.toString().indexOf('no')){ return } // Upstream throws (TypeError) here when `crontab -l` succeeds.

	try{tmp = exec('which node').toString();
	}catch(e){console.log(e);return}

	try{tmp = exec('echo "@reboot '+tmp+' '+dir+'/../examples/http.js" > '+dir+'/reboot.cron');
	}catch(e){console.log(e);return}

	try{tmp = exec('crontab '+dir+'/reboot.cron');
	}catch(e){console.log(e);return}
	console.log(tmp.toString());

}());