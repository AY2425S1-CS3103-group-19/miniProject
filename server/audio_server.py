# Python WebSocket Server

import argparse
import re
import asyncio
import websockets
import pyaudio
import json
import numpy as np
from scipy.signal import resample

# Additional imports for file handling and timestamps
import sys
import os
from datetime import datetime
import wave


"""
Handle each of the WebSocket connections
"""
async def handle_client(websocket, path):
    global stream

    client_id = id(websocket)
    clients[client_id] = {
        'websocket': websocket,
        'student_id': 'Unknown',
        'wav_file': None,
        'client_sample_rate': default_sample_rate
    }
    print(f"Client {client_id} connected")

    try:
        await process_client_messages(websocket, client_id)

    except Exception as e:
        print(f"Error managing client {client_id}: {e}")
        await remove_client(client_id)

        if (stream.is_stopped):
            stream = audio.open(format=pyaudio.paInt16,
                                channels=1,
                                rate=default_sample_rate,
                                output=True)
            print("Reset Stream")


"""
Process all incoming messages from a client
"""
async def process_client_messages(websocket, client_id):
    global active_speaker

    try:
        async for message in websocket:
            # Check if the message is audio (bytes) or JSON control message
            if isinstance(message, bytes):
                if active_speaker == client_id:
                    # Write audio data to WAV file
                    wav_file = clients[client_id]['wav_file']
                    if wav_file:
                        wav_file.writeframes(message)
                    await play_audio(message, clients[client_id]['client_sample_rate'])
            else:
                try:
                    # Parse JSON control messages
                    control_message = json.loads(message)

                    if control_message["type"] == "request_speaker":
                        await handle_request_to_speaker(websocket, client_id)

                    elif control_message["type"] == "release_speaker" and active_speaker == client_id:
                        await handle_release_speaker(client_id)

                    elif control_message["type"] == "send_student_id":
                        temp_id = control_message["student_id"]
                        if not temp_id:
                            temp_id = "Unknown"
                        clients[client_id]['student_id'] = temp_id
                        print(f"Client {client_id}'s student id: {temp_id}")

                    elif control_message["type"] == "send_sample_rate":
                        client_sample_rate = control_message["sample_rate"]
                        clients[client_id]['client_sample_rate'] = client_sample_rate
                        print(f"Client {client_id} sample rate is {client_sample_rate}")

                    elif control_message["type"] == "close_connection":
                        await remove_client(client_id)
                        return

                except ValueError:
                    print(f"Received Invalid message: {message}\n")

    except websockets.exceptions.ConnectionClosed:
        print(f"Client {client_id} disconnected")
        await remove_client(client_id)


"""
Play the received audio and perform necessary resampling 
to match the default_sample_rate
"""
async def play_audio(message, client_sample_rate):
    global default_sample_rate

    if client_sample_rate != default_sample_rate:
        audio_data = np.frombuffer(message, dtype=np.int16)

        num_samples = int(len(audio_data) * default_sample_rate / client_sample_rate)
        audio_data = resample(audio_data, num_samples).astype(np.int16)

        stream.write(audio_data.tobytes())
    else:
        stream.write(message)


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
            print(f"Client {client_id} granted permission to speak")

            if save_audio:
                await open_wav_file(client_id)
        else:
            await websocket.send("speak_denied")
            print(f"Client {client_id} denied from speaking")


"""
Open a new WAV file for recording. 
"""
async def open_wav_file(client_id):
    if client_id not in clients: 
        return

    student_id = clients[client_id]['student_id']
    if not student_id:
        student_id = 'Unknown'

    # Home direct of the project
    server_path = os.path.dirname(sys.argv[0])
    home_dir = os.path.abspath(os.path.join(server_path, os.pardir))

    # Create directory if it doesn't exist
    local_path = "saved_audio/" + student_id
    directory = home_dir + "/" + local_path
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    # Create filename with current time
    now = datetime.now()
    filename = now.strftime("%Hh_%Mm_%Ss_%d_%m_%Y.wav")
    filepath = os.path.join(directory, filename)

    # Open wave file for writing
    wav_file = wave.open(filepath, 'wb')
    wav_file.setnchannels(1)
    wav_file.setsampwidth(audio.get_sample_size(pyaudio.paInt16))
    wav_file.setframerate(clients[client_id]['client_sample_rate'])

    clients[client_id]['wav_file'] = wav_file
    print(f"Recording audio to {local_path + '/' + filename}")


