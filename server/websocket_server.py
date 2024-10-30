# Python Websocket Server

import asyncio
import websockets
import pyaudio
import json

# Setup PyAudio for real-time audio playback
auido = pyaudio.PyAudio()

# Use paInt16 here as it is suitable for most hardwares and has less space requirement compared to paFloat32
stream = auido.open(format=pyaudio.paInt16, channels=1, rate=44100, output=True)

# Track the current active speaker
active_speaker = None 

# Store connected clients and their WebSocket objects.
# Format: {client_id : websocket_object}
clients = {} 

# Mutex to manage access to active_speaker
lock = asyncio.Lock()


"""
Handle each of the WebSocket connections
"""
async def handle_client(websocket, path):
    client_id = id(websocket)
    clients[client_id] = websocket
    print(f"Client {client_id} connected.")
    
    try:
        await process_client_messages(websocket, client_id)
    except Exception as e:
        print(f"Error managing client {client_id}: {e}")


"""
Process all incoming messages from a client
"""
async def process_client_messages(websocket, client_id):
    global active_speaker

    try:
        async for message in websocket:
            #print(f"Received message: {message}\n")

            # Check if the message is audio (bytes) or JSON control message
            if isinstance(message, bytes):
                if active_speaker == client_id:
                    #print("Play audio\n")
                    stream.write(message) # Play the audio
            else:
                try:
                    # Parse JSON control messages
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


"""
Handle a client's request to speak.
"""
async def handle_request_to_speaker(websocket, client_id):
    global active_speaker

    async with lock:
        # Speaker is only granted if active speaker is un-assigned or is the current client
        if active_speaker is None or active_speaker == client_id:
            active_speaker = client_id
            await websocket.send("speak_granted")
            print(f"Client {client_id} granted permission to speak.")
        else:
            await websocket.send("speak_denied")
            print(f"Client {client_id} denied from speaking.")


"""
Handle the release of the speaker from the client
"""
async def handle_release_speaker(client_id):
    global active_speaker

    async with lock:
        if active_speaker == client_id:
            active_speaker = None
            print(f"Client {client_id} released the speaker.")
            await notify_all_clients()


"""
Remove a client from the conneced clients list
"""
async def remove_client(client_id):
    global active_speaker
    
    if client_id in clients:
        del clients[client_id]
    
    print(f"Client {client_id} removed.")

    if active_speaker == client_id:
        await handle_release_speaker(client_id)
    

"""
Send a message to all connected clients to tell them the speaker is available
"""
async def notify_all_clients():
    clients_copy = clients.copy()
    for (client_id, websocket) in clients_copy.items():
        try:
            await websocket.send("speak_released")
        except websockets.exceptions.ConnectionClosed:
            # The client has closed the connection so can remove it
            await remove_client(client_id)
    
    print(f"Notified all clients that speaker is available")



# Start WebSocket server
start_server = websockets.serve(handle_client, "127.0.0.1", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
