/**
 * Nova Voice Engine
 * WebSocket-based voice chat using AWS Nova
 */

import { VoiceEngine } from './voiceEngine.js';
import { debugLog } from '../config.js';

export class NovaVoiceEngine extends VoiceEngine {
    constructor(config) {
      super(config);
      this.socket = null;
      this.audioContext = null;
      this.mediaStream = null;
      this.processor = null;
      this.sourceNode = null;
      this.audioPlayer = null;
      this.sessionInitialized = false;
    }

    async start() {
        if (this.isActive) {
          debugLog('warn', 'Voice engine already active');
          return;
        }

        try {
            this.onStatusChange?.('Initializing...');
            
            // Initialize audio context
            await this.initAudio();
            
            // Connect to WebSocket server
            await this.connectWebSocket();
            
            // Initialize session
            await this.initializeSession();
            
            // Start audio streaming
            await this.startAudioStreaming();
            
            this.isActive = true;
            this.onStatusChange?.('Active - Speak now');
            
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
    
            this.onStatusChange?.('Stopped');
            debugLog('info', 'Voice engine stopped');
        } catch (error) {
            debugLog('error', 'Error stopping voice engine:', error);
        }
    }

    async initAudio() {
        try {
          // Request microphone access
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
    
          // Create audio context
          this.audioContext = new AudioContext({
            sampleRate: 16000
          });
    
          debugLog('info', 'Audio initialized successfully');
        } catch (error) {
          throw new Error(`Failed to initialize audio: ${error.message}`);
        }
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
          try {
            // Use Socket.IO client (assuming it's available globally)
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
    
        // Send initialization events
        this.socket.emit('promptStart');
        
        if (this.config.systemPrompt) {
          this.socket.emit('systemPrompt', this.config.systemPrompt);
        }
        
        this.socket.emit('audioStart');
        
        this.sessionInitialized = true;
        debugLog('info', 'Session initialized');
    }

    async startAudioStreaming() {
        if (!this.audioContext || !this.mediaStream) {
          throw new Error('Audio not initialized');
        }
    
        // Create audio processing chain
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.audioContext.createScriptProcessor(512, 1, 1);
    
        this.processor.onaudioprocess = (e) => {
          if (!this.isActive) return;
    
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
    
          // Convert to 16-bit PCM
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
    
          // Convert to base64 and send
          const base64Data = this.arrayBufferToBase64(pcmData.buffer);
          this.socket?.emit('audioInput', base64Data);
        };
    
        this.sourceNode.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
    
        debugLog('info', 'Audio streaming started');
    }

    playAudio(audioData) {
        if (!this.audioContext) return;
    
        try {
          const audioBuffer = this.audioContext.createBuffer(1, audioData.length, 24000);
          audioBuffer.getChannelData(0).set(audioData);
    
          const source = this.audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(this.audioContext.destination);
          source.start();
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
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}


