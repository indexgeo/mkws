mkws.registerWidgetType('Categories', function() {
    var that = this;

    if (!this.config.use_service_proxy) {
	alert("can't use categories widget without Service Proxy");
	return;
    }

    this.team.queue("authenticated").subscribe(function(authName, realm) {
	var req = new pzHttpRequest(that.config.pazpar2_url + "?command=categories", function(err) {
	    alert("HTTP call for categories failed: " + err)
	});

	req.get(null, function(data) {
	    if (!$.isXMLDoc(data)) {
		alert("categories response document is not XML");
		return;
	    }
	    that.log("got categories: " + data);

            var text = [];
            text.push("Select category: ");
            text.push("<select name='mkwsCategory' onchange='alert(1)'>");
            $(data).find('category').each(function() {
                var name = $(this).find('categoryName').text();
                var id = $(this).find('categoryId').text();
                text.push("<option value='", id, "'>", name, "</option>");
            });
            text.push("</select>");
	    $(that.node).html(text.join(''));
	});
    });
});
