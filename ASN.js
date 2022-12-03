const WhoisObject = require('./WhoisObject.js');

module.exports = class ASN extends WhoisObject {
	getASN() {
		return this._name;
	}
};