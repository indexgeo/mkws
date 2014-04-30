// Factory function for widget objects.
function widget($, team, type, node) {
    // Static register of attributes that do not contribute to config
    var ignoreAttrs = {
	id:1, 'class':1, style:1, name:1, action:1, type:1, size:1,
	value:1, width:1, valign:1
    };

    var that = {
	team: team,
	type: type,
	node: node,
	config: mkws.objectInheritingFrom(team.config())
    };

    function log(s) {
	team.log(s);
    }
    that.log = log;

    that.toString = function() {
	return '[Widget ' + team.name() + ':' + type + ']';
    };

    that.value = function() {
        return node.value;
    }

    for (var i = 0; i < node.attributes.length; i++) {
	var a = node.attributes[i];
	if (a.name === 'data-mkws-config') {
	    // Treat as a JSON fragment configuring just this widget
	    log(node + ": parsing config fragment '" + a.value + "'");
	    var data;
	    try {
		data = $.parseJSON(a.value);
		for (var key in data) {
		    log(node + ": adding config element " + key + "='" + data[key] + "'");
		    that.config[key] = data[key];
		}
	    } catch (err) {
		alert("Can't parse " + node + " data-mkws-config as JSON: " + a.value);
	    }
	} else if (a.name.match (/^data-mkws-/)) {
	    var name = a.name.replace(/^data-mkws-/, '')
	    that.config[name] = a.value;
	    log(node + ": set data-mkws attribute " + name + "='" + a.value + "'");
	} else if (!ignoreAttrs[a.name]) {
	    that.config[a.name] = a.value;
	    log(node + ": set regular attribute " + a.name + "='" + a.value + "'");
	}
    }

    var fn = mkws.promotionFunction(type);
    if (fn) {
	fn.call(that);
	log("made " + type + " widget(node=" + node + ")");
    } else {
	log("made UNPROMOTED widget(type=" + type + ", node=" + node + ")");
    }

    return that;
}


// Utility function for use by all widgets that can invoke autosearch.
widget.autosearch = function(widget) {
    widget.team.queue("ready").subscribe(function() {
	var query = widget.config.autosearch;
	if (query) {
	    if (query.match(/^!param!/)) {
		var param = query.replace(/^!param!/, '');
		query = mkws.getParameterByName(param);
		widget.log("obtained query '" + query + "' from param '" + param + "'");
		if (!query) {
		    alert("This page has a MasterKey widget that needs a query specified by the '" + param + "' parameter");
		}
	    } else if (query.match(/^!path!/)) {
		var index = query.replace(/^!path!/, '');
		var path = window.location.pathname.split('/');
		query = path[path.length - index];
		widget.log("obtained query '" + query + "' from path-component '" + index + "'");
		if (!query) {
		    alert("This page has a MasterKey widget that needs a query specified by the path-component " + index);
		}
            } else if (query.match(/^!var!/)) {
		var name = query.replace(/^!var!/, '');
		query = window[name]; // It's ridiculous that this works
		widget.log("obtained query '" + query + "' from variable '" + name + "'");
		if (!query) {
		    alert("This page has a MasterKey widget that needs a query specified by the '" + name + "' variable");
		}
	    }

	    var sortOrder = widget.config.sort;
	    var maxrecs = widget.config.maxrecs;
	    var perpage = widget.config.perpage;
	    var limit = widget.config.limit;
	    var targets = widget.config.targets;
	    var targetfilter = widget.config.targetfilter;
	    var target = widget.config.target;
	    if (target) targetfilter = 'udb=="' + target + '"';

	    var s = "running auto search: '" + query + "'";
	    if (sortOrder) s += " sorted by '" + sortOrder + "'";
	    if (maxrecs) s += " restricted to " + maxrecs + " records";
	    if (perpage) s += " with " + perpage + " per page";
	    if (limit) s += " limited by '" + limit + "'";
	    if (targets) s += " in targets '" + targets + "'";
	    if (targetfilter) s += " constrained by targetfilter '" + targetfilter + "'";
	    widget.log(s);

	    widget.team.newSearch(query, sortOrder, maxrecs, perpage, limit, targets, targetfilter);
	}
    });
};

