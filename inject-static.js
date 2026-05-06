const fs = require('fs');

['index.html', 'index-en.html'].forEach(file => {
    if (!fs.existsSync(file)) return;
    let html = fs.readFileSync(file, 'utf8');
    
    // Add animate-on-scroll to hero section, feature cards, steps
    html = html.replace(/class="feature-card"/g, 'class="feature-card hover-lift animate-on-scroll"');
    html = html.replace(/class="step-card"/g, 'class="step-card hover-lift animate-on-scroll"');
    html = html.replace(/class="pricing-card"/g, 'class="pricing-card hover-lift animate-on-scroll"');
    
    fs.writeFileSync(file, html);
    console.log('Updated ' + file);
});
