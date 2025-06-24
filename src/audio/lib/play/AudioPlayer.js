import { ObjectExt } from '../util/ObjectsExt.js';

export class AudioPlayer {
    constructor() {
        this.initialized = false;
        this.audioContext = null;
        this.workletNode = null;
        this.analyser = null;
        this.playbackRate = 1.0;
    }

    addEventListener(event, callback) {
        if (event === "statechange") {
            this.stateChangeCallback = callback;
        }
        else if (event === "dataavailable") {
            this.dataAvailableCallback = callback;
        }
        else {
            throw new Error("Unsupported event: " + event);
        }
    }

    async start() {
        if (this.initialized) {
            return;
        }

        this.audioContext = new AudioContext({ "sampleRate": 24000 });
        
        // Load the audio worklet
        const workletUrl = this.getWorkletUrl();
        await this.audioContext.audioWorklet.addModule(workletUrl);
        
        this.workletNode = new AudioWorkletNode(this.audioContext, "audio-player-processor");
        this.workletNode.connect(this.audioContext.destination);

        this.analyser = this.audioContext.createAnalyser();
        this.workletNode.connect(this.analyser);

        this.#maybeOverrideInitialBufferLength();
        this.initialized = true;
    }

    getWorkletUrl() {
        // Create a blob URL for the worklet since we can't use import.meta.url in all environments
        const workletCode = `
        // Audio sample buffer to minimize reallocations
        class ExpandableBuffer {
            constructor() {
                this.buffer = new Float32Array(24000);
                this.readIndex = 0;
                this.writeIndex = 0;
                this.underflowedSamples = 0;
                this.isInitialBuffering = true;
                this.initialBufferLength = 24000;
                this.lastWriteTime = 0;
            }

            write(samples) {
                if (this.writeIndex + samples.length <= this.buffer.length) {
                    // Enough space to append the new samples
                }
                else {
                    if (samples.length <= this.readIndex) {
                        const subarray = this.buffer.subarray(this.readIndex, this.writeIndex);
                        this.buffer.set(subarray);
                    }
                    else {
                        const newLength = (samples.length + this.writeIndex - this.readIndex) * 2;
                        const newBuffer = new Float32Array(newLength);
                        newBuffer.set(this.buffer.subarray(this.readIndex, this.writeIndex));
                        this.buffer = newBuffer;
                    }
                    this.writeIndex -= this.readIndex;
                    this.readIndex = 0;
                }
                this.buffer.set(samples, this.writeIndex);
                this.writeIndex += samples.length;
                if (this.writeIndex - this.readIndex >= this.initialBufferLength) {
                    this.isInitialBuffering = false;
                }
            }

            read(destination) {
                let copyLength = 0;
                if (!this.isInitialBuffering) {
                    copyLength = Math.min(destination.length, this.writeIndex - this.readIndex);
                }
                destination.set(this.buffer.subarray(this.readIndex, this.readIndex + copyLength));
                this.readIndex += copyLength;
                if (copyLength > 0 && this.underflowedSamples > 0) {
                    this.underflowedSamples = 0;
                }
                if (copyLength < destination.length) {
                    destination.fill(0, copyLength);
                    this.underflowedSamples += destination.length - copyLength;
                }
                if (copyLength === 0) {
                    this.isInitialBuffering = true;
                }
            }

            readWithSpeed(destination, playbackRate) {
                if (playbackRate === 1.0) {
                    this.read(destination);
                    return;
                }

                let copyLength = 0;
                if (!this.isInitialBuffering) {
                    const availableSamples = this.writeIndex - this.readIndex;
                    const samplesNeeded = Math.ceil(destination.length * playbackRate);
                    copyLength = Math.min(samplesNeeded, availableSamples);
                }

                if (copyLength > 0) {
                    const tempBuffer = new Float32Array(copyLength);
                    tempBuffer.set(this.buffer.subarray(this.readIndex, this.readIndex + copyLength));
                    this.readIndex += copyLength;

                    for (let i = 0; i < destination.length; i++) {
                        const sourceIndex = i * playbackRate;
                        const index = Math.floor(sourceIndex);
                        const fraction = sourceIndex - index;
                        
                        if (index + 1 < tempBuffer.length) {
                            destination[i] = tempBuffer[index] * (1 - fraction) + tempBuffer[index + 1] * fraction;
                        } else if (index < tempBuffer.length) {
                            destination[i] = tempBuffer[index];
                        } else {
                            destination[i] = 0;
                        }
                    }

                    if (this.underflowedSamples > 0) {
                        this.underflowedSamples = 0;
                    }
                } else {
                    destination.fill(0);
                    this.underflowedSamples += destination.length;
                }

                if (copyLength === 0) {
                    this.isInitialBuffering = true;
                }
            }

            clearBuffer() {
                this.readIndex = 0;
                this.writeIndex = 0;
            }
        }

        class AudioPlayerProcessor extends AudioWorkletProcessor {
            constructor() {
                super();
                this.playbackBuffer = new ExpandableBuffer();
                this.playbackRate = 1.0;
                
                this.port.onmessage = (event) => {
                    if (event.data.type === "audio") {
                        this.playbackBuffer.write(event.data.audioData);
                    }
                    else if (event.data.type === "initial-buffer-length") {
                        const newLength = event.data.bufferLength;
                        this.playbackBuffer.initialBufferLength = newLength;
                    }
                    else if (event.data.type === "barge-in") {
                        this.playbackBuffer.clearBuffer();
                    }
                    else if (event.data.type === "playback-rate") {
                        this.playbackRate = event.data.rate;
                        console.log(\`AudioWorklet: Playback rate set to \${this.playbackRate}x\`);
                    }
                };
            }

            process(inputs, outputs, parameters) {
                const output = outputs[0][0];
                
                this.playbackBuffer.readWithSpeed(output, this.playbackRate);
                
                return true;
            }
        }

        registerProcessor("audio-player-processor", AudioPlayerProcessor);
        `;
        
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }

