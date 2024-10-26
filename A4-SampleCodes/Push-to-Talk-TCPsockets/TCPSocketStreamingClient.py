#Push to talk Server with TCP Socket [python + FFmpeg]
#Author: Bhojan Anand

import socket
import subprocess

# Open a TCP socket
server_ip = 'SERVER_IP'
server_port = 8000
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect((server_ip, server_port))

# Capture audio and send it via FFmpeg
process = subprocess.Popen(
    ['ffmpeg', '-f', 'pulse', '-i', 'default', '-acodec', 'libopus', '-f', 'ogg', '-'],
    stdout=subprocess.PIPE
)

while True:
    data = process.stdout.read(1024)
    if not data:
        break
    sock.sendall(data)

sock.close()
