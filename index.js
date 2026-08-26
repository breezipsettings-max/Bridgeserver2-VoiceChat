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
    
    if (!activeRooms.has(ws.room)) {
        activeRooms.set(ws.room, new Set());
    }
    activeRooms.get(ws.room).add(ws);

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', async (data) => {
        const msgStr = data.toString();
        
        try {
            const packet = JSON.parse(msgStr);

            if (packet.Room && packet.Room !== ws.room) {
                const oldRoom = ws.room;
                if (activeRooms.has(oldRoom)) {
                    activeRooms.get(oldRoom).delete(ws);
                    if (activeRooms.get(oldRoom).size === 0) {
                        activeRooms.delete(oldRoom);
                    }
                }
                
                ws.room = packet.Room;
                if (!activeRooms.has(ws.room)) {
                    activeRooms.set(ws.room, new Set());
                }
                activeRooms.get(ws.room).add(ws);
            }

            if (packet.Type === "VoiceChatHandShake") {
                if (packet.PlayerName) ws.playerName = packet.PlayerName;
                if (packet.UserId) ws.userId = Number(packet.UserId);

                const roomClients = activeRooms.get(ws.room);
                if (roomClients) {
                    roomClients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                Type: "VoiceChatHandShake",
                                UserId: packet.UserId,
                                PlayerName: ws.playerName,
                                Room: ws.room
                            }));
                        }
                    });
                }
                return;
            }

            if (packet.Type === "AudioStateUpdate") {
                const roomClients = activeRooms.get(ws.room);
                if (roomClients) {
                    roomClients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(msgStr);
                        }
                    });
                }
                return;
            }

            if (packet.Type === "AudioEmitterSync") {
                const roomClients = activeRooms.get(ws.room);
                if (roomClients) {
                    roomClients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(msgStr);
                        }
                    });
                }
                return;
            }

            if (packet.Type === "UIStateUpdate") {
                const roomClients = activeRooms.get(ws.room);
                if (roomClients) {
                    roomClients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(msgStr);
                        }
                    });
                }
                return;
            }
        } catch (e) {
            console.error("Failed to parse incoming packet data:", e);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${ws.playerName || 'Unknown User'}`);
        if (ws.room && activeRooms.has(ws.room)) {
            activeRooms.get(ws.room).delete(ws);
            if (activeRooms.get(ws.room).size === 0) {
                activeRooms.delete(ws.room);
            }
        }
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
