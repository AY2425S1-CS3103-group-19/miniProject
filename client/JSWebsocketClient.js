// JS Websocket Client

const defaultSampleRate = 48000;
const statusElement = document.getElementById("status");
const pttButton = document.getElementById("pushToTalkButton");
const connectButton = document.getElementById("connectButton");
const disconnectButton = document.getElementById("disconnectButton");

let isAllowedToSpeak = false;
let socket, audioContext, mediaStream, audioProcessor;

function connect() {
    // Disable button once its pressed to prevent spamming
    connectButton.disabled = true;
    statusElement.innerText = "Status: Connecting...";

    let ipaddr = document.getElementById("ipaddr").value;
    let portno = document.getElementById("portno").value;

    socket = new WebSocket("ws://" + ipaddr + ":" + portno);

    socket.onopen = () => {
        console.log("WebSocket connection opened.");
        pttButton.disabled = false;
        // Enable button to allow disconnection from the server
        disconnectButton.disabled = false;
        statusElement.innerText = "Status: Connected. You can now speak.";
    };

    socket.onclose = () => {
        pttButton.disabled = true;
        // Enable button once its disconnected from the server
        connectButton.disabled = false;
        disconnectButton.disabled = true;
        statusElement.innerText = "Status: Disconnected";
        alert("Connection failed. Please reconnect.");
    };

    socket.onerror = () => {
        console.error("WebSocket error:", error);
        alert("WebSocket connection failed.");
    };

    socket.onmessage = (event) => {
        const message = event.data;

        if (message === "speak_granted") {
            isAllowedToSpeak = true;
            pttButton.disabled = false;
            statusElement.innerText = "Status: Speaking...";

            // Start processing audio
            mediaStream.connect(audioProcessor);
            audioProcessor.connect(audioContext.destination);

        } else if (message === "speak_denied") {
            isAllowedToSpeak = false;
            pttButton.disabled = true;
            statusElement.innerText = "Status: Another student is speaking.";

        } else if (message === "speak_released") {
            isAllowedToSpeak = true;
            pttButton.disabled = false;
            statusElement.innerText = "Status: Connected. You can now speak.";
        }
    };
}

function disconnect() {
    const closeMessage = JSON.stringify({ type: "close_connection" });
    socket.send(closeMessage);
    socket.close();
}

// Capture audio using Web Audio API
/* 
    Note: `createScriptProcessor()` and the `onaudioprocess` are deprecated.
    It is recommended to use `AudioWorklet` instead for lower latency and more efficient processing.
*/
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => { 
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const client_sample_rate = audioContext.sampleRate;

    if (client_sample_rate !== defaultSampleRate) {
        const msg = JSON.stringify({ type: "send_sample_rate", sample_rate: client_sample_rate });
        socket.send(msg);
        console.log("Send client sample rate");
        console.log(client_sample_rate);
    }

    // Captures audio from the user's microphone for processing
    mediaStream = audioContext.createMediaStreamSource(stream);

    // Create a ScriptProcessorNode to process audio data in chunks.
    audioProcessor = audioContext.createScriptProcessor(bufferSize=4096, 
                                                        numberOfInputChannels=1, 
                                                        numberOfOutputChannels=1);

    // Register an event handler to process audio in real-time
    // onaudioprocess is called whenever a new chunk of audio data is available
    audioProcessor.onaudioprocess = (audioEvent) => {
        // Get raw PCM data from the input audio buffer as Float32 values
        const audioBuffer = audioEvent.inputBuffer.getChannelData(0);
        const pcmData = float32ToInt16(audioBuffer);

        if (socket.readyState === WebSocket.OPEN) {
            socket.send(pcmData);  // Send the PCM data via WebSocket
            console.log("Sent audio chunk");
        }
    }
    
    // Start audio processing when PTT button is pressed
    pttButton.addEventListener('mousedown', () => {
        const requestMessage = JSON.stringify({ type: "request_speaker" });
        socket.send(requestMessage);  // Request to speak

        // Start processing audio when the server have granted access.
    });

    // Stop audio processing when button is released
    pttButton.addEventListener('mouseup', () => {
        const releaseMessage = JSON.stringify({ type: "release_speaker" });
        socket.send(releaseMessage);  // Notify server to release speaker

        if (isAllowedToSpeak) {
            mediaStream.disconnect(audioProcessor);  // Stop processing audio
            audioProcessor.disconnect(audioContext.destination);
        }
    });
}).catch(error => {
    console.error("Microphone access error:", error);
    alert("Please allow microphone access.");
});


// Convert Float32 audio data to Int16 data
// - Float32 takes the range: -1.0 to 1.0
// - Int16 takes the range: -(2 ** 15) to (2 ** 15 - 1)
function float32ToInt16(buffer) {
    let length = buffer.length;
    let pcmBuffer = new Int16Array(length);
    while (length--) {
        pcmBuffer[length] = Math.max(-1, Math.min(1, buffer[length])) * (2 ** 15 - 1);
    }
    return pcmBuffer.buffer;  // Return ArrayBuffer for WebSocket transmission
}
