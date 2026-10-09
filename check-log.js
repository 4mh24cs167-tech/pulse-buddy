const https = require('https');
https.get({
  hostname: 'api.github.com',
  path: `/repos/4mh24cs167-tech/pulse-buddy/actions/runs/37758247772/jobs`,
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = ''; res.on('data', c => data += c);
  res.on('end', () => {
    const jobs = JSON.parse(data).jobs;
    const failedJob = jobs.find(j => j.conclusion === 'failure');
    if(failedJob) {
       console.log('Log URL:', failedJob.html_url);
    }
  });
});
