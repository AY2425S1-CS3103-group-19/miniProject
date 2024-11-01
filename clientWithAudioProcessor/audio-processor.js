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

        // Only process audio if recording is true
        if (this.recording) {
            if (input.length > 0 && input[0].length > 0) {
                const inputData = input[0];

                // Send PCM data to main thread
                if (this.port) {
                    this.port.postMessage(inputData);
                }
            }
        }

        return true;  // Keep processor alive
    }
}

// Register the processor
registerProcessor('my-processor', MyAudioProcessor);
