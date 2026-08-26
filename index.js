const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.room = 'VC';
    
    ws.on('message', async (data) => {
        const msgStr = data.toString();
            
        try {
            const packet = JSON.parse(msgStr);

            if (packet.Type === "VoiceChatHandShake") {
                if (packet.PlayerName) ws.playerName = packet.PlayerName;
                if (packet.UserId) ws.userId = Number(packet.UserId);

                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.room === ws.room) {
                        client.send(JSON.stringify({
                            Type: "VoiceChatHandShake",
                            UserId: packet.UserId,
                            PlayerName: ws.playerName,
                        }));
                    }
                });
                return;
            }

            if (packet.Type === "AudioStateUpdate" || packet.Type === "AudioEmitterSync") {
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.room === ws.room) {
                        client.send(msgStr);
                    }
                });
                return;
            }
        } catch (e) {
            console.error("Failed to parse incoming packet:", e);
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server VOICE CHAT (Primary) running on port ${PORT}`);
});
