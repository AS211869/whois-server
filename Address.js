/* eslint-disable valid-jsdoc */
const WhoisObject = require('./WhoisObject.js');

class Address extends WhoisObject {
	constructor(network, data, addressObj) {
		super(network, data);

		this._addressObj = addressObj;
	}

	getNetwork() {
		return this._name;
	}

	/** @returns {import('ip-address').Address4 | import('ip-address').Address6} The address object */
	getAddressObj() {
		return this._addressObj;
	}
}

module.exports = Address;