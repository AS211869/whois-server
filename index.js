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
	addresses = [];
	domains = {};
	asn = {};
	addresses.push(...util.loadIPData('ipv4'));
	addresses.push(...util.loadIPData('ipv6'));
	domains = util.loadDomainData();
	asn = util.loadASNData();

	util.loadIPAMData(function(err, data) {
		if (err) {
			return console.error(err);
		}

		addresses.push(...data);
	});
}

updateData();

if (config.updateEveryMs) {
	setInterval(() => {
		updateData();
	}, config.updateEveryMs).unref();
}

/**
 * @param {net.Socket} conn The connection
 * @param {string} query The query
 */
function answerIPQuery(conn, query) {
	let type = 0;
	/** @type {import('ip-address').Address4 | import('ip-address').Address6} */
	let addr = null;

	type = net.isIP(query);
	switch (type) {
		case 4:
			addr = new ipAddress.Address4(query);
			break;
		case 6:
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
		handleRefer(conn, domains[query]);
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
		handleRefer(conn, asn[query]);
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

		if (net.isIP(query)) { // IP
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