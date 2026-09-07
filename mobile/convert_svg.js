const sharp = require('sharp');
sharp('/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/hero-section.svg')
  .png()
  .toFile('./assets/hero-section.png')
  .then(() => console.log('Done'))
  .catch(err => console.error(err));
