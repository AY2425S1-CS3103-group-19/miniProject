# CS3103 Mini Project - PTT Button

### Install requirements using
``` bash
pip install -r requirements.txt
```
---

### To run the server
``` bash
python ./server/websocket_server.py
```
---
### To run the client
Supported browser:
  - [x] Google Chrome
  - [x] Microsoft Edge
  - [x] Mozilla Firefox
  - [x] Apple Safari

<br>

#### Client (**without** AudioWorklet API)
> [!WARNING]
> The function `createScriptProcessor` and `onaudioprocess` are deprecated. So this way might not always work.
Simply Open the `html` file in a browser.

<br>

#### Client (**with** AudioWorklet API)
1. Open terminal to start a HTTP server
    ```bash
    python -m http.server
    ```
    <br>

2. Open the `html` file from `localhost`. E.g.
   ``` 
    http://127.0.0.1/[directory_path]/clientWithAudioProcessor/JSWebsocketClient.html
   ```


