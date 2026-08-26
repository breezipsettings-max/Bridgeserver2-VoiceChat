const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const activeRooms = new Map();

wss.on('connection', (ws, req) => {
    ws.room = 'VC';
    ws.isAlive = true;
    
    ws.on('pong', () => {
        ws.isAlive = true;
    });

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
            console.error("Failed to parse incoming packet data:", e);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${ws.playerName || 'Unknown User'}`);
    });
});

const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server VOICE CHAT (Primary) running on port ${PORT}`);
});
