const fs = require('fs');
console.log("Checking size:", fs.statSync('./assets/untitled_design.svg.png').size);
