#Push to talk Server with TCP Socket [python + FFmpeg]
#Author: Bhojan Anand
import socket
import subprocess

# Setup TCP server
server_ip = '0.0.0.0'
server_port = 8000
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.bind((server_ip, server_port))
sock.listen(5)

# Accept client connection
conn, addr = sock.accept()

# Pipe the received data to FFmpeg for playback
process = subprocess.Popen(
    ['ffmpeg', '-f', 'ogg', '-i', '-', '-f', 'pulse', 'default'],
    stdin=subprocess.PIPE
)

while True:
    data = conn.recv(1024)
    if not data:
        break
    process.stdin.write(data)

process.stdin.close()
conn.close()
sock.close()

