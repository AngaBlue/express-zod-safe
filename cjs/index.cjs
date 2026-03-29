const mod = require('../dist/index.js');
const validate = mod.default || mod;

module.exports = validate;
module.exports.default = validate;
module.exports.DEFAULT_OPTIONS = mod.DEFAULT_OPTIONS;
module.exports.defaultErrorHandler = mod.defaultErrorHandler;
module.exports.setGlobalErrorHandler = mod.setGlobalErrorHandler;
module.exports.setGlobalOptions = mod.setGlobalOptions;
