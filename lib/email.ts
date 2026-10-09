;(function(){
	var email: EmailJs | undefined, fail: Email = {send: function(opt, cb){ cb && cb("You do not have email installed.") } };
	if(!process.env.EMAIL){ return module.exports = fail }
	try{ email = require('emailjs') }catch(e){};
	if(!email){ return module.exports = fail }
	return module.exports = email.server.connect({
	  user: process.env.EMAIL,
	  password: process.env.EMAIL_KEY,
	  host: process.env.EMAIL_HOST || "smtp.gmail.com",
	  ssl: process.env.EMAIL_SSL || true
	});
}());

/** The parts of `emailjs` (v2, not a dependency of GUN) lib/email.js uses. */
interface EmailJs {
	server: {
		connect(opt: { user?: string; password?: string; host: string; ssl: string | boolean }): Email;
	};
}
import type { Email } from './types';
