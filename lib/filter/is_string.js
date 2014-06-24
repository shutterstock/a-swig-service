var swig = require('swig');

exports.init = function () {
	swig.setFilter('isString', function(elm) {
		return typeof(elm) === 'string' ? 1 : 0;
	});
};
