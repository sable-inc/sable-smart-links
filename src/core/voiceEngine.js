/**
 * Voice Engine Interface
 * Base class for voice chat implementations
 */

export class VoiceEngine {
    constructor(config) {
      this.config = config;
      this.isActive = false;
      this.onAudioOutput = null;
      this.onTextOutput = null;
      this.onError = null;
      this.onStatusChange = null;
    }

    async start() {
        throw new Error('start() method must be implemented by subclass');
      }
    
    async stop() {
    throw new Error('stop() method must be implemented by subclass');
    }

    isRunning() {
    return this.isActive;
    }

    setCallbacks(callbacks) {
    this.onAudioOutput = callbacks.onAudioOutput;
    this.onTextOutput = callbacks.onTextOutput;
    this.onError = callbacks.onError;
    this.onStatusChange = callbacks.onStatusChange;
    }
}