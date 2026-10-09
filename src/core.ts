import type { GunStatic } from './types';
var Gun: GunStatic = require('./root');
require('./chain');
require('./back');
require('./put');
require('./get');
module.exports = Gun;
	
