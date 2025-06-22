/**
 * Nova Voice Engine
 * WebSocket-based voice chat using AWS Nova
 */

import { VoiceEngine } from './voiceEngine.js';
import { debugLog } from '../config.js';
import { AudioPlayer } from '../audio/lib/play/AudioPlayer.js';

export class NovaVoiceEngine extends VoiceEngine {
    constructor(config) {
      super(config);
      this.socket = null;
      this.audioContext = null;
      this.mediaStream = null;
      this.processor = null;
      this.sourceNode = null;
      this.sessionInitialized = false;
      this.samplingRatio = 1;
      this.TARGET_SAMPLE_RATE = 16000;
      this.isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
      
      // Initialize the proper AudioPlayer
      this.audioPlayer = new AudioPlayer();
    }

    async start() {
        if (this.isActive) {
          debugLog('warn', 'Voice engine already active');
          return;
        }

        try {
            this.onStatusChange?.('Initializing...');
            
            // Initialize audio first (like the original)
            await this.initAudio();
            
            // Connect to WebSocket server
            await this.connectWebSocket();
            
            // Initialize session
            await this.initializeSession();
            
            // Start audio streaming
            await this.startAudioStreaming();
            
            this.isActive = true;
            this.onStatusChange?.('Streaming... Speak now');
            
            debugLog('info', 'Voice engine started successfully');
          } catch (error) {
            debugLog('error', 'Failed to start voice engine:', error);
            this.onError?.(error);
            await this.stop();
        }
    }

    async stop() {
        if (!this.isActive) return;
    
        this.isActive = false;
        this.onStatusChange?.('Stopping...');
    
        try {
            // Stop audio streaming
            if (this.processor) {
            this.processor.disconnect();
            this.sourceNode?.disconnect();
            }
    
            // Stop media stream
            if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            }
    
            // Close audio context
            if (this.audioContext) {
            await this.audioContext.close();
            }
    
            // Close WebSocket
            if (this.socket) {
            this.socket.emit('stopAudio');
            this.socket.disconnect();
            }
    
            // Stop the AudioPlayer
            if (this.audioPlayer) {
                this.audioPlayer.stop();
            }
    
            this.onStatusChange?.('Stopped');
            debugLog('info', 'Voice engine stopped');
        } catch (error) {
            debugLog('error', 'Error stopping voice engine:', error);
        }
    }

    async initAudio() {
        try {
          this.onStatusChange?.('Requesting microphone access...');
          
          // Request microphone access (exactly like original)
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
    
          // Create audio context (exactly like original)
          if (this.isFirefox) {
            this.audioContext = new AudioContext();
          } else {
            this.audioContext = new AudioContext({
              sampleRate: this.TARGET_SAMPLE_RATE
            });
          }
    
          // Calculate sampling ratio (exactly like original)
          this.samplingRatio = this.audioContext.sampleRate / this.TARGET_SAMPLE_RATE;
          debugLog('info', `AudioContext sampleRate: ${this.audioContext.sampleRate}, samplingRatio: ${this.samplingRatio}`);
          
          // Initialize the AudioPlayer
          await this.audioPlayer.start();
    
          this.onStatusChange?.('Microphone ready');
          debugLog('info', 'Audio initialized successfully');
        } catch (error) {
          throw new Error(`Failed to initialize audio: ${error.message}`);
        }
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
          try {
            this.onStatusChange?.('Connecting to server...');
            
            // Check if io is available globally
            if (typeof io === 'undefined') {
              throw new Error('Socket.IO client not available. Please include socket.io-client in your page.');
            }
    
            this.socket = io(this.config.serverUrl || 'ws://localhost:3001');
    
            this.socket.on('connect', () => {
              debugLog('info', 'WebSocket connected');
              resolve();
            });
    
            this.socket.on('disconnect', () => {
              debugLog('info', 'WebSocket disconnected');
            });
    
            this.socket.on('error', (error) => {
              debugLog('error', 'WebSocket error:', error);
              this.onError?.(error);
            });
    
            this.socket.on('textOutput', (data) => {
              debugLog('info', 'Received text:', data.content);
              this.onTextOutput?.(data.content);
            });
    
            this.socket.on('audioOutput', (data) => {
              if (data.content) {
                try {
                  const audioData = this.base64ToFloat32Array(data.content);
                  this.playAudio(audioData);
                } catch (error) {
                  debugLog('error', 'Error processing audio data:', error);
                }
              }
            });
    
            // Set connection timeout
            setTimeout(() => {
              if (!this.socket.connected) {
                reject(new Error('WebSocket connection timeout'));
              }
            }, 5000);
    
          } catch (error) {
            reject(error);
          }
        });
    }

    async initializeSession() {
        if (!this.socket) throw new Error('WebSocket not connected');
    
        this.onStatusChange?.('Initializing session...');
    
        try {
          // Send initialization events (exactly like original)
          this.socket.emit('promptStart');
          
          if (this.config.systemPrompt) {
            this.socket.emit('systemPrompt', this.config.systemPrompt);
          }
          
          this.socket.emit('audioStart');
          
          this.sessionInitialized = true;
          debugLog('info', 'Session initialized');
        } catch (error) {
          throw new Error(`Failed to initialize session: ${error.message}`);
        }
    }

    async startAudioStreaming() {
        if (!this.audioContext || !this.mediaStream) {
          throw new Error('Audio not initialized');
        }
    
        // Create audio processing chain (exactly like original)
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        if (this.audioContext.createScriptProcessor) {
          this.processor = this.audioContext.createScriptProcessor(512, 1, 1);
    
          this.processor.onaudioprocess = (e) => {
            if (!this.isActive) return;
    
            const inputData = e.inputBuffer.getChannelData(0);
            const numSamples = Math.round(inputData.length / this.samplingRatio);
            const pcmData = this.isFirefox ? new Int16Array(numSamples) : new Int16Array(inputData.length);
    
            // Convert to 16-bit PCM (exactly like original)
            if (this.isFirefox) {
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i * this.samplingRatio])) * 0x7FFF;
              }
            } else {
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
            }
    
            // Convert to base64 and send (exactly like original)
            const base64Data = this.arrayBufferToBase64(pcmData.buffer);
            this.socket?.emit('audioInput', base64Data);
          };
    
          this.sourceNode.connect(this.processor);
          this.processor.connect(this.audioContext.destination);
        }
    
        debugLog('info', 'Audio streaming started');
    }

    playAudio(audioData) {
        if (!this.audioPlayer || !this.audioPlayer.initialized) {
            debugLog('error', 'AudioPlayer not initialized');
            return;
        }

        try {
            // Use the proper AudioPlayer instead of createBufferSource
            this.audioPlayer.playAudio(audioData);
        } catch (error) {
            debugLog('error', 'Error playing audio:', error);
        }
    }

    base64ToFloat32Array(base64String) {
        try {
          const binaryString = window.atob(base64String);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
    
          const int16Array = new Int16Array(bytes.buffer);
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
          }
    
          return float32Array;
        } catch (error) {
          debugLog('error', 'Error converting base64 to Float32Array:', error);
          throw error;
        }
    }

    arrayBufferToBase64(buffer) {
        // Use the exact same method as the original
        const binary = [];
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary.push(String.fromCharCode(bytes[i]));
        }
        return btoa(binary.join(''));
    }
}


