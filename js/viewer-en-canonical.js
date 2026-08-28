// Dynamic canonical URL updater for viewer pages
(function() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    if (id) {
        var link = document.getElementById('canonical-link');
        if (link) link.href = link.href + '?id=' + encodeURIComponent(id);
    }
})();
