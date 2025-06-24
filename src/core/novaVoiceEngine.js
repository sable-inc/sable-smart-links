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
        this.config = config;
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
        
        // Store tool handlers for client-side processing
        this.toolHandlers = new Map();
        if (config.tools) {
            console.log('[NovaVoiceEngine] Constructor - config.tools:', config.tools);
            console.log('[NovaVoiceEngine] Constructor - tools length:', config.tools?.length || 0);
            config.tools.forEach(tool => {
                this.toolHandlers.set(tool.name, tool.handler);
            });
        }

        // Add state tracking for AI speech
        this.isAISpeaking = false;
        this.aiSpeechTimeout = null;
        
        // Add speaking speed configuration
        this.speakingSpeed = config.speakingSpeed || 1.1; // Default to 25% faster
    }

    // Add method to set speaking speed
    setSpeakingSpeed(speed) {
        this.speakingSpeed = Math.max(0.5, Math.min(2.0, speed)); // Clamp between 0.5x and 2.0x
        debugLog('info', `Speaking speed set to ${this.speakingSpeed}x`);
        
        // Apply to audio player if initialized
        if (this.audioPlayer && this.audioPlayer.initialized) {
            this.audioPlayer.setPlaybackRate(this.speakingSpeed);
        }
    }

    // Add method to get current speaking speed
    getSpeakingSpeed() {
        return this.speakingSpeed;
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
          
          // Set initial playback rate
          this.audioPlayer.setPlaybackRate(this.speakingSpeed);
    
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
                  // Mark that AI is speaking when audio output is received
                  this.isAISpeaking = true;
                  
                  // Clear any existing timeout
                  if (this.aiSpeechTimeout) {
                    clearTimeout(this.aiSpeechTimeout);
                  }
                  
                  // Set timeout to mark AI as not speaking after a brief silence
                  this.aiSpeechTimeout = setTimeout(() => {
                    this.isAISpeaking = false;
                    debugLog('info', 'AI speech ended (timeout)');
                  }, 1000); // 1 second of silence = AI stopped speaking
                  
                  const audioData = this.base64ToFloat32Array(data.content);
                  this.playAudio(audioData);
                } catch (error) {
                  debugLog('error', 'Error processing audio data:', error);
                }
              }
            });

            // Handle tool use events from server
            this.socket.on('toolUse', (data) => {
              debugLog('info', 'Tool use received:', data);
              this.handleToolUse(data);
            });

            // Handle speech interruption response from server
            this.socket.on('speechInterrupted', () => {
              debugLog('info', 'Speech interruption confirmed by server');
              // Mark AI as not speaking since we interrupted it
              this.isAISpeaking = false;
              if (this.aiSpeechTimeout) {
                clearTimeout(this.aiSpeechTimeout);
                this.aiSpeechTimeout = null;
              }
              
              // Clear the audio buffer to stop current playback
              if (this.audioPlayer && this.audioPlayer.initialized) {
                this.audioPlayer.bargeIn();
                debugLog('info', 'Audio buffer cleared due to interruption');
              }
            });
    
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
          // Send tools FIRST (before any other events)
          if (this.config.tools && this.config.tools.length > 0) {
            const toolsConfig = this.config.tools.map(tool => ({
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters
            }));
            
            console.log('Sending toolsConfig to server:', toolsConfig);
            this.socket.emit('toolsConfig', toolsConfig);
          }

          // Wait a brief moment to ensure tools are received
          await new Promise(resolve => setTimeout(resolve, 50));

          // Follow EXACT original AWS sequence
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

    async handleToolUse(toolData) {
        const { toolName, toolUseId, content } = toolData;
        
        debugLog('info', `Handling tool use: ${toolName}`);
        
        try {
            // Check if we have a client-side handler
            const handler = this.toolHandlers.get(toolName);
            
            if (handler) {
                // Execute client-side tool
                let parameters;
                if (typeof content === 'string') {
                    try {
                        parameters = JSON.parse(content);
                    } catch (e) {
                        parameters = { content: content };
                    }
                } else {
                    parameters = content;
                }
                
                const result = await handler(parameters);
                
                // Send result back to server
                this.socket.emit('toolResult', {
                    toolUseId,
                    result: typeof result === 'string' ? result : JSON.stringify(result)
                });
                
                debugLog('info', `Tool ${toolName} executed successfully`);
            } else {
                debugLog('info', `Tool ${toolName} will be handled by server`);
            }
        } catch (error) {
            debugLog('error', `Error executing tool ${toolName}:`, error);
            
            // Send error back to server
            this.socket.emit('toolResult', {
                toolUseId,
                error: error.message
            });
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
    
          // Voice activity detection with improved logic
          let silenceCount = 0;
          let voiceActivityThreshold = 0.015; // Slightly lower threshold (was 0.02)
          let isSpeaking = false;
          let consecutiveVoiceFrames = 0;
          const minVoiceFrames = 3; // Require 3 consecutive frames of voice activity

          this.processor.onaudioprocess = (e) => {
            if (!this.isActive) return;
    
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate RMS (Root Mean Square) for voice activity detection
            let rms = 0;
            for (let i = 0; i < inputData.length; i++) {
              rms += inputData[i] * inputData[i];
            }
            rms = Math.sqrt(rms / inputData.length);

            // Voice activity detection with hysteresis
            if (rms > voiceActivityThreshold) {
              consecutiveVoiceFrames++;
            } else {
              consecutiveVoiceFrames = 0;
            }

            const wasNotSpeaking = !isSpeaking;
            isSpeaking = consecutiveVoiceFrames >= minVoiceFrames;

            // ONLY trigger interruption if:
            // 1. User just started speaking (wasNotSpeaking && isSpeaking)
            // 2. AND AI is currently speaking (this.isAISpeaking)
            if (wasNotSpeaking && isSpeaking && this.isAISpeaking) {
              debugLog('info', 'User interrupting AI - sending interruption signal');
              this.socket?.emit('interruptSpeech');
              
              // Also immediately clear local audio buffer
              if (this.audioPlayer && this.audioPlayer.initialized) {
                this.audioPlayer.bargeIn();
              }
            }

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
    
        debugLog('info', 'Audio streaming started with improved voice activity detection');
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


