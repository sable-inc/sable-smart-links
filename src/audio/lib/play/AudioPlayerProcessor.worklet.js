// Audio sample buffer to minimize reallocations
class ExpandableBuffer {

    constructor() {
        // Start with one second's worth of buffered audio capacity before needing to expand
        this.buffer = new Float32Array(24000);
        this.readIndex = 0;
        this.writeIndex = 0;
        this.underflowedSamples = 0;
        this.isInitialBuffering = true;
        this.initialBufferLength = 24000;  // One second
        this.lastWriteTime = 0;
    }

    write(samples) {
        if (this.writeIndex + samples.length <= this.buffer.length) {
            // Enough space to append the new samples
        }
        else {
            // Not enough space ...
            if (samples.length <= this.readIndex) {
                // ... but we can shift samples to the beginning of the buffer
                const subarray = this.buffer.subarray(this.readIndex, this.writeIndex);
                this.buffer.set(subarray);
            }
            else {
                // ... and we need to grow the buffer capacity to make room for more audio
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
            // Filled the initial buffer length, so we can start playback with some cushion
            this.isInitialBuffering = false;
        }
    }

    read(destination) {
        let copyLength = 0;
        if (!this.isInitialBuffering) {
            // Only start to play audio after we've built up some initial cushion
            copyLength = Math.min(destination.length, this.writeIndex - this.readIndex);
        }
        destination.set(this.buffer.subarray(this.readIndex, this.readIndex + copyLength));
        this.readIndex += copyLength;
        if (copyLength > 0 && this.underflowedSamples > 0) {
            this.underflowedSamples = 0;
        }
        if (copyLength < destination.length) {
            // Not enough samples (buffer underflow). Fill the rest with silence.
            destination.fill(0, copyLength);
            this.underflowedSamples += destination.length - copyLength;
        }
        if (copyLength === 0) {
            // Ran out of audio, so refill the buffer to the initial length before playing more
            this.isInitialBuffering = true;
        }
    }

    // Add method to read with speed adjustment
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
            // Create temporary buffer for speed adjustment
            const tempBuffer = new Float32Array(copyLength);
            tempBuffer.set(this.buffer.subarray(this.readIndex, this.readIndex + copyLength));
            this.readIndex += copyLength;

            // Apply speed adjustment using linear interpolation
            for (let i = 0; i < destination.length; i++) {
                const sourceIndex = i * playbackRate;
                const index = Math.floor(sourceIndex);
                const fraction = sourceIndex - index;
                
                if (index + 1 < tempBuffer.length) {
                    // Linear interpolation between two samples
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
            // Not enough samples - fill with silence
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
        this.playbackRate = 1.0; // Add playback rate property
        
        this.port.onmessage = (event) => {
            if (event.data.type === "audio") {
                this.playbackBuffer.write(event.data.audioData);
            }
            else if (event.data.type === "initial-buffer-length") {
                // Override the current playback initial buffer length
                const newLength = event.data.bufferLength;
                this.playbackBuffer.initialBufferLength = newLength;
            }
            else if (event.data.type === "barge-in") {
                this.playbackBuffer.clearBuffer();
            }
            else if (event.data.type === "playback-rate") {
                this.playbackRate = event.data.rate;
                console.log(`AudioWorklet: Playback rate set to ${this.playbackRate}x`);
            }
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0][0]; // Assume one output with one channel
        
        // Use speed-aware read method
        this.playbackBuffer.readWithSpeed(output, this.playbackRate);
        
        return true; // True to continue processing
    }
}

registerProcessor("audio-player-processor", AudioPlayerProcessor);