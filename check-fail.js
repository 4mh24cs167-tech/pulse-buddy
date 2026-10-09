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
    const failedRun = runs.find(r => r.name === 'Android Release Build' && r.conclusion === 'failure');
    if (failedRun) {
      console.log('Failed run URL:', failedRun.html_url);
      https.get({
        hostname: 'api.github.com',
        path: `/repos/4mh24cs167-tech/pulse-buddy/actions/runs/${failedRun.id}/jobs`,
        headers: { 'User-Agent': 'Node.js' }
      }, (res2) => {
        let d2 = ''; res2.on('data', c => d2 += c);
        res2.on('end', () => {
           console.log(JSON.parse(d2).jobs.map(j => `${j.name} - ${j.status} - ${j.conclusion}`).join('\n'));
        });
      });
    }
  });
});
