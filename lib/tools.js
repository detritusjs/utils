const Constants = require('./constants');

module.exports.toCamelCase = function(value) {
	value = value.split('_').map((v) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()).join('');
	return value.charAt(0).toLowerCase() + value.slice(1);
};

module.exports.hexToInt = function(hex) {return parseInt(hex.replace(/#/, ''), 16);}
module.exports.rgbToInt = function(r, g, b) {return ((r & 0x0ff) << 16) | ((g & 0x0ff) << 8) | (b & 0x0ff);}
module.exports.intToRGB = function(int) {return {r: (int >> 16) & 0x0ff, g: (int >> 8) & 0x0ff, b: int & 0x0ff};}
module.exports.intToHex = function(int, hashtag) {return ((hashtag) ? '#' : '') + int.toString(16).padStart(6, '0');}

module.exports.regex = function(type, data) {
	const payload = {};

	type = String(type || '').toUpperCase();
	const regex = Constants.Discord.Regex[type];
	if (!regex) {throw new Error(`Unknown regex type: ${type}`);}
	const match = regex.exec(data);
	if (!match) {
		return null;
	}

	switch (type) {
		case 'MENTION_CHANNEL':
		case 'MENTION_ROLE':
		case 'MENTION_USER': payload.id = match[1]; break;
		case 'TEXT_SNOWFLAKE':
		case 'TEXT_STRIKE':
		case 'TEXT_URL': payload.text = match[1]; break;
		case 'EMOJI': {
			payload.name = match[1];
			payload.id = match[2];
			payload.animated = data.startsWith('<a:');
		}; break;
		case 'TEXT_CODEBLOCK': {
			payload.language = match[2];
			payload.text = match[3];
		}; break;
		default: throw new Error(`Unknown regex type: ${type}`);
	}

	match.regex = regex;
	match.type = type;
	payload.match = match;
	return payload;
};

module.exports.checkData = function(data, defaults) {
	if (!data) {
		data = {};
	}
	if (typeof(data) !== 'object') {
		data = Object.assign({}, data);
	}
	const body = {};
	for (let key in defaults) {
		if (!(key in data)) {
			if (!defaults[key].required) {continue;}
			throw new Error(`${key} is required.`);
		}
		switch (defaults[key].type) {
			case 'bool': data[key] = Boolean(data[key]); break;
			case 'string': data[key] = String(data[key]); break;
			case 'integer':
				data[key] = parseInt(data[key]);
				if (data[key] === NaN) {
					throw new Error(`${key} has to be an integer.`);
				}
				break;
			case 'array':
				if (!Array.isArray(data[key])) {
					throw new Error(`${key} has to be an array!`);
				}
				break;
			case 'snowflake':
				if ((typeof(data[key]) !== 'string' && typeof(data[key]) !== 'number') || (!(/\d+/).exec(data[key]) && data[key] !== '@me')) {
					throw new Error(`${key} has to be a snowflake!`);
				}
				break;
			case 'object':
				if (typeof(data[key]) !== 'object') {
					throw new Error(`${key} has to be an object!`);
				}
				break;
		}
		body[key] = data[key];
	}
	return body;
};