/* Copyright (c) 2013 IndexData ApS. http://indexdata.com
 *
 * helper functions for other test *.spec.js files
 *
 */

/*
 * combine arrays, return a flat list
 * [["a","b"], ["c"], "d"] => ["a", "b", "c", "d"]
 *
 */
var flat_list = function (list) {
        var data = [];

        for (var i = 0; i < list.length; i++) {
            if (typeof list[i] == 'object') {
                for (var j = 0; j < list[i].length; j++) {
                    data.push(list[i][j]);
                }

            } else {
                data.push(list[i]);
            }
        }

        return data;
    };

/*
 * list of div id to check
 *
 */
var tags = {
    required: ["mkwsSearch", "mkwsResults"],
    optional: ["mkwsLang", "mkwsTargets"],
    optional2: ["mkwsMOTD", "mkwsStat", "footer"]
};

// node.js exports
module.exports = {
    flat_list: flat_list,
    tags: tags
};