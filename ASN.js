const WhoisObject = require('./WhoisObject.js');

module.exports = class ASN extends WhoisObject {
	constructor(name, data, dynamic = false) {
		super(name, data, 'asn', dynamic);
	}

	getASN() {
		return this._name;
	}
};