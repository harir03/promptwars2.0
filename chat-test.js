const http = require('http');

const data = JSON.stringify({
  message: 'What is the voter registration deadline in Texas?',
  history: []
});

const req = http.request(
  { hostname: 'localhost', port: 8080, path: '/api/chat', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } },
  (res) => {
    let body = '';
    res.on('data', (c) => body += c);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('BODY:', body);
    });
  }
);
req.on('error', (e) => console.error('Request error:', e.message));
req.write(data);
req.end();
