var site = {};
(function(site) {
    site.query = function (name) {
        url = location.search;
        if (name == null)
            return null;
        try {
            if (typeof name === "string") {
                var result = url.match(new RegExp("[\?\&]" + name + "=([^\&]+)", "i"));
                if (result == null || result.length < 1) {
                    return "";
                }
                return notToDecode ? result[1] : decodeURIComponent(result[1]);
            }
            else if (typeof name === "number") {
                var result = url.match(new RegExp("[\?\&][^\?\&]+=[^\?\&]+", "g"));
                if (result == null) {
                    return "";
                }
                return notToDecode ? result[name].substring(1) : decodeURIComponent(result[name].substring(1));
            }
        }
        catch (ex) { }
            return null;
    }
    site.blogs = function () {
        var cntEle = document.getElementById("blog_content");
        var id = site.query(0);
        $.get("config.json").then(function (r) {
            if (!r || !r.list || !(r.list instanceof Array)) return;
            var listHTML = "";
            r.list.forEach(function (item) {
                if (!item) return;
                if (!item.url || item.url.length < 17) {
                    item.invalid = true;
                    return;
                }

                var fileName = item.url.substring(12);
                var fileDate = item.url.substring(1, 11).replace("/", "").replace("/", "");
                var fileExtPos = fileName.indexOf(".");
                var fileExt = fileExtPos >= 0 ? fileName.substring(fileExtPos + 1) : "";
                fileName = fileExtPos > 0 ? fileName.substring(0, fileExtPos) : "";
                if (!fileName) {
                    item.invalid = true;
                    return;
                }

                if (!item.id) item.id = fileName;
                if (!item.date) item.date = fileDate;
                if (!item.type) item.type = fileExt;
            });

            if (!!id) {
                r.list.some(function (item) {
                    if (!item || item.invalid || item.id !== id) return false;
                    $.get("item.url").then(function (r2) {
                        listHTML += "<section>" + markdown.toHTML(r2) + "</section>";
                    });
                    return true;
                });
            }

            listHTML = "<ul>";
            r.list.forEach(function (item) {
                if (!item || item.invalid) return;
                listHTML += "<li><a href='?" + item.id + "'>" + item.name + "</a></li>";
            });
            listHTML += "</ul>";
            cntEle.innerHTML = cntHTML;
        }, function (r) {
            cntEle.innerHTML = "Failed to load";
        });
    };
})(site || (site = {}));