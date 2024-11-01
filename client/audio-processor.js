class MyAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.recording = false;  // Add a flag to check if recording
        this.port.onmessage = (event) => {
            if (event.data.command === 'startRecording') {
                this.recording = true;
                console.log('Recording started');
            } else if (event.data.command === 'stopRecording') {
                this.recording = false;
                console.log('Recording stopped');
            }
        };
    }

    process(inputs, outputs) {
        const input = inputs[0];
        const output = outputs[0];

        // Only process audio if recording is true
        if (this.recording) {
            if (input.length > 0 && input[0].length > 0) {
                const inputData = input[0];
                const pcmData = this.float32ToInt16(inputData);

                // Send PCM data via WebSocket
                if (this.port) {
                    this.port.postMessage(pcmData);
                }
            }

            // Output the same audio as input (bypass)
            for (let channel = 0; channel < output.length; channel++) {
                output[channel].set(input[channel] || new Float32Array(0));
            }
        }

        return true;  // Keep processor alive
    }

    // Convert Float32 audio data to Int16 data
    // - Float32 takes the range: -1.0 to 1.0
    // - Int16 takes the range: -(2 ** 15) to (2 ** 15 - 1)
    float32ToInt16(buffer) {
        const length = buffer.length;
        const pcmBuffer = new Int16Array(length);
        for (let i = 0; i < length; i++) {
            pcmBuffer[i] = Math.max(-1, Math.min(1, buffer[i])) * (2 ** 15 - 1);
        }
        return pcmBuffer;  // Return Int16 Array
    }
}

// Register the processor
registerProcessor('my-processor', MyAudioProcessor);
