// JS WebSocket Client

const defaultSampleRate = 48000;
const statusElement = document.getElementById("status");
const pttButton = document.getElementById("pushToTalkButton");
const connectButton = document.getElementById("connectButton");
const disconnectButton = document.getElementById("disconnectButton");

let isAllowedToSpeak = false;
let socket, audioContext, mediaStream, audioProcessor, client_sample_rate;

const MESSAGE_TYPES = {
    REQUEST_SPEAKER: "request_speaker",
    RELEASE_SPEAKER: "release_speaker",
    SEND_SAMPLE_RATE: "send_sample_rate",
    CLOSE_CONNECTION: "close_connection",
    SPEAK_GRANTED: "speak_granted",
    SPEAK_DENIED: "speak_denied",
    SPEAK_RELEASED: "speak_released"
};

function connect() {
    // Disable button once it's pressed to prevent spamming
    connectButton.disabled = true;
    statusElement.innerText = "Status: Connecting...";

    let ipaddr = document.getElementById("ipaddr").value;
    let portno = document.getElementById("portno").value;

    socket = new WebSocket("ws://" + ipaddr + ":" + portno);

    socket.onopen = () => {
        console.log("WebSocket connection opened.");
        pttButton.disabled = false;
        disconnectButton.disabled = false;
        statusElement.innerText = "Status: Connected. You can now speak.";

        // Send sample rate as soon as socket is connected
        if (client_sample_rate !== defaultSampleRate) {
            const msg = JSON.stringify({ type: MESSAGE_TYPES.SEND_SAMPLE_RATE, sample_rate: client_sample_rate });
            socket.send(msg);
            console.log("Send client sample rate:", client_sample_rate);
        }
    };

    socket.onclose = () => {
        pttButton.disabled = true;
        connectButton.disabled = false;
        disconnectButton.disabled = true;
        statusElement.innerText = "Status: Disconnected";
        console.log("Connection closed. Please reconnect.");
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        alert("WebSocket connection failed.");
    };

    socket.onmessage = (event) => {
        const message = event.data;

        if (message === MESSAGE_TYPES.SPEAK_GRANTED) {
            isAllowedToSpeak = true;
            pttButton.disabled = false;
            statusElement.innerText = "Status: Speaking...";

            // Start processing audio
            mediaStream.connect(audioProcessor);
            audioProcessor.connect(audioContext.destination);

        } else if (message === MESSAGE_TYPES.SPEAK_DENIED) {
            isAllowedToSpeak = false;
            pttButton.disabled = true;
            statusElement.innerText = "Status: Another student is speaking.";

        } else if (message === MESSAGE_TYPES.SPEAK_RELEASED) {
            isAllowedToSpeak = true;
            pttButton.disabled = false;
            statusElement.innerText = "Status: Connected. You can now speak.";
        }
    };
}


function disconnect() {
    if (socket.readyState === WebSocket.OPEN) {
        const closeMessage = JSON.stringify({ type: MESSAGE_TYPES.CLOSE_CONNECTION });
        socket.send(closeMessage);
        socket.close();
    }
}


// Capture audio using Web Audio API
/* 
    Note: `createScriptProcessor()` and the `onaudioprocess` are deprecated.
    It is recommended to use `AudioWorklet` instead for lower latency and more efficient processing.
*/
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => { 
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    client_sample_rate = audioContext.sampleRate;

    // Captures audio from the user's microphone for processing
    mediaStream = audioContext.createMediaStreamSource(stream);

    // Create a ScriptProcessorNode to process audio data in chunks.
    // bufferSize=0 means the program will automatically determine the buffer size 
    audioProcessor = audioContext.createScriptProcessor(bufferSize=0, 
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
        const requestMessage = JSON.stringify({ type: MESSAGE_TYPES.REQUEST_SPEAKER });
        socket.send(requestMessage);  // Request to speak

        // Start processing audio when the server have granted access.
    });

    // Stop audio processing when button is released
    pttButton.addEventListener('mouseup', () => {
        const releaseMessage = JSON.stringify({ type: MESSAGE_TYPES.RELEASE_SPEAKER });
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


// Disconnect before closing the tab/browser
window.addEventListener("beforeunload", (event) => {
    disconnect();
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
