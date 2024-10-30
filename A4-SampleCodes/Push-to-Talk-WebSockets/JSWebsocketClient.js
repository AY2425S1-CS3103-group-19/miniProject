let audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Create AudioContext in the global scope
let mediaRecorder;
let recording = false;
let socket; // Declare global WebSocket variable
let speakingUser = null; // Current speaking user
let mediaStream; // Declare media stream variable

const statusMessageDiv = document.getElementById('statusMessage'); // Get status message div

// Request microphone permission and initialize media stream
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaStream = stream; // Store media stream
    console.log("Microphone access granted.");
}).catch(error => {
    console.error("Error accessing microphone:", error);
});

document.getElementById('pushToTalkButton').addEventListener('mousedown', () => {
    if (speakingUser) {
        statusMessageDiv.textContent = "Another user is currently speaking. Please wait."; // Display prompt message on screen
        return; // If another user is speaking, prevent new connection
    }

    // Connect to WebSocket
    socket = new WebSocket("ws://127.0.0.1:8765");

    socket.onopen = () => {
        console.log("WebSocket connection opened.");
        speakingUser = true; // Set current user to speaking status
        statusMessageDiv.textContent = "You are speaking..."; // Update status message on screen

        // Create MediaRecorder with the existing media stream
        mediaRecorder = new MediaRecorder(mediaStream);

        mediaRecorder.ondataavailable = (event) => {
            if (recording) {
                socket.send(event.data);  // Send audio data to server
            }
        };

        if (!recording) {
            recording = true;
            mediaRecorder.start();
            console.log("Recording started.");
        }
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };
});

document.getElementById('pushToTalkButton').addEventListener('mouseup', () => {
    if (recording) {
        recording = false;
        mediaRecorder.stop();
        console.log("Recording stopped.");

        // Close WebSocket connection
        if (socket) {
            socket.close();
            console.log("WebSocket connection closed.");
            speakingUser = null; // Reset speaking status
            statusMessageDiv.textContent = ""; // Clear status message
        }
    }
});
