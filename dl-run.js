const https = require('https');
https.get({
  hostname: 'api.github.com',
  path: `/repos/4mh24cs167-tech/pulse-buddy/actions/runs/37758247772`,
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = ''; res.on('data', c => data += c);
  res.on('end', () => {
    console.log("Run info:", JSON.parse(data).head_commit.message);
  });
});
