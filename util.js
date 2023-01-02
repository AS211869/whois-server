const path = require('path');
const fs = require('fs');
const ipAddress = require('ip-address');
const axios = require('axios');

const config = require('./config.json');
const Address = require('./Address.js');
const Domain = require('./Domain.js');
const ASN = require('./ASN.js');

function createDataDirs() {
	if (!fs.existsSync(path.join(__dirname, 'data'))) {
		fs.mkdirSync(path.join(__dirname, 'data'));
	}

	var dirsToCreate = ['ipv4', 'ipv6', 'domain', 'asn'];

	for (var i = 0; i < dirsToCreate.length; i++) {
		let thisDir = dirsToCreate[i];

		if (!fs.existsSync(path.join(__dirname, 'data', thisDir))) {
			fs.mkdirSync(path.join(__dirname, 'data', thisDir));
		}
	}
}

function getDataFiles(directory) {
	if (!fs.existsSync(path.join(__dirname, 'data', directory))) {
		return;
	}

	return fs.readdirSync(path.join(__dirname, 'data', directory));
}

function loadIPData(type) {
	var addresses = [];

	if (!fs.existsSync(path.join(__dirname, 'data', type))) {
		return addresses;
	}

	var ips = getDataFiles(type);
	for (var i = 0; i < ips.length; i++) {
		let thisAddressString = ips[i].replace(/^d_/, '').replace(/-/g, ':').replace('_', '/');
		try {
			//console.log(thisAddressString);
			var thisAddress;

			if (thisAddressString.includes(':')) {
				thisAddress = new ipAddress.Address6(thisAddressString);
			} else {
				thisAddress = new ipAddress.Address4(thisAddressString);
			}
			//console.log(thisAddress);

			var thisAddressObj = new Address(thisAddressString, fs.readFileSync(
				path.join(__dirname, 'data', type, ips[i]), 'utf-8'
			), thisAddress, ips[i].startsWith(`d_`));

			addresses.push(thisAddressObj);
		} catch (e) {
			console.error(`${thisAddressString} is not a valid IP address`);
			console.error(e);
		}
	}

	return addresses;
}

function loadDomainData() {
	var domainFiles = getDataFiles('domain');
	var domains = {};

	for (var i = 0; i < domainFiles.length; i++) {
		domains[domainFiles[i].toLowerCase()] = new Domain(domainFiles[i].replace(/^d_/, ''), fs.readFileSync(
			path.join(__dirname, 'data', 'domain', domainFiles[i]), 'utf-8'
		), domainFiles[i].startsWith(`d_`));
	}

	return domains;
}

function loadASNData() {
	var asnFiles = getDataFiles('asn');
	var asn = {};

	for (var i = 0; i < asnFiles.length; i++) {
		asn[asnFiles[i].toLowerCase()] = new ASN(asnFiles[i].replace(/^d_/, ''), fs.readFileSync(
			path.join(__dirname, 'data', 'asn', asnFiles[i]), 'utf-8'
		), asnFiles[i].startsWith(`d_`));
	}

	return asn;
}

function loadIPAMData(cb) {
	if (!config.ipam.enabled) {
		return cb(null, []);
	}

	axios.get(`${config.ipam.url}${config.ipam.appId}/subnets/`, {
		headers: {
			token: config.ipam.token
		}
	}).then(resp => {
		var d = resp.data;
		if (!d.success) {
			return cb(`An error occurred while getting data from IPAM. Error code: ${d.code}`);
		}

		var addresses = [];

		for (var i = 0; i < d.data.length; i++) {
			var thisAddressString = `${d.data[i].subnet}/${d.data[i].mask}`;
			try {
				var thisAddress;

				if (thisAddressString.includes(':')) {
					thisAddress = new ipAddress.Address6(thisAddressString);
				} else {
					thisAddress = new ipAddress.Address4(thisAddressString);
				}

				var ipamData = [];
				ipamData.push(`Network: ${d.data[i].subnet}/${d.data[i].mask}`);

				if (d.data[i].description) {
					ipamData.push(`Description: ${d.data[i].description}`);
				}

				if (typeof d.data[i].location === 'object' && !Array.isArray(d.data[i].location)) {
					ipamData.push(`Address: ${d.data[i].location.address}`);
				}

				if (typeof d.data[i].nameservers === 'object' && !Array.isArray(d.data[i].nameservers)) {
					ipamData.push(...d.data[i].nameservers.namesrv1.split(';').map(e => `Nameserver: ${e}`));
				}

				var thisAddressObj = new Address(thisAddressString, ipamData.join('\n'), thisAddress);

				addresses.push(thisAddressObj);
			} catch (e) {
				console.error(`${thisAddressString} is not a valid IP address`);
				console.error(e);
			}
		}

		cb(null, addresses);
	}).catch(err => {
		cb(err, null);
	});
}

function writeDynamicPullData(objectName, type, data) {
	let file = `d_${objectName.replace(/:/g, '-').replace('/', '_')}`;
	fs.writeFile(path.join(__dirname, 'data', type, file), data, (err) => {
		if (err) {
			return console.error(err);
		}

		console.log(`Wrote dynamic pull data for ${objectName} to disk`);
	});
}

module.exports.createDataDirs = createDataDirs;
//module.exports.getDataFiles = getDataFiles;
module.exports.loadIPData = loadIPData;
module.exports.loadDomainData = loadDomainData;
module.exports.loadASNData = loadASNData;
module.exports.loadIPAMData = loadIPAMData;
module.exports.writeDynamicPullData = writeDynamicPullData;