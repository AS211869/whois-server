const WhoisObject = require('./WhoisObject.js');

module.exports = class Domain extends WhoisObject {
	constructor(name, data, dynamic = false) {
		super(name, data, 'domain', dynamic);
	}

	getDomain() {
		return this._name;
	}
};