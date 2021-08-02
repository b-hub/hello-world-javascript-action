const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request');
const zlib = require('zlib');
const { Pool, Client } = require('pg');
const { getHeapCodeStatistics } = require('v8');

try {
  // `who-to-greet` input defined in action metadata file
  const screepsShard = "shard0";//core.getInput('screeps-shard');
  const screepsToken = "xxx";//core.getInput('screeps-token');
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);

  console.log("--- making custom request");
  //getData();
  postData();

} catch (error) {
  core.setFailed(error.message);
}

function postData() {
    
const text = 'INSERT INTO "b-hub/screeps"."test"("energyHarvested", "energyControl", "requestDate") VALUES($1, $2, $3) RETURNING *';
const values = [5, 99, "2021-06-01T20:19:00"];

const client = new Client({
    user: 'b-hub_demo_db_connection',
    host: 'db.bit.io',
    database: 'bitdotio',
    password: 'xxx',
    port: 5432
  });

  client.connect();
  client.query(text, values, (err, res) => {
    if (err) {
      console.log(err.stack)
    } else {
      console.log(res.rows[0])
      // { name: 'brianc', email: 'brian.m.carlson@gmail.com' }
    }

    client.end();
  });
}

// function postData(data) {
//     request({
//         url: "",
//         method: "POST",
//         headers: {
//             'Authorization': 'Bearer' + token,
//             'Content-Disposition': "attachment;filename='name'"
//         },
//         data
//     });
// }

function getData() {
    request({
        url:"https://screeps.com/api/user/memory",
        method: "GET",
        json: true,
        qs: {
            path: "stats",
            shard: screepsShard,
            _token: screepsToken
        },
      }
      ,
        function(err, response, body) {
          if(err) { console.log(err); return; }
          try {
              var data = body.data.split('gz:')[1];
              var buffer = Buffer.from(data, 'base64');
              var finalData = JSON.parse(zlib.gunzipSync(buffer));
              console.log("Get response", finalData);
          }
          catch (err) {
              console.error(err);
          }
        }
      );
}