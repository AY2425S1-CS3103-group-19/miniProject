// JS Websocket Client

let audioContext;
let socket = new WebSocket("ws://localhost:8765");
const statusElement = document.getElementById("status");
const pttButton = document.getElementById("pushToTalkButton");
let isAllowedToSpeak = false;

socket.onopen = () => {
    console.log("WebSocket connection opened.");
    pttButton.disabled = false;
    statusElement.innerText = "Status: Connected";
};

socket.onclose = () => {
    pttButton.disabled = true;
    statusElement.innerText = "Status: Disconnected";
    alert("Connection lost. Please reconnect.");
};

socket.onerror = () => {
    console.error("WebSocket error:", error);
    alert("WebSocket connection failed.");
};

socket.onmessage = (event) => {
    const message = event.data;

    if (message === "allow_speak") {
        isAllowedToSpeak = true;
        pttButton.disabled = false;
        statusElement.innerText = "Status: You can now speak.";
    } else {
        isAllowedToSpeak = false;
        pttButton.disabled = true;
        statusElement.innerText = "Status: Another student is speaking.";
    }
};

// Capture microphone input
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    let mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
        if (isAllowedToSpeak) {
            socket.send(event.data);  // Send the audio data to the server
        }
    };
    
    // Start recording when button is pressed
    document.getElementById('pushToTalkButton').addEventListener('mousedown', () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext created.");
        } else if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("AudioContext resumed.");
            });
        }
        
        if (isAllowedToSpeak) {
            mediaRecorder.start();
            statusElement.innerText = "Status: Speaking...";
        }
    });

    // Stop recording when button is released
    document.getElementById('pushToTalkButton').addEventListener('mouseup', () => {
        mediaRecorder.stop();
        statusElement.innerText = "Status: Connected";
    });
});
