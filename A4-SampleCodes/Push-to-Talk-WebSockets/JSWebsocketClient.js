// JS Websocket Client Sample
// Author: Bhojan Anand, NUS SoC

let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let socket = new WebSocket("ws://your-server-ip:8765");

// Capture microphone input
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    let mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
        socket.send(event.data);  // Send the audio data to the server
    };
    
    // Start recording when button is pressed
    document.getElementById('pushToTalkButton').addEventListener('mousedown', () => {
        mediaRecorder.start();
    });

    // Stop recording when button is released
    document.getElementById('pushToTalkButton').addEventListener('mouseup', () => {
        mediaRecorder.stop();
    });
});
