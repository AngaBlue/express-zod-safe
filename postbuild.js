const { copyFileSync } = require('node:fs');

copyFileSync('./cjs/index.cjs', './dist/index.cjs');
console.log('Patched cjs default export.')
