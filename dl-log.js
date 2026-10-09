const https = require('https');
https.get({
  hostname: 'api.github.com',
  path: '/repos/4mh24cs167-tech/pulse-buddy/actions/runs/37863086245/jobs',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = ''; res.on('data', c => data += c);
  res.on('end', () => {
    const jobs = JSON.parse(data).jobs;
    const failedJob = jobs.find(j => j.conclusion === 'failure');
    if(failedJob) {
       console.log('Downloading log for job', failedJob.id);
       https.get({
         hostname: 'api.github.com',
         path: `/repos/4mh24cs167-tech/pulse-buddy/actions/jobs/${failedJob.id}/logs`,
         headers: { 'User-Agent': 'Node.js' }
       }, (res2) => {
         if (res2.statusCode === 302) {
           https.get(res2.headers.location, (res3) => {
             let log = ''; res3.on('data', c => log += c);
             res3.on('end', () => console.log(log.split('\n').slice(-150).join('\n')));
           });
         }
       });
    }
  });
});
