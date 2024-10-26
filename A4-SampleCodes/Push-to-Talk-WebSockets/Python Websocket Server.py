# Python Websocket Server Sample
# Author: Bhojan Anand, NUS SoC
 
import asyncio
import websockets
import pyaudio

# Setup PyAudio for real-time audio playback
p = pyaudio.PyAudio()
stream = p.open(format=pyaudio.paInt16, channels=1, rate=16000, output=True)

# Handle the WebSocket connection
async def handle_client(websocket, path):
    try:
        async for audio_data in websocket:
            stream.write(audio_data)  # Play the audio in real-time
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")

# Start WebSocket server
start_server = websockets.serve(handle_client, "0.0.0.0", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
