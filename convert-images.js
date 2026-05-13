const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\TheFo\\Downloads\\nfc';
const files = ['card-front.png', 'live_site.png'];

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    const webpPath = filePath.replace('.png', '.webp');
    sharp(filePath)
      .webp({ quality: 80 })
      .toFile(webpPath)
      .then(() => console.log(`Converted ${file} to WebP`))
      .catch(err => console.error(`Error converting ${file}:`, err));
  } else {
    console.log(`File not found: ${file}`);
  }
});
