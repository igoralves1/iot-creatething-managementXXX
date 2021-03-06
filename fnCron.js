'use strict'
const mysql = require('mysql2/promise')
const AWS = require('aws-sdk')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

// https://www.serverless.com/framework/docs/providers/aws/events/schedule/
// https://www.serverless.com/blog/cron-jobs-on-aws/
// https://github.com/chief-wizard/serverless-cron-job-example
// https://stackoverflow.com/questions/57624100/how-to-run-cron-in-serverless-for-every-minute
// https://www.serverless.com/framework/docs/providers/aws/events/schedule/
// https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
// cron(0/1 * * * ? *) Each 1 min


async function missingCycles (array) {
  try {
      //Write your logic
      return ""
  } catch (error) {
      return error
  }
}

module.exports.fnCron = async event => {
  try {
    /*
      This lambda will run every day at 00:00:00.

      Logic:
      1 - Get a list of all serial numbers in the Db
      2 - Pass through every one and retrieve all cycle number.
      3 - Identify all missing cycle number.
      4 - Publish the topic to request the missing cycle number

      Note: if we have the issue with RDS and MQTT broker, lets use HTTP endpoint in order to publish what we need in the broker.
    */
    // const pool = mysql.createPool({
    //     host     : process.env.rdsMySqlHost,
    //     user     : process.env.rdsMySqlUsername,
    //     password : process.env.rdsMySqlPassword,
    //     database : process.env.rdsMySqlDb
    // })

    // const sql = `SELECT xxx FROM xxx WHERE xxx='${xxx}' AND xxx='${xxx}' AND is_active=1`
    // const sqlResult = await pool.query(sql)
    
    // let serialNumberArr = sqlResult

    // array.forEach(serialNumberArr => {
      //For each serialNumber
      //serialNumber = i ....

      //If you need 1 cicle, Cycle summary #1
      let response = {
        "path":`upload_cycles/1234`,
        "data":{
          "start": "1"
        }
      }

      //If you need more than 1 cicle, Cycle summary #1,#2,#3
      // let response = {
      //   "path":`CLOUD/CMD/upload_cycles`,
      //   "data":{
      //     "start": "1", 
      //     "count": "2"
      //   }
      // }
      
      let params = {
          topic: `${MQTT_TOPIC_ENV}/SCICANSYS/upload_cycles/1234`,
          payload: JSON.stringify(response),
          qos: '0'
      };
      await publishMqtt(params)
    // });
    

    } catch (error) {
        return {
            success: false,
            message: "SELECT from Mysql Failure",
            error: error
        }
    }
}
