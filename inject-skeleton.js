const fs = require('fs');

const skeletonHtml = `
    <div class="design-card skeleton animate-on-scroll">
        <div class="card-thumb skeleton"></div>
        <div class="card-details">
            <div class="skeleton-title skeleton"></div>
            <div class="skeleton-text skeleton"></div>
        </div>
    </div>
    <div class="design-card skeleton animate-on-scroll">
        <div class="card-thumb skeleton"></div>
        <div class="card-details">
            <div class="skeleton-title skeleton"></div>
            <div class="skeleton-text skeleton"></div>
        </div>
    </div>
    <div class="design-card skeleton animate-on-scroll">
        <div class="card-thumb skeleton"></div>
        <div class="card-details">
            <div class="skeleton-title skeleton"></div>
            <div class="skeleton-text skeleton"></div>
        </div>
    </div>`;

['dashboard.html', 'dashboard-en.html', 'gallery.html', 'gallery-en.html'].forEach(file => {
    if (!fs.existsSync(file)) return;
    let html = fs.readFileSync(file, 'utf8');
    
    // Replace Spinner with Skeletons (Match any loading spinner structure)
    // In dashboard:
    html = html.replace(/<div style="grid-column:\s*1\/-1;\s*text-align:\s*center;\s*padding:\s*40px;">[\s\S]*?<\/div>/g, skeletonHtml);
    
    // Update JS class creation for dynamically loaded cards
    html = html.replace(/card\.className = 'design-card';/g, "card.className = 'design-card hover-lift animate-on-scroll';");
    html = html.replace(/el\.className = 'design-card';/g, "el.className = 'design-card hover-lift animate-on-scroll';");
    html = html.replace(/el\.className = 'request-card';/g, "el.className = 'request-card glass-panel hover-lift animate-on-scroll';");
    
    fs.writeFileSync(file, html);
    console.log('Updated ' + file);
});
