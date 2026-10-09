const https = require('https');
https.get({
  hostname: 'api.github.com',
  path: '/repos/4mh24cs167-tech/pulse-buddy/actions/runs',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const runs = JSON.parse(data).workflow_runs;
    if (runs) {
      console.log(runs.slice(0, 5).map(r => `${r.name} - ${r.status} - ${r.conclusion}`).join('\n'));
    } else { console.log(data); }
  });
});
