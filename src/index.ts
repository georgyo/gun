import type { GunStatic } from './types';
var Gun: GunStatic = require('./root');
require('./shim');
require('./onto');
require('./book');
require('./valid');
require('./state');
require('./dup');
require('./ask');
require('./core');
require('./on');
require('./map');
require('./set');
require('./mesh');
require('./websocket');
require('./localStorage');
module.exports = Gun;
	
