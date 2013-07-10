/* A very simple client that shows a basic usage of the pz2.js
*/

"use strict"; // HTML5: disable for debug >= 2

/*
 * global config object: mkws_config
 *
 * needs to be defined in the HTML header before
 * including this JS file
 */

if (!mkws_config)
    var mkws_config = {}; // for the guys who forgot to define mkws_config...

if (typeof mkws_config.use_service_proxy === 'undefined')
    mkws_config.use_service_proxy = true;

// global debug flag
var mkws_debug;

var pazpar2_url = mkws_config.pazpar2_url ? mkws_config.pazpar2_url : "/pazpar2/search.pz2";
var service_proxy_url = mkws_config.service_proxy_url ? mkws_config.service_proxy_url : "http://mkws.indexdata.com/service-proxy/";

var pazpar2path = mkws_config.use_service_proxy ? service_proxy_url : pazpar2_url;
var usesessions = mkws_config.use_service_proxy ? false : true;


var mkws_locale_lang = {
    "de": {
	"Authors": "Autoren",
	"Subjects": "Schlagw&ouml;rter",
	"Sources": "Daten und Quellen",
	"Termlists": "Termlisten",
	"Next": "Weiter",
	"Prev": "Zur&uuml;ck",
	"Search": "Suche",
	"Sort by": "Sortieren nach",
	"and show": "und zeige",
	"per page": "pro Seite",
	"Displaying": "Zeige",
	"to": "von",
	"of": "aus",
	"found": "gefunden",
	"Title": "Titel",
	"Author": "Autor",
	"Date": "Datum",
	"Subject": "Schlagwort",
	"Location": "Ort",

	"dummy": "dummy"
    },

    "da": {
	"Authors": "Forfattere",
	"Subjects": "Emner",
	"Sources": "Kilder",
	"Termlists": "Termlists",
	"Next": "N&aelig;ste",
	"Prev": "Forrige",
	"Search": "S&oslash;g",
	"Sort by": "Sorter efter",
	"and show": "og vis",
	"per page": "per side",
	"Displaying": "Viser",
	"to": "til",
	"of": "ud af",
	"found": "fandt",
	"Title": "Title",
	"Author": "Forfatter",
	"Date": "Dato",
	"Subject": "Emneord",
	"Location": "Lokation",

	"dummy": "dummy"
    }
};


for (var key in mkws_config) {
    if (mkws_config.hasOwnProperty(key)) {
	if (key.match(/^language_/)) {
	    var lang = key.replace(/^language_/, "");
	    // Copy custom languages into list
	    mkws_locale_lang[lang] = mkws_config[key];
	}
    }
}


// create a parameters array and pass it to the pz2's constructor
// then register the form submit event with the pz2.search function
// autoInit is set to true on default
var my_paz = new pz2( { "onshow": my_onshow,
                    "showtime": 500,            //each timer (show, stat, term, bytarget) can be specified this way
                    "pazpar2path": pazpar2path,
                    "oninit": my_oninit,
                    "onstat": my_onstat,
                    "onterm": my_onterm,
                    "termlist": "xtargets,subject,author",
                    "onbytarget": my_onbytarget,
	 	    "usesessions" : usesessions,
                    "showResponseType": '', // or "json" (for debugging?)
                    "onrecord": my_onrecord } );
// some state vars
var curPage = 1;
var recPerPage = 20;
var totalRec = 0;
var curDetRecId = '';
var curDetRecData = null;
var curSort = 'relevance';
var curFilter = null;
var submitted = false;
var SourceMax = 16;
var SubjectMax = 10;
var AuthorMax = 10;

//
// pz2.js event handlers:
//
function my_oninit() {
    my_paz.stat();
    my_paz.bytarget();
}

