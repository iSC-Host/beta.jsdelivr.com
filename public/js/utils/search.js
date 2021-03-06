var algolia = require('./algolia.js');
var parseQuery = require('./parse-query.js');

var jsDelivrIndex = algolia.initIndex('jsDelivr');

module.exports = function (queryString, page, callback) {
	var parsed = parseQuery(queryString);
	var options = { page: page || 0 };

	if (parsed.facetFilters) {
		options.facetFilters = parsed.facetFilters;
	}

	var searchCallback = function (success, response) {
		var load = [];

		if (success) {
			for (var i = 0, c = response.hits.length; i < c; i++) {
				response.hits[i].selectedVersion = response.hits[i].lastversion;

				if (!response.hits[i].assets.length) {
					load.push(response.hits[i]);
				}
			}

			if (!load.length) {
				callback($.extend(true, {}, response), queryString);
			} else {
				algolia.startQueriesBatch();

				for (i = 0, c = load.length; i < c; i++) {
					algolia.addQueryInBatch('jsDelivr_assets', '', {
						hitsPerPage: 100,
						facetFilters: 'name:' + load[i].name
					});
				}

				algolia.sendQueriesBatch(function (success, content) {
					if (success) {
						for (var i = 0, c = load.length; i < c; i++) {
							load[i].assets = content.results[i].hits;
						}
					}

					callback($.extend(true, {}, response), queryString);
				});
			}
		}
	};

	if (parsed.query || options.facetFilters) {
		jsDelivrIndex.search(parsed.query, searchCallback, options);
	} else {
		jsDelivrIndex.browse(options.page, searchCallback, 10);
	}
};
