const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request');
const zlib = require('zlib');
const { Client } = require('pg');

const input = {
  screepsShard: core.getInput('screeps-shard') || process.env.SCREEPS_SHARD,
  screepsToken: core.getInput('screeps-token') || process.env.SCREEPS_TOKEN,
  pgConnectionString: core.getInput('pg-connection-string') || process.env.PG_CONNECTION_STRING,
  pgDatabase: core.getInput('pg-database') || process.env.PG_DATABASE
};

run().catch(err => core.setFailed(err));

async function run() {
  let statsData = await getData();
  console.log("statsData", statsData);
  let data = mapToInsertData(statsData);
  for (var i = 0; i < data.length; i++) {
    await insertTableData(data[i]);
  }
}

function mapToInsertData(statsData) {
  let insertData = [];

  for (let tableName in statsData.table) {
    var tableMapping = statsData.table[tableName];
    var columnNames = Object.keys(tableMapping);
    var values = columnNames.map(key => tableMapping[key].split('.').reduce((obj, value) => obj[value], statsData));
    insertData.push({
      tableName: tableName,
      columnNames: columnNames,
      values: [values]
    });
  }

  return insertData;
}

async function insertTableData(data) {
  var rows = data.values.length;
  if (rows === 0) {
    console.log("No data to insert. Skipping connecting to database");
    return;
  }

  var valueLength = data.values[0].length;
  var valuesQuery = [];
  var currentValueIndex = 1;
  for (var i = 0; i < rows; i++) {
    var valueIndexes =[];
    for (var j = 0; j < valueLength; j++) {
      valueIndexes.push(`$${currentValueIndex++}`);
    }
    console.log(valueIndexes);
    valuesQuery.push(`(${valueIndexes.join(',')})`);
  }

  const text = `INSERT INTO "${input.pgDatabase}"."${data.tableName}"(${data.columnNames.join(',')}) VALUES${valuesQuery.join(',')} RETURNING *`;
  const values = data.values.reduce((result, value) => result.concat(value), []);

  const client = new Client({
    connectionString: input.pgConnectionString,
  });

  client.connect();

  return new Promise((resolve, reject) => {
    client.query(text, values, (err, res) => {
      if (err) {
        reject(err.stack);
      } else {
        console.log(res.rows.length, "rows inserted");
        resolve();
      }
    });
  }).finally(() => client.end());
}

async function getData() {
  return new Promise((resolve, reject) => {
    request({
      url:"https://screeps.com/api/user/memory",
      method: "GET",
      json: true,
      qs: {
          path: "stats",
          shard: input.screepsShard,
          _token: input.screepsToken
      },
    }, function(err, response, body) {
        if(err) { reject(err); }
        try {
            var data = body.data.split('gz:')[1];
            var buffer = Buffer.from(data, 'base64');
            var statsData = JSON.parse(zlib.gunzipSync(buffer));
            resolve(statsData);
        }
        catch (err) {
            reject(err);
        }
      }
    );
  });
}