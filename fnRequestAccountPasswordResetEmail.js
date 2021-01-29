'use strict'
const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv



const mysql = require('mysql2/promise')
const axios = require('axios')

async function isUserExist(user_email) {
    try {

        const pool = mysql.createPool({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })


        console.log("pool ==== ", pool)

        const sql = `SELECT count(1) AS numbers FROM users WHERE username = '${user_email}'`
        console.log("sql ==== ", sql)

        const sqlResult = await pool.query(sql)
        const res = sqlResult[0]

        console.log("sqlRes ==== ", sqlResult)
        var userexist
        if (res[0].numbers == 0) {
            userexist = false
        } else {
            userexist = true
        }

        return userexist

    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
    }
}



const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))


async function SendEmail(){
    try {

    }catch (error) {
        console.log("🚀 0.SendEmail - error:", error)
        console.log("🚀 0.1.SendEmail - error:", error.stack)
    }
}

module.exports.fnRequestAccountPasswordResetEmail = async (event) => {
    try {

        console.log("🚀 1 - event:", event)
        const retval = event.retval
        console.log("🚀 2 - retval:", retval)
        const topic = event.topic
        console.log("🚀 3 - topic:", topic)
        // const res = topic.split("/")
        // console.log("🚀 4 - res:", res)
        // const serialNumber = res[2]
        // console.log("🚀 5 - serialNumber:", serialNumber)

        const account_email = topic.account_email
        const account_password = topic.account_password

        console.log("account_email === ", account_email)
        console.log("Hello World123")

        const userCheck = await isUserExist(account_email)

        console.log("userCheck === ", userCheck)

        console.log("Hello World234")


        var info



        info = {
            "result": "Hello World"
        }

        // {
        //     "result": "email_sent"
        // }
        // {
        //     "result": "existing_account_not_found"
        // }


        //Q/scican/1234AB5678/srv/request/account-password_reset_email
        //Q/scican/srv/1234AB5678/response/account-password_reset_email

        var params = {
            topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-password_reset_email`,
            payload: JSON.stringify(info),
            qos: '0'
        };
        await publishMqtt(params)

    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


