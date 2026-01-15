
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

// Config
const WS_URL = 'ws://localhost:3001/ws?token=demo-token';
const OUTPUT_FILE = path.join(process.cwd(), 'received_audio.pcm');

console.log('Connecting to', WS_URL);
const ws = new WebSocket(WS_URL);

const audioPath = OUTPUT_FILE;
if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
}

ws.on('open', () => {
    console.log('Connected!');

    // Start session
    ws.send(JSON.stringify({
        type: 'voice.live.start',
        payload: {
            context: 'dashboard'
        }
    }));

    // Send a prompt to trigger audio
    setTimeout(() => {
        console.log('Sending prompt...');
        ws.send(JSON.stringify({
            type: 'voice.live.prompt',
            payload: {
                text: 'Say hello world and count to 5.'
            }
        }));
    }, 2000);
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'voice.live.audio') {
            const buffer = Buffer.from(msg.payload.data, 'base64');
            fs.appendFileSync(audioPath, buffer);
            console.log(`Received audio chunk: ${buffer.length} bytes`);
        } else if (msg.type === 'voice.live.transcript') {
            console.log('Transcript:', msg.payload.text);
        } else {
            console.log('Msg:', msg.type);
        }
    } catch (e) {
        console.error('Error parsing message', e);
    }
});

ws.on('error', (e) => {
    console.error('WebSocket error:', e);
});

ws.on('close', () => {
    console.log('Disconnected');
});

// Run for 15 seconds then exit
setTimeout(() => {
    console.log('Test finished. Audio saved to', audioPath);
    console.log('To play (assuming 24k mono PCM): ffplay -f s16le -ar 24000 -ac 1 received_audio.pcm');
    ws.close();
    process.exit(0);
}, 15000);
