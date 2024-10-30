# Python Websocket Server Sample
# Author: Bhojan Anand, NUS SoC
 
import asyncio
import websockets
import pyaudio

# Setup PyAudio for real-time audio playback
p = pyaudio.PyAudio()
stream = p.open(format=pyaudio.paInt16, channels=1, rate=16000, output=True)

# Initialize a lock to control audio transmission
transmitting_client = None  # Track the client allowed to send audio

# Handle the WebSocket connection
async def handle_client(websocket, path):
    global transmitting_client
    try:
        # Check if another client is already transmitting
        if transmitting_client is None:
            transmitting_client = websocket
            print("Client connected and allowed to transmit audio")
            
            async for audio_data in websocket:
                # Only allow the designated client to send audio
                if websocket == transmitting_client:
                    stream.write(audio_data)  # Play the audio in real-time
                else:
                    break
        else:
            # Deny transmission if another client is already transmitting
            await websocket.send("Another client is transmitting audio. Please try again later.")
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        # Reset transmitting client when disconnected
        if websocket == transmitting_client:
            transmitting_client = None
            print("Transmission available for other clients")

# Start WebSocket server
start_server = websockets.serve(handle_client, "127.0.0.1", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

