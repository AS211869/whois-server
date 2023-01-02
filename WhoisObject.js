module.exports = class WhoisObject {
	constructor(name, data, type, dynamic = false) {
		this._name = name.toLowerCase();
		this._data = [];
		this._type = type;
		this._dynamic = dynamic;

		let dataLines = data.split(/(?:\r)?\n/g);

		for (var i = 0; i < dataLines.length; i++) {
			let thisLine = dataLines[i];
			/** @type {Array} */
			let thisLineParts = thisLine.split(/:(?: )?/);

			if (thisLineParts[0] === '_REFER') {
				this._referral = thisLineParts.slice(1).join(':');
				continue;
			}

			if (thisLineParts[0] === '_PULL') {
				if (this._referral) {
					console.warn(`Whois object ${this._name} has both refer and pull actions. Ignoring the pull action.`);
					continue;
				}

				let pullData = thisLineParts.slice(1).join(':');
				this._pull = pullData.split(' ')[0];
				if (pullData.split(' ').length > 1) {
					this._pullPort = pullData.split(' ')[1];
				}
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

	hasPull() {
		return !!this._pull;
	}

	getPull() {
		return this._pull;
	}

	getPullPort() {
		return this._pullPort || 43;
	}
};