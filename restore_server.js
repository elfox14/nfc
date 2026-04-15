const fs = require('fs');

async function fixServer() {
    console.log('Fetching the last clean version of server.js from GitHub...');

    const res = await fetch('https://raw.githubusercontent.com/elfox14/nfc/4028f3eec16e926213b14ff5d7df8b1af51433c2/server.js');
    let code = await res.text();

    if (!code.includes('express')) {
        console.error('Failed to download source code properly.');
        return;
    }

    console.log('Injecting your WebSocket code...');

    const importsToInject =
        `const http = require('http'); // **جديد: استيراد http**
const { WebSocketServer } = require('ws'); // **جديد: استيراد WebSocketServer**
const url = require('url'); // **جديد: استيراد url**
`;

    code = code.replace(
        "const useragent = require('express-useragent');",
        "const useragent = require('express-useragent');\n" + importsToInject
    );

    code = code.replace(
        /connectSrc: \[.*?\],/,
        `connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com", "ws:", "wss:"], // **جديد: السماح باتصالات WebSocket**`
    );

    const wsCode =
        `// =================================================================
// === START: WEBSOCKET SERVER FOR REAL-TIME COLLABORATION       ===
// =================================================================

// 1. إنشاء خادم HTTP من تطبيق Express
const server = http.createServer(app);

// 2. إنشاء خادم WebSocket وربطه بخادم HTTP
const wss = new WebSocketServer({ server });

// 3. هيكل بيانات لتخزين الغرف والعملاء المتصلين
// Map<collabId, Set<WebSocket>>
const rooms = new Map();

wss.on('connection', (ws, req) => {
  // 4. استخراج \`collabId\` من رابط الاتصال
  const parameters = new url.URL(req.url, \`ws://\${req.headers.host}\`).searchParams;
  const collabId = parameters.get('collabId');

  if (!collabId) {
    console.log('Connection rejected: No collabId provided.');
    ws.close(1008, 'collabId is required');
    return;
  }

  // 5. الانضمام إلى الغرفة
  if (!rooms.has(collabId)) {
    rooms.set(collabId, new Set());
  }
  const room = rooms.get(collabId);
  room.add(ws);

  console.log(\`Client connected to room: \${collabId}. Room size: \${room.size}\`);

  // 6. التعامل مع الرسائل الواردة من العميل
  ws.on('message', (message) => {
    try {
      // بث الرسالة (حالة التصميم الجديدة) إلى جميع العملاء الآخرين في نفس الغرفة
      room.forEach(client => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(message.toString());
        }
      });
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  });

  // 7. التعامل مع انقطاع الاتصال (تنظيف)
  ws.on('close', () => {
    if (room) {
      room.delete(ws);
      console.log(\`Client disconnected from room: \${collabId}. Room size: \${room.size}\`);
      // إذا كانت الغرفة فارغة، قم بإزالتها لتوفير الذاكرة
      if (room.size === 0) {
        rooms.delete(collabId);
        console.log(\`Room \${collabId} is now empty and has been closed.\`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// =================================================================
// === END: WEBSOCKET SERVER                                     ===
// =================================================================

// --- START SERVER (تغيير app.listen إلى server.listen) ---
server.listen(port, () => {
  console.log(\`Server running on port: \${port}\`);
  console.log('WebSocket server is also running.');
});
`;

    code = code.replace(/app\.listen\(port, \(\) => \{[\s\S]*?\}\);/, wsCode);

    fs.writeFileSync('server.js', code, 'utf-8');
    console.log('=============================================');
    console.log('✅ server.js fully restored with WebSockets! ');
    console.log('=============================================');
}

fixServer();
