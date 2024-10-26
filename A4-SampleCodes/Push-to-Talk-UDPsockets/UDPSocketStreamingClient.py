#Push to talk Client with UDP Socket [python + FFmpeg]
#Perhaps UDP will be more efficient than TCP for this usecase
#Author: Bhojan Anand

import socket
import subprocess

# UDP server information
server_ip = 'SERVER_IP'
server_port = 12345

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Start capturing audio using FFmpeg
process = subprocess.Popen(
    ['ffmpeg', '-f', 'pulse', '-i', 'default', '-acodec', 'libopus', '-f', 'ogg', '-'],
    stdout=subprocess.PIPE
)

while True:
    data = process.stdout.read(1024)  # Capture audio data
    if not data:
        break
    sock.sendto(data, (server_ip, server_port))  # Send audio data over UDP