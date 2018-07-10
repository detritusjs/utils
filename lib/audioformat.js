const defaults = {
	sampleRate: 48000,
	channels: 2,
	frameDuration: 20,
	bitDepth: 16,
	endianness: 'LE'
};

class AudioFormat {
	constructor(options) {
		options = Object.assign({}, defaults, options);
		this.sampleRate = options.sampleRate;
		this.channels = options.channels;
		this.frameDuration = options.frameDuration;
		this.bitDepth = options.bitDepth;
		this.endianness = options.endianness;
	}

	get byteDepth() {return Math.round(this.bitDepth / 8);}
	get sampleSize() {return this.byteDepth * this.channels;}
	get samplesPerFrame() {return parseInt((this.sampleRate / 1000) * this.frameDuration);}
	get samplesPerTick() {return parseInt((this.sampleRate / 1000) * this.byteDepth);}
	get frameSize() {return this.samplesPerFrame * this.sampleSize;}

	get pcmMult() {return Math.pow(2, this.bitDepth) / 2;}
	get pcmMax() {return this.pcmMult - 1;}
	get pcmMin() {return -this.pcmMax;}

	get writeFunc() {return `writeInt${this.bitDepth}${this.endianness}`;}
	get readFunc() {return `readInt${this.bitDepth}${this.endianness}`;}
}

module.exports = AudioFormat;