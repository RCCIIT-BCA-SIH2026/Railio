const sharp = require('sharp');
sharp('./assets/hero-section.png').metadata().then(meta => {
  console.log(meta.width, meta.height);
});
