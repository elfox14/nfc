const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\TheFo\\Downloads\\nfc';

const files = fs.readdirSync(dir).filter(f => 
  (f.startsWith('blog-') || f.startsWith('nfc-for-')) && f.endsWith('.html')
);

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has og:type
  if (content.includes('property="og:type"')) {
    console.log(`Skipping ${file} - already has OG tags.`);
    return;
  }

  const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
  const descMatch = content.match(/<meta\s+name=["']description["'][\s\S]*?content=["']([\s\S]*?)["']/i);
  
  if (!titleMatch || !descMatch) {
    console.log(`Skipping ${file} - could not find title or description.`);
    return;
  }

  const title = titleMatch[1].trim();
  const desc = descMatch[1].trim().replace(/\n\s*/g, ' ');
  const url = `https://www.mcprim.com/nfc/${file}`;
  
  // Try to find a specific image, fallback to default
  let img = 'https://www.mcprim.com/nfc/og-image.png';
  if (content.includes('images/blog-events.svg')) img = 'https://www.mcprim.com/nfc/images/blog-events.svg';
  else if (content.includes('images/blog-egypt.svg')) img = 'https://www.mcprim.com/nfc/images/blog-egypt.svg';

  const locale = file.includes('-en') ? 'en_US' : 'ar_AR';

  const ogTags = `
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:site_name" content="MC PRIME" />
  <meta property="og:locale" content="${locale}" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="${url}" />
  <meta property="twitter:title" content="${title}" />
  <meta property="twitter:description" content="${desc}" />
  <meta property="twitter:image" content="${img}" />
`;

  // Inject before favicon link
  const faviconRegex = /(<link[^>]*rel=["']icon["'][^>]*>)/i;
  if (faviconRegex.test(content)) {
    content = content.replace(faviconRegex, ogTags + '\n  $1');
  } else {
    // Fallback: inject before </head>
    content = content.replace(/<\/head>/i, ogTags + '\n</head>');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
