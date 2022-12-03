module.exports = class WhoisObject {
	constructor(name, data) {
		this._name = name.toLowerCase();
		this._data = [];

		let dataLines = data.split(/(?:\r)?\n/g);

		for (var i = 0; i < dataLines.length; i++) {
			let thisLine = dataLines[i];
			/** @type {Array} */
			let thisLineParts = thisLine.split(/:(?: )?/);

			if (thisLineParts[0] === '_REFER') {
				this._referral = thisLineParts.slice(1).join(':');
				continue;
			}

			if (thisLineParts[0].startsWith('_')) {
				continue;
			}

			this._data.push(thisLine);
		}
	}

	getData() {
		return this._data;
	}

	getDataText() {
		return this._data.join('\n');
	}

	hasReferral() {
		return !!this._referral;
	}

	getReferral() {
		return this._referral;
	}
};