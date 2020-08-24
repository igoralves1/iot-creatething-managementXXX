'use strict'
const AWS = require('aws-sdk')
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
const mysql = require('mysql2/promise')

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

  async function GetToken(serial_number, scuuid) {
    try {

    const pool = mysql.createPool({
        host     : process.env.rdsMySqlHost,
        user     : process.env.rdsMySqlUsername,
        password : process.env.rdsMySqlPassword,
        database : process.env.rdsMySqlDb
    })

    const sql = `SELECT token FROM online_access_tokens WHERE serial_number='${serial_number}' AND uuid='${scuuid}' AND is_active=1`
    const sqlResult = await pool.query(sql)
    return sqlResult

    } catch (error) {
        return {
            success: false,
            message: "SELECT from Mysql Failure",
            error: error
        }
    }
}


module.exports.fnVpcTest = async event => {


  const sqlResult = await GetToken('AJB00002', 'AJB00002-8dd56a3a8193e35ea73b8fc2f8c2e9ea1b7baed7a21fd05254f1b4edad61feed')
  const token = sqlResult[0]
  let onlineAccessCode = 'ZZZ-ZZZ';

  console.log('token',token)
  if (token.length > 0) {
      onlineAccessCode = token[0].token
  }

  let response = {
      "path":`SCICANSYS/fnVpcTest-RSP`,
      "data":{
        'token':`${onlineAccessCode}`
      }
  }

  let params = {
      topic: `${MQTT_TOPIC_ENV}/SCICANSYS/fnVpcTest-RSP`,
      payload: JSON.stringify(response),
      qos: '0'
  };

  await publishMqtt(params)
    
}