/* eslint-disable no-useless-escape */
const ipAddress = require('ip-address');
const isDomain = require('is-domain');
const net = require('net');

const util = require('./util.js');
const config = require('./config.json');

util.createDataDirs();

/** @type {import('./Address.js')[]} */
var addresses = [];

/** @type {Object.<string, import('./Domain.js')>} */
var domains = {};

/** @type {Object.<string, import('./ASN.js')>} */
var asn = {};

function updateData() {
	let oldAddresses = addresses.slice();
	addresses = [];
	domains = {};
	asn = {};

	addresses.push(...util.loadIPData('ipv4'));
	addresses.push(...util.loadIPData('ipv6'));
	domains = util.loadDomainData();
	asn = util.loadASNData();

	util.loadIPAMData(function(err, data) {
		if (err) {
			addresses = oldAddresses;
			return console.error(err);
		}

		addresses.push(...data);
	});
}

updateData();

if (config.updateEveryMs) {
	setInterval(() => {
		updateData();
	}, config.updateEveryMs);
}

if (config.dynamicPullInterval) {
	var objectsToPull = [
		...addresses.filter(a => a.hasPull()),
		...Object.values(domains).filter(d => d.hasPull()),
		...Object.values(asn).filter(a => a.hasPull())
	].filter(e => !e._dynamic);

	let run = 0;

	console.log(`${objectsToPull.length} pull actions detected. Data pulls will happen every ${config.dynamicPullInterval / objectsToPull.length}ms in round-robin fashion.`);
	console.log(`Objects to pull: \n${objectsToPull.map(o => o._name).join('\n')}`);

	setInterval(() => {
		let thisObj = objectsToPull[run];
		let thisObjData = `Data retrieved at ${new Date()}\n\n`;
		let thisCon = net.createConnection({
			host: thisObj.getPull(),
			port: thisObj.getPullPort(),
			timeout: 5000
		}, () => {
			thisCon.write(`${thisObj._name}\r\n`);
		}).on('data', (data) => {
			thisObjData += data.toString();
		}).on('end', () => {
			util.writeDynamicPullData(thisObj._name, thisObj._type, thisObjData);
		}).on('error', (err) => {
			console.error(err);
		});

		setTimeout(() => {
			if (thisCon && !thisCon.destroyed) thisCon.destroy();
		}, 10000);

		run++;
		if (run === objectsToPull.length) run = 0;
	}, config.dynamicPullInterval / objectsToPull.length);
}

/**
 * @param {net.Socket} conn The connection
 * @param {string} query The query
 */
function answerIPQuery(conn, query) {
	let type = 0;
	/** @type {import('ip-address').Address4 | import('ip-address').Address6} */
	let addr = null;
	let cidr = null;

	if (query.includes('/') && query.match(/^[0-9a-f\.:]+\/([0-9]{1,3})$/)) {
		cidr = query.match(/^[0-9a-f\.:]+\/([0-9]{1,3})$/)[1];
	}

	type = net.isIP(cidr ? query.split('/')[0] : query);
	switch (type) {
		case 4:
			if (cidr > 32) {
				conn.write('Invalid CIDR');
				conn.destroy();
				return;
			}
			addr = new ipAddress.Address4(query);
			break;
		case 6:
			if (cidr > 128) {
				conn.write('Invalid CIDR');
				conn.destroy();
				return;
			}
			addr = new ipAddress.Address6(query);
			break;
	}

	/** @type {Address[]} */
	let allMatches = [];
	let hasReferral = false;
	for (var i = 0; i < addresses.length; i++) {
		let a = addresses[i];
		//console.log(a.getAddressObj().startAddress().address);
		if (net.isIP(a.getAddressObj().startAddress().address) === type) {
			if (hasReferral) {
				break;
			}

			if (addr.isInSubnet(a.getAddressObj())) {
				allMatches.push(a);
				hasReferral = a.hasReferral();
			}
		} else {
			continue;
		}
	}

	allMatches.sort((a, b) => a.getAddressObj().subnetMask > b.getAddressObj().subnetMask);

	if (conn.writable) {
		if (allMatches.length > 0) {
			conn.write(allMatches.map(a => a.getDataText()).join('\n\n'));
			if (allMatches[allMatches.length - 1].hasReferral()) {
				conn.write('\n\n');
				conn.write(`ReferralServer: ${allMatches[allMatches.length - 1].getReferral()}`);
			}
		} else {
			conn.write('No information about that address is available from this WHOIS server');
		}
	}
}

/**
 * @param {net.Socket} conn The connection
 * @param {string} query The query
 */
function answerDomainQuery(conn, query) {
	if (query in domains) {
		conn.write(domains[query].getDataText());
		if (!domains[query].hasReferral()) {
			if (`d_${query}` in domains) {
				conn.write('\n\n');
				conn.write(domains[`d_${query}`].getDataText());
			}
		} else {
			handleRefer(conn, domains[query]);
		}
	} else {
		conn.write('No information about that domain is available from this WHOIS server');
	}
}

/**
 * @param {net.Socket} conn The connection
 * @param {string} query The query
 */
function answerASNQuery(conn, query) {
	if (query in asn) {
		conn.write(asn[query].getDataText());
		if (!asn[query].hasReferral()) {
			if (`d_${query}` in asn) {
				conn.write('\n\n');
				conn.write(asn[`d_${query}`].getDataText());
			}
		} else {
			handleRefer(conn, asn[query]);
		}
	} else {
		conn.write('No information about that ASN is available from this WHOIS server');
	}
}

// eslint-disable-next-line valid-jsdoc
/**
 * @param {net.Socket} conn The connection
 * @param {import('./WhoisObject')} whoisObject The WHOIS object
 */
function handleRefer(conn, whoisObject) {
	if (whoisObject.hasReferral()) {
		conn.write('\n\n');
		conn.write(`ReferralServer: ${whoisObject.getReferral()}`);
	}
}

var server = net.createServer();
server.listen(config.port, () => {
	console.log(`Listening on port ${config.port}`);
});

server.on('connection', (conn) => {
	console.log(`Connection from ${conn.remoteAddress}:${conn.remotePort}`);

	setTimeout(() => {
		conn.destroy();
	}, 5000);

	conn.on('data', (data) => {
		console.log(`${conn.remoteAddress}:${conn.remotePort} queried ${data.toString().trim()}`);
		let query = data.toString().trim().toLowerCase();

		if (net.isIP(query) ||
		// eslint-disable-next-line no-useless-escape
			(query.includes('/') && query.match(/^[0-9a-f\.:]+\/([0-9]{1,3})$/) && net.isIP(query.split('/')[0]))) { // IP
			answerIPQuery(conn, query);
		} else if (isDomain(query)) { // Domain
			answerDomainQuery(conn, query);
		} else if (query.match(/^AS[0-9]+$/i)) { // ASN
			answerASNQuery(conn, query);
		} else if (query.match(/^[a-zA-Z0-9]+$/)) { // TLD
			answerDomainQuery(conn, query);
		} else if (conn.writable) {
			conn.write('Invalid query');
		}

		if (!conn.destroyed) {
			conn.destroy();
		}
	});
});