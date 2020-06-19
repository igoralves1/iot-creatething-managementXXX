'use strict';
const AWS = require('aws-sdk')
const mysql = require('mysql2/promise')
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

async function randStr(length){
    try {
        // const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("")
        let a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("")
        let b = [] 
        for (let i=0; i<length; i++) {
            let j = (Math.random() * (a.length-1)).toFixed(0)
            b[i] = a[j]
        }
        return b.join("")
    } catch (error) {
        return (error)
    }
}

async function tokenGen (length) {
    try {
        let token 
        let newToken = 1
        while (newToken) {
            token = await randStr (length) + '-' + await randStr (length)
            newToken = await tokenExists (token)
        }
        return token
    } catch (error) {
        return error
    }
}

async function InsertToken(serial_number, scuuid) {
    try {
        const pool = mysql.createPool({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        const token = await tokenGen(3)

        const sql = `INSERT INTO online_access_tokens (serial_number, uuid, token, is_active) VALUES ('${serial_number}', '${scuuid}', '${token}', '1');`
        console.log('sql')
        console.log(sql)
        const sqlResult = await pool.query(sql)
        return sqlResult

    } catch (error) {
        return {
            success: false,
            message: "Insert to Mysql Failure",
            error: error
        }
    }
}

async function tokenExists (token) {
    try {
        const pool = mysql.createPool({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        const sql = `SELECT token FROM online_access_tokens WHERE token = '${token}'`
        const sqlResult = await pool.query(sql)
        const tokenRes = sqlResult[0]

        let result = 0
        if (tokenRes.length > 0) {
            result = 1
        }
        return result
    } catch (error) {
        return error
    }
}

module.exports.rdsTestTokens = async event => {
    // const topic = event.topic
    // const res = topic.split("/")
    // const serialNumber = res[5]
    // const scuuid = res[7]

    const sqlResult = await InsertToken('AAABBB', 'AAABBB-DOG2')

    const resp = {
        'onlineAccessCode': sqlResult
    }
    return {
        statusCode: 200,
        body: JSON.stringify(resp)
    }



    // const mqttParams = {
    //     topic: `aab`,
    //     payload: '{"hh":"pp"}',
    //     qos: '0'
    // };
    // await publishMqtt(mqttParams)

    // Publish MQTT
    // const mqttTopic = `scican/sys/rsp/fnTokenInsertMQTT/serialNumber/${serialNumber}/scuuid/${scuuid}`
    // const payLoadJSON = {
    //     'topic' : mqttTopic,
    //     'payload' : sqlResult
    // }
    
    // const mqttParams = {
    //     topic: mqttTopic,
    //     payload: JSON.stringify(payLoadJSON),
    //     qos: '0'
    // };
    
    // await publishMqtt(mqttParams)
    
}