# CS3103 Mini Project - PTT Button

## Introduction
This project is a Push-to-Talk (PTT) button system that allows real-time audio communication between clients and a server using WebSockets. The server handles multiple clients, plays audio in real-time, and optionally saves audio files.


## Prerequisites
- Python 3.x
- Modern web browser with WebSocket and Audio API support

### Supported browsers
  - [x] Google Chrome
  - [x] Microsoft Edge
  - [x] Mozilla Firefox
  - [x] Apple Safari


## Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/AY2425S1-CS3103-group-19/miniProject.git
    cd miniProject
    ```
2. Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```

## Server 
### Features
- **WebSocket Server**: Handles WebSocket connections from clients.
- **Real-time Audio Playback**: Plays audio received from clients in real-time using PyAudio.
- **Client Management**: Manages connected clients, including handling client requests to speak and releasing the speaker.
- **Audio Saving**: Optionally saves received audio to WAV files, organized by student ID and timestamp.

### Usage
``` bash
python ./server/websocket_server.py
```

#### Command line flags
- `-h`, `--help`: Show help message and exit.
- `-ip`, `--ip-address`: IPv4 address to bind the server (default: `0.0.0.0`).
- `-p`, `--port`: Port number to bind the server (default: `8765`).
- `-sa`, `--save-audio`: Enable saving the received audio to a file.

Example:
``` bash
python ./server/websocket_server.py -ip 127.0.0.1 --port 8765 -sa
```
---
## Client
### Features
- **WebSocket Client**: Connects to the WebSocket server to send and receive audio data.
- **Audio Capture**: Captures audio from the user's microphone.
- **Audio Playback**: Plays received audio in real-time.
- **Push-to-Talk Button**: Allows the user to press a button to start and stop sending audio.
- **AudioWorklet API**: Uses the AudioWorklet API for better performance and lower latency (optional).

### Usage
#### Client (**without** AudioWorklet API)
> [!WARNING]
> The function `createScriptProcessor` and `onaudioprocess` are deprecated. So this way might not always work.
Simply open the `JSWebsocketClient.html` file inside `client` in a browser.

#### Client (**with** AudioWorklet API)
1. Open terminal to start a HTTP server
    ```bash
    python -m http.server
    ```
2. Open the `html` file from `localhost`. E.g.
   ``` 
    http://127.0.0.1/[directory_path]/clientWithAudioProcessor/JSWebsocketClient.html
   ```

## Directory Structure
```
.
├── client
│   ├── JSWebsocketClient.html
│   └── ...
│
├── clientWithAudioProcessor
│   ├── JSWebsocketClient.html
│   └── ...
│
├── saved_audio
│   ├── A0123456X
│   │      ├── 13h_21m_10s_1_11_2024.wav
│   │      └── ...
│   └── Unknown
│          ├── 13h_21m_10s_1_11_2024.wav
│          └── ...
│   
├── server
│   └── websocket_server.py
│
├── requirements.txt
└── README.md
```

## Troubleshooting
- **Issue**: Cannot connect to the server.
  - **Solution**: Ensure that the server is running and that the client is able to reach the server. Try to `ping` the server to check the connection.

- **Issue**: Cannot hear audio from the server.
  - **Solution**: Ensure that the client's microphone is working correctly and that the browser has permission to access the microphone. Check the browser's console for any errors.


## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request