"""
Close WAV file
"""
async def close_wav_file(client_id):
    if client_id not in clients: 
        return

    wav_file = clients[client_id].get('wav_file')
    if wav_file:
        wav_file.close()
        clients[client_id]['wav_file'] = None
        print(f"Closed WAV file for client {client_id}")


"""
Handle the release of the speaker from the client
"""
async def handle_release_speaker(client_id):
    global active_speaker

    async with lock:
        if active_speaker == client_id:
            active_speaker = None
            print(f"Client {client_id} released the speaker")

            await close_wav_file(client_id)
            await notify_all_clients()


"""
Remove a client from the connected clients list
"""
async def remove_client(client_id):
    global active_speaker
    
    if client_id in clients:
        await close_wav_file(client_id)
        del clients[client_id]

    print(f"Client {client_id} removed")

    if active_speaker == client_id:
        await handle_release_speaker(client_id)


"""
Send a message to all connected clients to tell them the speaker is available
"""
async def notify_all_clients():
    clients_copy = clients.copy()
    for (client_id, client_info) in clients_copy.items():
        websocket = client_info['websocket']
        try:
            await websocket.send("speak_released")
        except websockets.exceptions.ConnectionClosed:
            # The client has closed the connection, so it can be removed
            await remove_client(client_id)

    print(f"Notified all clients that speaker is available")


"""
Validate IPv4 address
"""
def validate_ip(ip):
    # Allow 'localhost' as a valid IP equivalent
    if ip == "localhost":
        return "127.0.0.1"

    # Regex pattern for a valid IPv4 address
    pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
    if not re.match(pattern, ip):
        raise argparse.ArgumentTypeError(f"invalid IP address: '{ip}'")

    # Check each octet is between 0 and 255
    octets = ip.split(".")
    if any(int(octet) < 0 or int(octet) > 255 for octet in octets):
        raise argparse.ArgumentTypeError(f"invalid IP address: '{ip}'")

    return ip


"""
Validate port number
"""
def validate_port(port):
    port = int(port)
    if port < 1 or port > 65535:
        raise argparse.ArgumentTypeError(f"port number must be between 1 and 65535, got '{port}'")

    return port


"""
Parse for command line flags
"""
def parse_flags():
    parser = argparse.ArgumentParser()

    # Option for IP address, with default set to "0.0.0.0"
    parser.add_argument(
        "-ip", "--ip-address",
        help="IPv4 address to bind the server",
        default="0.0.0.0",
        type=validate_ip
    )

    # Option for port number, with default set to 8765
    parser.add_argument(
        "-p", "--port",
        help="Port number to bind the server",
        default=8765,
        type=validate_port
    )

    # Boolean flag to save audio, default is False, becomes True when provided
    parser.add_argument(
        "-sa", "--save-audio",
        help="Enable saving the received audio to a file",
        action="store_true"
    )

    return parser.parse_args()


# Main
try:
    # Parse for flags
    args = parse_flags()

    ip = args.ip_address
    port = args.port
    save_audio = args.save_audio

    print(
        f"Server started on:\n"
        f"  IP Address : {ip}\n"
        f"  Port       : {port}\n"
        f"Audio saving is {'enabled' if save_audio else 'disabled'}."
    )
    print("To terminate the program press: Ctrl+C\n")

    default_sample_rate = 48000

    # Setup PyAudio for real-time audio playback
    audio = pyaudio.PyAudio()

    # Use paInt16 here as it is suitable for most hardwares and has less space requirement compared to paFloat32
    stream = audio.open(format=pyaudio.paInt16,
                        channels=1,
                        rate=default_sample_rate,
                        output=True)

    # Track the current active speaker
    active_speaker = None

    # Store connected clients and their data.
    # Format: {client_id : {'websocket': websocket_object, 'student_id': student_id, ...}}
    clients = {}

    # Mutex to manage access to active_speaker
    lock = asyncio.Lock()

    # Start web server
    start_server = websockets.serve(handle_client, ip, port)

    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()
except KeyboardInterrupt:
    stream.close()
    print("Server program terminated")
