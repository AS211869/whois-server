/* eslint-disable valid-jsdoc */
const { Address4 } = require('ip-address');
const WhoisObject = require('./WhoisObject.js');

class Address extends WhoisObject {
	constructor(network, data, addressObj, dynamic = false) {
		let type = addressObj instanceof Address4 ? 'ipv4' : 'ipv6';
		super(network, data, type, dynamic);

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