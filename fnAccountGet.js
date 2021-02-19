'use strict'

/**
 * Send an email with a link to sign up for an account ONLY if the user does not have an account
 * 
 * TOPICS: 
 * - Request: (P|Q|D)/scican/1234AB5678/srv/request/account-get
 * - Response: (P|Q|D)/scican/srv/+/event/account

 * 
 * Expected Payload:
 * {}
 *
 */

const AWS = require('aws-sdk')
const S3 = new AWS.S3()
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
const { getProductName, unitActiveAssociation } = require('./utils/ProductsData')
const { isUserExist } = require('./utils/UsersData')

const mysql = require('mysql2/promise')
const axios = require('axios')

const pool = mysql.createPool({
    host     : process.env.rdsMySqlHost,
    user     : process.env.rdsMySqlUsername,
    password : process.env.rdsMySqlPassword,
    database : process.env.rdsMySqlDb,
    connectionLimit: 10
})

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))


module.exports.fnAccountGet = async (event) => {
    try {
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serial_number = res[2]
        let publishParams = {}

        console.log('++++ Received Payload ', event);        

        const association_data = await unitActiveAssociation(serial_number, pool)
    console.log('==unit association ', association_data)
        
        pool.end()

        if(association_data != null && Object.keys(association_data).length > 0) {
            const account_email = association_data.user_email

            const eventParams = {
                "email": account_email,
                "serial_number": serial_number,
                "response_topic": `${MQTT_TOPIC_ENV}/scican/srv/${serial_number}/event/account`
            }

            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/evn/get-account-information`,
                payload: JSON.stringify(eventParams),
                qos: '0' 
            }

            console.info('+++ Association exists. Publish Params ... ', publishParams)        
        } else {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serial_number}/event/account`,
                payload: JSON.stringify({
                        "account_state": "disassociated",
                        "account_state_time_modified_utc_seconds": Date.now()
                    }),
                qos: '0' 
            }

            console.info('+++ No Associations found ... ', publishParams)
        }

        if(Object.keys(publishParams).length > 0) {
            console.info('+++ Publishing ...')

            await publishMqtt(publishParams)
                .then( () => console.log('Publish Done: Params - ', publishParams))
                .catch(e => console.log(e))
        }
    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


