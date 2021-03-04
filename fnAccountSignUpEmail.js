'use strict'

/**
 * Send an email with a link to sign up for an account ONLY if the user does not have an account
 * 
 * TOPICS: 
 * - Request: (P|Q|D)/scican/1234AB5678/srv/request/account-signup-email
 * - Response: (P|Q|D)/scican/srv/+/response/account-signup-email

 * 
 * Expected Payload:
 * {
 *  "account_email": "digitalgroupbravog4demo@gmail.com",
 *  "language_iso639": "en",
 *  "language_iso3166": "US"
 * }
 *
 */

const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
const { saveAssociationEmailRequest } = require('./utils/ManageAssociations')
const { getProductName } = require('./utils/ProductsData')
const { isUserExist } = require('./utils/UsersData')

const mysql = require('mysql2/promise')

const getEmailPayload = (params) => {
    const { email, product_name, serial_num, language, country_code } = params
    const baseUrl = "https://updates.scican.com"
    const locale = language && country_code ? `${language.toLowerCase()}_${country_code.toUpperCase()}` : 'en_US'
    const templateName = `iot_signup_email_${locale}`
    const vars = {
        "name": "Sir/Madam",
        "linkUrl": baseUrl, 
        "email": email, 
        "product_name": product_name,
        "serial_num": serial_num
    }

    const payload = {
        "mail": email,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-signup-email`,
        "mqtt_response_payload": {
            "result": "email_sent"
        },
        "template": templateName,
        "variables": vars
    }

    return payload
}

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))


module.exports.fnAccountSignUpEmail = async (event) => {
    let connection

    try {
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}

        const account_email = event.account_email
        const language = event.language_iso639 ? event.language_iso639 : ''
        const country_code = event.language_iso3166 ? event.language_iso3166 : ''

        console.log('++++ Received Payload ', event);  
        
        connection = await mysql.createConnection({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })
        
        const userExist = await isUserExist(account_email)

        if(!userExist && userExist != null) {
            //insert email and sn into online_access_email_request table
            const saveRequest = await saveAssociationEmailRequest(serialNumber, account_email)

            //get product name
            const productName = await getProductName(serialNumber)

            const emailPayload = getEmailPayload({
                email: account_email, 
                product_name: productName,
                serial_num: serialNumber, 
                language: language,
                country_code: country_code 
            })

            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/cmd/send_email`,
                payload: JSON.stringify(emailPayload),
                qos: '0' 
            }

            console.info('+++ Sending email  to topic ... ', publishParams)        
        } else if( userExist && userExist !== null ) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-email`,
                payload: JSON.stringify({"result": "account_already_exist"}),
                qos: '0' 
            }

            console.info('+++ Account Exist publishing to unit ... ', publishParams)
        } else {
            if(userExist == null) {
                publishParams = {
                    topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-email`,
                    payload: JSON.stringify({"result": "unknown_error"}),
                    qos: '0' 
                }
            }
            console.log("🚀 Something went wrong. Nothing Published: userExists = ", userExist)
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
    } finally {
        if(connection){
            connection.end();
        }
    }
}