    bargeIn() {
        this.workletNode.port.postMessage({
            type: "barge-in",
        })
    }

    setPlaybackRate(rate) {
        this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
        console.log(`Setting playback rate to ${this.playbackRate}x`);
        if (this.workletNode) {
            this.workletNode.port.postMessage({
                type: "playback-rate",
                rate: this.playbackRate
            });
        }
    }

    getPlaybackRate() {
        return this.playbackRate;
    }

    stop() {
        if (ObjectExt.exists(this.audioContext)) {
            this.audioContext.close();
        }

        if (ObjectExt.exists(this.analyser)) {
            this.analyser.disconnect();
        }

        if (ObjectExt.exists(this.workletNode)) {
            this.workletNode.disconnect();
        }

        if (ObjectExt.exists(this.recorderNode)) {
            this.recorderNode.disconnect();
        }

        this.initialized = false;
        this.audioContext = null;
        this.analyser = null;
        this.workletNode = null;
        this.recorderNode = null;
    }

    #maybeOverrideInitialBufferLength() {
        // Read a user-specified initial buffer length from the URL parameters to help with tinkering
        const params = new URLSearchParams(window.location.search);
        const value = params.get("audioPlayerInitialBufferLength");
        if (value === null) {
            return;  // No override specified
        }
        const bufferLength = parseInt(value);
        if (isNaN(bufferLength)) {
            console.error("Invalid audioPlayerInitialBufferLength value:", JSON.stringify(value));
            return;
        }
        this.workletNode.port.postMessage({
            type: "initial-buffer-length",
            bufferLength: bufferLength,
        });
    }

    playAudio(samples) {
        if (!this.initialized) {
            console.error("The audio player is not initialized. Call start() before attempting to play audio.");
            return;
        }
        this.workletNode.port.postMessage({
            type: "audio",
            audioData: samples,
        });
    }

    getSamples() {
        if (!this.initialized) {
            return null;
        }
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);
        return [...dataArray].map(e => e / 128 - 1);
    }

    getVolume() {
        if (!this.initialized) {
            return 0;
        }
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);
        let normSamples = [...dataArray].map(e => e / 128 - 1);
        let sum = 0;
        for (let i = 0; i < normSamples.length; i++) {
            sum += normSamples[i] * normSamples[i];
        }
        return Math.sqrt(sum / normSamples.length);
    }
}