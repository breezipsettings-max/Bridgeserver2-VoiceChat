// Express and WebSocket server setup with advanced binary audio framing, room echo, and userId tagging!
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('Voice Chat Bridge Server is online, glowing, and streaming audio with binary framing! ✨');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const activeRooms = new Map();

wss.on('connection', (ws, req) => {
    ws.room = 'VC';
    ws.isAlive = true;
    ws.userId = 0; // Default until handshake registration
    ws.playerName = 'Unknown';
    
    if (!activeRooms.has(ws.room)) {
        activeRooms.set(ws.room, new Set());
    }
    activeRooms.get(ws.room).add(ws);

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', async (data, isBinary) => {
        // Advanced Binary Audio Stream Handler with Server-Side Header Tagging!
        if (isBinary || Buffer.isBuffer(data)) {
            const roomClients = activeRooms.get(ws.room);
            if (roomClients && ws.userId) {
                // Create a 4-byte buffer for the sender's UserId so receivers know who is talking
                const headerBuf = Buffer.alloc(4);
                headerBuf.writeUInt32BE(ws.userId, 0);
                
                // Combine header + raw audio chunk into a single binary packet
                const framedPacket = Buffer.concat([headerBuf, data]);

                roomClients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(framedPacket, { binary: true });
                    }
                });
            }
            return;
        }

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
                                UserId: ws.userId,
                                PlayerName: ws.playerName,
                                Room: ws.room
                            }));
                        }
                    });
                }
                return;
            }

            if (packet.Type === "AudioStateUpdate" || packet.Type === "AudioEmitterSync" || packet.Type === "UIStateUpdate" || packet.Type === "AudioSynced" || packet.Type === "AudioDeviceInputSynced") {
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
        ws.isAlive === false ? ws.terminate() : (ws.isAlive = false, ws.ping());
    });
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server VOICE CHAT (Primary) running on port ${PORT} with Advanced Binary Audio Framing! ✨`);
});
