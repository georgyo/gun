module.exports = require('./lib/server') as GunServer;

// `require('gun')` in node (package.json `main`): lib/server.js, `Gun` with `Gun.serve` and the server plugins.
import type { GunServer } from './lib/types';
