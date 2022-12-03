const WhoisObject = require('./WhoisObject.js');

module.exports = class Domain extends WhoisObject {
	getDomain() {
		return this._name;
	}
};