function my_onshow(data) {
    totalRec = data.merged;
    // move it out
    var pager = document.getElementById("mkwsPager");
    pager.innerHTML = "";
    pager.innerHTML +='<div style="float: right">' + M('Displaying') + ': '
                    + (data.start + 1) + ' ' + M('to') + ' ' + (data.start + data.num) +
                     ' ' + M('of') + ' ' + data.merged + ' (' + M('found') + ': '
                     + data.total + ')</div>';
    drawPager(pager);
    // navi
    var results = document.getElementById("mkwsRecords");

    var html = [];
    for (var i = 0; i < data.hits.length; i++) {
        var hit = data.hits[i];
	      html.push('<div class="record" id="mkwsRecdiv_'+hit.recid+'" >'
            +'<span>'+ (i + 1 + recPerPage * (curPage - 1)) +'. </span>'
            +'<a href="#" id="mkwsRec_'+hit.recid
            +'" onclick="showDetails(this.id);return false;"><b>'
            + hit["md-title"] +' </b></a>');
	      if (hit["md-title-remainder"] !== undefined) {
	        html.push('<span>' + hit["md-title-remainder"] + ' </span>');
	      }
	      if (hit["md-title-responsibility"] !== undefined) {
    	    html.push('<span><i>'+hit["md-title-responsibility"]+'</i></span>');
      	}
        if (hit.recid == curDetRecId) {
            html.push(renderDetails(curDetRecData));
        }
      	html.push('</div>');
    }
    replaceHtml(results, html.join(''));
}

function my_onstat(data) {
    var stat = document.getElementById("mkwsStat");
    if (stat == null)
	return;

    stat.innerHTML = '<span class="head">Status info</span>' +
	' -- ' +
	'<span class="clients">' + data.activeclients + '/' + data.clients + '</span>' +
	' -- ' +
        '<span class="records">' + data.records + '/' + data.hits + '</span>';
}

function my_onterm(data) {
    // no facets
    if (!mkws_config.facets || mkws_config.facets.length == 0) {
	$("#mkwsTermlists").hide();
	return;
    }

    // display if we first got results
    $("#mkwsTermlists").show();

    var acc = [];
    acc.push('<div class="title">' + M('Termlists') + '</div>');
    var facets = mkws_config.facets;

    for(var i = 0; i < facets.length; i++) {
	if (facets[i] == "sources") {
	    add_single_facet(acc, "Sources",  data.xtargets, SourceMax, null);
	} else if (facets[i] == "subjects") {
	    add_single_facet(acc, "Subjects", data.subject,  SubjectMax, "su");
	} else if (facets[i] == "authors") {
	    add_single_facet(acc, "Authors",  data.author,   AuthorMax, "au");
	} else {
	    alert("bad facet configuration: '" + facets[i] + "'");
	}
    }

    var termlist = document.getElementById("mkwsTermlists");
    replaceHtml(termlist, acc.join(''));
}

function add_single_facet(acc, caption, data, max, cclIndex) {
    acc.push('<div class="facet">');
    acc.push('<div class="termtitle">' + M(caption) + '</div>');
    for (var i = 0; i < data.length && i < max; i++ ) {
        acc.push('<a href="#" ');
	var action;
	if (!cclIndex) {
	    // Special case: target selection
	    acc.push('target_id='+data[i].id+' ');
	    action = 'limitTarget(this.getAttribute(\'target_id\'),this.firstChild.nodeValue)';
	} else {
	    action = 'limitQuery(\'' + cclIndex + '\', this.firstChild.nodeValue)';
	}
	acc.push('onclick="' + action + ';return false;">' + data[i].name + '</a>'
		 + '<span> (' + data[i].freq + ')</span><br/>');
    }
    acc.push('</div>');
}

function my_onrecord(data) {
    // FIXME: record is async!!
    clearTimeout(my_paz.recordTimer);
    // in case on_show was faster to redraw element
    var detRecordDiv = document.getElementById('mkwsDet_'+data.recid);
    if (detRecordDiv) return;
    curDetRecData = data;
    var recordDiv = document.getElementById('mkwsRecdiv_'+curDetRecData.recid);
    var html = renderDetails(curDetRecData);
    recordDiv.innerHTML += html;
}

