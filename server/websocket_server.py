# Python Websocket Server

import asyncio
import websockets
import pyaudio
import json

# Setup PyAudio for real-time audio playback
auido = pyaudio.PyAudio()
stream = auido.open(format=pyaudio.paInt16, channels=1, rate=16000, output=True)

active_speaker = None
clients = {}
lock = asyncio.Lock()

# Handle the WebSocket connection
async def handle_client(websocket, path):
    client_id = id(websocket)
    clients[client_id] = websocket
    print(f"Client {client_id} connected.")

    try:
        await process_client_messages(websocket, client_id)
    except Exception as e:
        print(f"Error managing client {client_id}: {e}")


async def process_client_messages(websocket, client_id):
    global active_speaker

    try:
        async for message in websocket:
            print(f"Received message: {message}\n")
            if isinstance(message, bytes):
                if active_speaker == client_id:
                    print("Play audio\n")
                    stream.write(message)
            else:
                try:
                    control_message = json.loads(message)

                    if control_message["type"] == "request_speaker":
                        await handle_request_to_speaker(websocket, client_id)
                        
                    elif control_message["type"] == "release_speaker" and active_speaker == client_id:
                        await handle_release_speaker(client_id)
                except ValueError: 
                    print(f"Received Invalid message: {message}\n")

    except websockets.exceptions.ConnectionClosed:
        print(f"Client {client_id} disconnected")
        await remove_client(client_id)


async def handle_request_to_speaker(websocket, client_id):
    global active_speaker

    async with lock:
        if active_speaker is None:
            active_speaker = client_id
            await websocket.send("speak_granted")
            print(f"Client {client_id} granted permission to speak.")
        else:
            await websocket.send("speak_denied")
            print(f"Client {client_id} denied from speaking.")

async def handle_release_speaker(client_id):
    global active_speaker

    async with lock:
        if active_speaker == client_id:
            active_speaker = None
            await notify_all_client()
            print(f"Client {client_id} released the speaker.")

async def remove_client(client_id):
    if client_id in clients:
        del clients[client_id]
    
    if active_speaker == client_id:
        await handle_release_speaker(client_id)

async def notify_all_client():
    for websocket in clients.values():
        await websocket.send("speak_released")


# Start WebSocket server
start_server = websockets.serve(handle_client, "127.0.0.1", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()