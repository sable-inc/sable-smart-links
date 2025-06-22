import { ObjectExt } from '../util/ObjectsExt.js';

export class AudioPlayer {
    constructor() {
        this.onAudioPlayedListeners = [];
        this.initialized = false;
    }

    addEventListener(event, callback) {
        switch (event) {
            case "onAudioPlayed":
                this.onAudioPlayedListeners.push(callback);
                break;
            default:
                console.error("Listener registered for event type: " + JSON.stringify(event) + " which is not supported");
        }
    }

    async start() {
        this.audioContext = new AudioContext({ "sampleRate": 24000 });
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;

        // Get the worklet URL - this needs to be handled differently in a bundled environment
        const workletUrl = this.getWorkletUrl();
        await this.audioContext.audioWorklet.addModule(workletUrl);
        
        this.workletNode = new AudioWorkletNode(this.audioContext, "audio-player-processor");
        this.workletNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.recorderNode = this.audioContext.createScriptProcessor(512, 1, 1);
        this.recorderNode.onaudioprocess = (event) => {
            // Pass the input along as-is
            const inputData = event.inputBuffer.getChannelData(0);
            const outputData = event.outputBuffer.getChannelData(0);
            outputData.set(inputData);
            // Notify listeners that the audio was played
            const samples = new Float32Array(outputData.length);
            samples.set(outputData);
            this.onAudioPlayedListeners.map(listener => listener(samples));
        }
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

            logTimeElapsedSinceLastWrite() {
                const now = Date.now();
                if (this.lastWriteTime !== 0) {
                    const elapsed = now - this.lastWriteTime;
                    console.log(\`Elapsed time since last audio buffer write: \${elapsed} ms\`);
                }
                this.lastWriteTime = now;
            }

            write(samples) {
                this.logTimeElapsedSinceLastWrite();
                if (this.writeIndex + samples.length <= this.buffer.length) {
                    // Enough space to append the new samples
                }
                else {
                    if (samples.length <= this.readIndex) {
                        const subarray = this.buffer.subarray(this.readIndex, this.writeIndex);
                        console.log(\`Shifting the audio buffer of length \${subarray.length} by \${this.readIndex}\`);
                        this.buffer.set(subarray);
                    }
                    else {
                        const newLength = (samples.length + this.writeIndex - this.readIndex) * 2;
                        const newBuffer = new Float32Array(newLength);
                        console.log(\`Expanding the audio buffer from \${this.buffer.length} to \${newLength}\`);
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
                    console.log("Initial audio buffer filled");
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
                    console.log(\`Detected audio buffer underflow of \${this.underflowedSamples} samples\`);
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

            clearBuffer() {
                this.readIndex = 0;
                this.writeIndex = 0;
            }
        }

        class AudioPlayerProcessor extends AudioWorkletProcessor {
            constructor() {
                super();
                this.playbackBuffer = new ExpandableBuffer();
                this.port.onmessage = (event) => {
                    if (event.data.type === "audio") {
                        this.playbackBuffer.write(event.data.audioData);
                    }
                    else if (event.data.type === "initial-buffer-length") {
                        const newLength = event.data.bufferLength;
                        this.playbackBuffer.initialBufferLength = newLength;
                        console.log(\`Changed initial audio buffer length to: \${newLength}\`)
                    }
                    else if (event.data.type === "barge-in") {
                        this.playbackBuffer.clearBuffer();
                    }
                };
            }

            process(inputs, outputs, parameters) {
                const output = outputs[0][0];
                this.playbackBuffer.read(output);
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