function my_onbytarget(data) {
    var targetDiv = document.getElementById("mkwsBytarget");
    var table ='<table><thead><tr><td>Target ID</td><td>Hits</td><td>Diags</td>'
        +'<td>Records</td><td>State</td></tr></thead><tbody>';

    for (var i = 0; i < data.length; i++ ) {
        table += "<tr><td>" + data[i].id +
            "</td><td>" + data[i].hits +
            "</td><td>" + data[i].diagnostic +
            "</td><td>" + data[i].records +
            "</td><td>" + data[i].state + "</td></tr>";
    }

    table += '</tbody></table>';
    targetDiv.innerHTML = table;
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// wait until the DOM is ready
function domReady ()
{
    document.mkwsSearchForm.onsubmit = onFormSubmitEventHandler;
    document.mkwsSearchForm.mkwsQuery.value = '';
    if (document.mkwsSelect) {
	if (document.mkwsSelect.mkwsSort)
	    document.mkwsSelect.mkwsSort.onchange = onSelectDdChange;
	if (document.mkwsSelect.mkwsPerpage)
	    document.mkwsSelect.mkwsPerpage.onchange = onSelectDdChange;
    }
}

// when search button pressed
function onFormSubmitEventHandler()
{
    resetPage();
    loadSelect();
    triggerSearch();
    switchView('records'); // In case it's configured to start off as hidden
    submitted = true;
    return false;
}

function onSelectDdChange()
{
    if (!submitted) return false;
    resetPage();
    loadSelect();
    my_paz.show(0, recPerPage, curSort);
    return false;
}

function resetPage()
{
    curPage = 1;
    totalRec = 0;
}

function triggerSearch ()
{
    my_paz.search(document.mkwsSearchForm.mkwsQuery.value, recPerPage, curSort, curFilter);
}

function loadSelect ()
{
    if (document.mkwsSelect) {
	if (document.mkwsSelect.mkwsSort)
	    curSort = document.mkwsSelect.mkwsSort.value;
	if (document.mkwsSelect.mkwsPerpage)
	    recPerPage = document.mkwsSelect.mkwsPerpage.value;
    }
}

// limit the query after clicking the facet
function limitQuery (field, value)
{
    document.mkwsSearchForm.query.value += ' and ' + field + '="' + value + '"';
    onFormSubmitEventHandler();
}

// limit by target functions
function limitTarget (id, name)
{
    var navi = document.getElementById('mkwsNavi');
    navi.innerHTML =
        'Source: <a class="crossout" href="#" onclick="delimitTarget();return false;">'
        + name + '</a>';
    curFilter = 'pz:id=' + id;
    resetPage();
    loadSelect();
    triggerSearch();
    return false;
}

function delimitTarget ()
{
    var navi = document.getElementById('mkwsNavi');
    navi.innerHTML = '';
    curFilter = null;
    resetPage();
    loadSelect();
    triggerSearch();
    return false;
}

function drawPager (pagerDiv)
{
    //client indexes pages from 1 but pz2 from 0
    var onsides = 6;
    var pages = Math.ceil(totalRec / recPerPage);

    var firstClkbl = ( curPage - onsides > 0 )
        ? curPage - onsides
        : 1;

    var lastClkbl = firstClkbl + 2*onsides < pages
        ? firstClkbl + 2*onsides
        : pages;

    var prev = '<span id="mkwsPrev">&#60;&#60; ' + M('Prev') + '</span><b> | </b>';
    if (curPage > 1)
        prev = '<a href="#" id="mkwsPrev" onclick="pagerPrev();">'
        +'&#60;&#60; ' + M('Prev') + '</a><b> | </b>';

    var middle = '';
    for(var i = firstClkbl; i <= lastClkbl; i++) {
        var numLabel = i;
        if(i == curPage)
            numLabel = '<b>' + i + '</b>';

        middle += '<a href="#" onclick="showPage(' + i + ')"> '
            + numLabel + ' </a>';
    }

    var next = '<b> | </b><span id="mkwsNext">' + M('Next') + ' &#62;&#62;</span>';
    if (pages - curPage > 0)
        next = '<b> | </b><a href="#" id="mkwsNext" onclick="pagerNext()">'
        + M('Next') + ' &#62;&#62;</a>';

    var predots = '';
    if (firstClkbl > 1)
        predots = '...';

    var postdots = '';
    if (lastClkbl < pages)
        postdots = '...';

    pagerDiv.innerHTML += '<div style="float: clear">'
        + prev + predots + middle + postdots + next + '</div>';
}

function showPage (pageNum)
{
    curPage = pageNum;
    my_paz.showPage( curPage - 1 );
}

// simple paging functions

function pagerNext() {
    if ( totalRec - recPerPage*curPage > 0) {
        my_paz.showNext();
        curPage++;
    }
}

function pagerPrev() {
    if ( my_paz.showPrev() != false )
        curPage--;
}

// switching view between targets and records

function switchView(view) {
    var targets = document.getElementById('mkwsTargets');
    var results = document.getElementById('mkwsResults') ||
	          document.getElementById('mkwsRecords');
    var blanket = document.getElementById('mkwsBlanket');
    var motd    = document.getElementById('mkwsMOTD');

    switch(view) {
        case 'targets':
            if (targets) targets.style.display = "block";
            if (results) results.style.display = "none";
            if (blanket) blanket.style.display = "none";
            if (motd) motd.style.display = "none";
            break;
        case 'records':
            if (targets) targets.style.display = "none";
            if (results) results.style.display = "block";
            if (blanket) blanket.style.display = "block";
            if (motd) motd.style.display = "none";
            break;
	case 'none':
            if (targets) targets.style.display = "none";
            if (results) results.style.display = "none";
            if (blanket) blanket.style.display = "none";
            if (motd) motd.style.display = "none";
            break;
        default:
            alert("Unknown view '" + view + "'");
    }
}

// detailed record drawing
function showDetails (prefixRecId) {
    var recId = prefixRecId.replace('mkwsRec_', '');
    var oldRecId = curDetRecId;
    curDetRecId = recId;

    // remove current detailed view if any
    var detRecordDiv = document.getElementById('mkwsDet_'+oldRecId);
    // lovin DOM!
    if (detRecordDiv)
      detRecordDiv.parentNode.removeChild(detRecordDiv);

    // if the same clicked, just hide
    if (recId == oldRecId) {
        curDetRecId = '';
        curDetRecData = null;
        return;
    }
    // request the record
    my_paz.record(recId);
}

function replaceHtml(el, html) {
  var oldEl = typeof el === "string" ? document.getElementById(el) : el;
  /*@cc_on // Pure innerHTML is slightly faster in IE
    oldEl.innerHTML = html;
    return oldEl;
    @*/
  var newEl = oldEl.cloneNode(false);
  newEl.innerHTML = html;
  oldEl.parentNode.replaceChild(newEl, oldEl);
  /* Since we just removed the old element from the DOM, return a reference
     to the new element, which can be used to restore variable references. */
  return newEl;
};

function renderDetails(data, marker)
{
    var details = '<div class="details" id="mkwsDet_'+data.recid+'"><table>';
    if (marker) details += '<tr><td>'+ marker + '</td></tr>';

    details += renderField("Title", data["md-title"], data["md-title-remainder"], data["md-title-responsibility"]);
    details += renderField("Date", data["md-date"]);
    details += renderField("Author", data["md-author"]);
    details += renderField("URL", data["md-electronic-url"]);
    details += renderField("Subject", data["location"][0]["md-subject"]);
    details += renderField("Location", data["location"][0]["@name"], data["location"][0]["@id"]);
    details += '</table></div>';

    return details;
}

function renderField(caption, data, data2, data3) {
    if (data === undefined) {
	return "";
    }

    if (caption == "URL") {
	data = '<a href="' + data + '" target="_blank">' + data + '</a>';
    }

    if (data2 != undefined) {
	data = data + " (" + data2 + ")";
    }

    if (data3 != undefined) {
	data = data + " <i>" + data3 + "</i>";
    }

    return '<tr><th>' + M(caption) + '</th><td>' + data + '</td></tr>';
}


/*
 * All the HTML stuff to render the search forms and
 * result pages.
 */
function mkws_html_all(config) {

    /* default mkws config */
    var mkws_config_default = {
	sort: [["relevance"], ["title:1", "title"], ["date:0", "newest"], ["date:1", "oldest"]],
	perpage: [10, 20, 30, 50],
	sort_default: "relevance",
	perpage_default: 20,
	query_width: 50,
	switch_menu: false, 	/* show/hide Records|Targets menu */
	lang_menu: true, 	/* show/hide language menu */
	sort_menu: true, 	/* show/hide sort menu */
	perpage_menu: true, 	/* show/hide perpage menu */
	lang_display: [], 	/* display languages links for given languages, [] for all */
	facets: ["sources", "subjects", "authors"], /* display facets, in this order, [] for none */
	responsive_design_width: 980, /* a page with less pixel width considered as narrow */
	debug: 1,     /* debug level for development: 0..2 */

	dummy: "dummy"
    };

    /* set global debug flag early */
    if (typeof config.debug !== 'undefined') {
	mkws_debug = config.debug;
    } else if (typeof mkws_config_default.debug !== 'undefined') {
	mkws_debug = mkws_config_default.debug;
    }

    /* override standard config values by function parameters */
    for (var k in mkws_config_default) {
	if (typeof config[k] === 'undefined')
	   mkws_config[k] = mkws_config_default[k];
	debug("Set config: " + k + ' => ' + mkws_config[k]);
    }

    if (mkws_config.query_width < 5 || mkws_config.query_width > 150) {
	debug("Reset query width: " + mkws_config.query_width);
	mkws_config.query_width = 50;
    }

    mkws_set_lang(mkws_config);
    if (mkws_config.lang_menu)
	mkws_html_lang(mkws_config);

    // For some reason, doing this programmatically results in
    // document.mkwsSearchForm.mkwsQuery being undefined, hence the raw HTML.
    debug("HTML search form");
    $("#mkwsSearch").html('\
    <form name="mkwsSearchForm" action="" >\
      <input id="mkwsQuery" type="text" size="' + mkws_config.query_width + '" />\
      <input id="mkwsButton" type="submit" value="' + M('Search') + '" />\
    </form>');

    debug("HTML records");
    // If the application has an #mkwsResults, populate it in the
    // usual way. If not, assume that it's a smarter application that
    // defines its own subcomponents:
    //	#mkwsTermlists
    //	#mkwsRanking
    //	#mkwsPager
    //	#mkwsNavi
    //	#mkwsRecords
    if ($("#mkwsResults").length) {
	$("#mkwsResults").html('\
      <table width="100%" border="0" cellpadding="6" cellspacing="0">\
        <tr>\
          <td id="mkwsTermlistContainer1" width="250" valign="top">\
            <div id="mkwsTermlists"></div>\
          </td>\
          <td id="mkwsMOTDContainer" valign="top">\
            <div id="mkwsRanking"></div>\
            <div id="mkwsPager"></div>\
            <div id="mkwsNavi"></div>\
            <div id="mkwsRecords"></div>\
          </td>\
        </tr>\
        <tr>\
          <td colspan="2">\
            <div id="mkwsTermlistContainer2"></div>\
          </td>\
        </tr>\
      </table>');
    }

    if ($("#mkwsRanking").length) {
	var ranking_data = '';
	ranking_data += '<form name="mkwsSelect" id="mkwsSelect" action="" >';
	if (config.sort_menu) {
	    ranking_data +=  M('Sort by') + ' ' + mkws_html_sort(config) + ' ';
	}
	if (config.perpage_menu) {
	    ranking_data += M('and show') + ' ' + mkws_html_perpage(config) + ' ' + M('per page') + '.';
	}
        ranking_data += '</form>';

	$("#mkwsRanking").html(ranking_data);
    }

    mkws_html_switch(config);

    if (mkws_config.use_service_proxy)
	mkws_service_proxy_auth(config.service_proxy_auth);

    if (mkws_config.responsive_design) {
	// Responsive web design - change layout on the fly based on
	// current screen width. Required for mobile devices.
	$(window).resize( function(e) { mkws_resize_page() });
	// initial check after page load
	$(document).ready(function() { mkws_resize_page() });
    }

    domReady();

    // on first page, hide the termlist
    $(document).ready(function() { $("#mkwsTermlists").hide(); } );
    var motd = document.getElementById("mkwsMOTD");
    var container = document.getElementById("mkwsMOTDContainer");
    if (motd && container) {
	// Move the MOTD from the provided element down into the container
        motd.parentNode.removeChild(motd);
	container.appendChild(motd);
    }
}

function mkws_set_lang(mkws_config)  {
    var lang = jQuery.parseQuerystring().lang || mkws_config.lang || "";
    if (!lang || !mkws_locale_lang[lang]) {
	mkws_config.lang = ""
    } else {
	mkws_config.lang = lang;
    }

    debug("Locale language: " + (mkws_config.lang ? mkws_config.lang : "none"));
    return mkws_config.lang;
}

function mkws_html_switch(config) {
    debug("HTML switch");

    $("#mkwsSwitch").html($("<a/>", {
	href: '#',
	onclick: "switchView(\'records\')",
	text: M("Records")
    }));
    $("#mkwsSwitch").append($("<span/>", { text: " | " }));
    $("#mkwsSwitch").append($("<a/>", {
	href: '#',
	onclick: "switchView(\'targets\')",
	text: M("Targets")
    }));

    debug("HTML targets");
    $("#mkwsTargets").html('\
      <div id="mkwsBytarget">\
       No information available yet.\
      </div>');
    $("#mkwsTargets").css("display", "none");

    if (!config.switch_menu) {
	debug("disable switch menu");
        $("#mkwsSwitch").css("display", "none");
    }
}

function mkws_html_sort(config) {
    debug("HTML sort");
    var sort_html = '<select name="mkwsSort" id="mkwsSort">';

    for(var i = 0; i < config.sort.length; i++) {
	var key = config.sort[i][0];
	var val = config.sort[i].length == 1 ? config.sort[i][0] : config.sort[i][1];

	sort_html += '<option value="' + key + '"';
	if (key == config.sort_default) {
	    sort_html += ' selected="selected"';
	}
	sort_html += '>' + val + '</option>';
    }
    sort_html += '</select>';

    return sort_html;
}

function mkws_html_perpage(config) {
    debug("HTML perpage");
    var perpage_html = '<select name="mkwsPerpage" id="mkwsPerpage">';

    for(var i = 0; i < config.perpage.length; i++) {
	var key = config.perpage[i];

	perpage_html += '<option value="' + key + '"';
	if (key == config.perpage_default) {
	    perpage_html += ' selected="selected"';
	}
	perpage_html += '>' + key + '</option>';
    }
    perpage_html += '</select>';

    return perpage_html;
}

/*
 * Run service-proxy authentication in background (after page load).
 * The username/password is configured in the apache config file
 * for the site.
 */
function mkws_service_proxy_auth(auth_url) {
    if (!auth_url)
	auth_url = "http://mkws.indexdata.com/service-proxy-auth";

    debug("Run service proxy auth URL: " + auth_url);

    var request = new pzHttpRequest(auth_url);
    request.get(null, function(data) {
	if (!jQuery.isXMLDoc(data)) {
	    alert("service proxy auth response document is not valid XML document, give up!");
	    return;
	}
	var status = $(data).find("status");
	if (status.text() != "OK") {
	    alert("service proxy auth repsonse status: " + status.text() + ", give up!");
	    return;
	}
    });
}

/* create locale language menu */
function mkws_html_lang(mkws_config) {
    var lang_default = "en";
    var lang = mkws_config.lang || lang_default;
    var list = [];

    /* display a list of configured languages, or all */
    var lang_display = mkws_config.lang_display || [];
    var hash = {};
    for (var i = 0; i < lang_display.length; i++) {
	hash[lang_display[i]] = 1;
    }

    for (var k in mkws_locale_lang) {
	if (hash[k] == 1 || lang_display.length == 0)
	    list.push(k);
    }

    // add english link
    if (lang_display.length == 0 || hash[lang_default] == 1)
        list.push(lang_default);

    debug("Language menu for: " + list.join(", "));

    /* the HTML part */
    var data = "";
    for(var i = 0; i < list.length; i++) {
	var l = list[i];

	if (data)
	    data += ' | ';

	if (lang == l) {
	    data += ' <span>' + l + '</span> ';
	} else {
	    data += ' <a href="?lang=' + l + '">' + l + '</a> '
	}
    }

    $("#mkwsLang").html(data);
}

function mkws_resize_page () {
    var list = ["mkwsSwitch"];

    var width = mkws_config.responsive_design_width || 980;
    var parentId = $("#mkwsTermlists").parent().attr('id');

    if ($(window).width() <= width &&
	parentId === "mkwsTermlistContainer1") {
	debug("changing from wide to narrow: " + $(window).width());
	$("#mkwsTermlists").appendTo($("#mkwsTermlistContainer2"));
	$("#mkwsTermlistContainer1").hide();
	$("#mkwsTermlistContainer2").show();
	for(var i = 0; i < list.length; i++) {
	    $("#" + list[i]).hide();
	}
    } else if ($(window).width() > width &&
	parentId === "mkwsTermlistContainer2") {
	debug("changing from narrow to wide: " + $(window).width());
	$("#mkwsTermlists").appendTo($("#mkwsTermlistContainer1"));
	$("#mkwsTermlistContainer1").show();
	$("#mkwsTermlistContainer2").hide();
	for(var i = 0; i < list.length; i++) {
	    $("#" + list[i]).show();
	}
    }
};

/* locale */
function M(word) {
    var lang = mkws_config.lang;

    if (!lang || !mkws_locale_lang[lang])
	return word;

    return mkws_locale_lang[lang][word] ? mkws_locale_lang[lang][word] : word;
}

/*
 * implement jQuery plugins
 */
jQuery.extend({
    // implement jQuery.parseQuerystring() for parsing URL parameters
    parseQuerystring: function() {
	var nvpair = {};
	var qs = window.location.search.replace('?', '');
	var pairs = qs.split('&');
	$.each(pairs, function(i, v){
	    var pair = v.split('=');
	    nvpair[pair[0]] = pair[1];
	});
	return nvpair;
    },

    debug2: function(string) { // delayed debug, internal variables are set after dom ready
	setTimeout(function() { debug(string); }, 500);
    },

    // service-proxy or pazpar2
    pazpar2: function(config) {
	// simple layout
	var div = '<div id="mkwsSwitch"></div>\
	<div id="mkwsLang"></div>\
	<div id="mkwsSearch"></div>\
	<div id="mkwsResults"></div>\
	<div id="mkwsTargets"></div>\
	<div id="mkwsFooter">\
	  <div id="mkwsStat"></div>\
	  <span>Powered by MKWS &copy; 2013 <a target="_new" href="http://www.indexdata.com">Index Data</a></span>\
	</div>';

	// new table layout
	var table = '\
	<style type="text/css">\
	  #mkwsTermlists div.facet {\
	  float:left;\
	  width: 30%;\
	  margin: 0.3em;\
	  }\
	  #mkwsStat {\
	  text-align: right;\
	  }\
	</style>\
	    \
	<table width="100%" border="0">\
	  <tr>\
	    <td>\
	      <div id="mkwsSwitch"></div>\
	      <div id="mkwsLang"></div>\
	      <div id="mkwsSearch"></div>\
	    </td>\
	  </tr>\
	  <tr>\
	    <td>\
	      <div style="height:500px; overflow: auto">\
		<div id="mkwsPager"></div>\
		<div id="mkwsNavi"></div>\
		<div id="mkwsRecords"></div>\
		<div id="mkwsTargets"></div>\
		<div id="mkwsRanking"></div>\
	      </div>\
	    </td>\
	  </tr>\
	  <tr>\
	    <td>\
	      <div style="height:300px; overflow: hidden">\
		<div id="mkwsTermlists"></div>\
	      </div>\
	    </td>\
	  </tr>\
	  <tr>\
	    <td>\
	      <div id="mkwsStat"></div>\
	    </td>\
	  </tr>\
	</table>';

	if (config && config.layout == 'div') {
	    this.debug2("jquery plugin layout: div");
	    document.write(div);
	} else {
	    this.debug2("jquery plugin layout: table");
	    document.write(table);
	}
    }
});

function debug(string) {
    if (!mkws_debug)
	return;

    if (typeof console === "undefined" || typeof console.log === "undefined") { /* ARGH!!! old IE */
	return;
    }

    // you need to disable use strict at the top of the file!!!
    if (mkws_debug >= 3) {
	console.log(arguments.callee.caller);
    } else if (mkws_debug >= 2) {
	console.log(">>> called from function " + arguments.callee.caller.name + ' <<<');
    }
    console.log(string);
}


/* magic */
$(document).ready(function() { mkws_html_all(mkws_config) });
