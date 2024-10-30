# Python Websocket Server

import asyncio
import websockets
import pyaudio
from collections import deque

# Setup PyAudio for real-time audio playback
auido = pyaudio.PyAudio()
stream = auido.open(format=pyaudio.paInt16, channels=1, rate=16000, output=True)

active_speaker = None
clients = set()
waiting_queue = deque()

# Handle the WebSocket connection
async def handle_client(websocket, path):
    global active_speaker

    clients.add(websocket)
    print(f"New client connected: {len(clients)} clients connected.")

    try:
        if active_speaker is None:
            active_speaker = websocket
            await websocket.send("allow_speak")
            print("A client is now speaking.")

            async for audio_data in websocket:
                stream.write(audio_data)  # Play the audio in real-time
    
        else:
            await websocket.send("deny_speak")
            waiting_queue.append(websocket)
            print("Append queue")

    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        if websocket == active_speaker:
            active_speaker = None
            next_client = waiting_queue.popleft()
            active_speaker = next_client
            await next_client.send("allow_speak")
            print("Next client notified to speak.")
           

# Start WebSocket server
start_server = websockets.serve(handle_client, "127.0.0.1", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()