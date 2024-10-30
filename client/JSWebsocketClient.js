// JS Websocket Client

let mediaRecorder;
let audioContext; // Cannot create the audio context here
let socket = new WebSocket("ws://localhost:8765");
const statusElement = document.getElementById("status");
const pttButton = document.getElementById("pushToTalkButton");
let isAllowedToSpeak = false;

socket.onopen = () => {
    console.log("WebSocket connection opened.");
    pttButton.disabled = false;
    statusElement.innerText = "Status: Connected. You can now speak.";
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

    if (message === "speak_granted") {
        isAllowedToSpeak = true;
        pttButton.disabled = false;
        statusElement.innerText = "Status: Speaking...";

        // Start recording with timeslice to send data periodically
        mediaRecorder.start(100); // Capture and send audio in 100ms chunks 
        console.log("Recording audio.");

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

// Capture microphone input
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
        if (isAllowedToSpeak) {
            socket.send(event.data);  // Send the audio data to the server
            console.log("Send audio");
        }
    };
    
    // Start recording when button is pressed
    document.getElementById('pushToTalkButton').addEventListener('mousedown', () => {
        // Create the audio context after button is pressed
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext created.");
        } else if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("AudioContext resumed.");
            });
        }
        
        // Send speaker request to the server
        const requestMessage = JSON.stringify({ type: "request_speaker" });
        socket.send(requestMessage); 
        console.log("Sent request to speak");
    });

    // Stop recording when button is released
    document.getElementById('pushToTalkButton').addEventListener('mouseup', () => {
        mediaRecorder.requestData();
        mediaRecorder.stop();

        // Set delay to ensure all chunks are sent
        setTimeout(() => {
            // Notify server to release speaker
            const releaseMessage = JSON.stringify({ type: "release_speaker" });
            socket.send(releaseMessage);  
            console.log("Sent release speaker message.");
        }, 500);  
    });
});
