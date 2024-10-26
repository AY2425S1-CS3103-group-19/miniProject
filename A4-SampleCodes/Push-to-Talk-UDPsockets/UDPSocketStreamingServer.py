#Push to talk Server with UDP Socket [python + FFmpeg]
#Perhaps UDP will be more efficient than TCP for this usecase
#Author: Bhojan Anand

import socket
import subprocess

# UDP server setup
server_ip = '0.0.0.0'
server_port = 12345
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((server_ip, server_port))

# Start FFmpeg process to play the audio
process = subprocess.Popen(
    ['ffmpeg', '-f', 'ogg', '-i', '-', '-f', 'pulse', 'default'],
    stdin=subprocess.PIPE
)

while True:
    data, addr = sock.recvfrom(1024)  # Receive audio data via UDP
    process.stdin.write(data)  # Play the audio using FFmpeg

#You can still implement a First-Come-First-Served mechanism by 
# maintaining a simple flag or queue on the server, 
# ensuring only one client is allowed to stream at a time.