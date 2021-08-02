const core = require('@actions/core');
const github = require('@actions/github');
const https = require('https');
const request = require('request');

try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);

  console.log("--- making custom request");
  request({url:"https://b-hub.github.io/"}, function(err, response, body) {
    if(err) { console.log(err); return; }
    console.log("Get response", body);
  });
//   httpGetAsync("b-hub.github.io", response => {
//     console.log("response", response);
//   });

} catch (error) {
  core.setFailed(error.message);
}

function httpGetAsync(theUrl, callback)
{
    const options = {
        hostname: theUrl,
        port: 443,
        path: '/',
        method: 'GET'
      };
      
      const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);
      
        res.on('data', d => {
            callback(d);
        });
      });
      
      req.on('error', error => {
        console.error(error);
      });
      
      req.end();
}