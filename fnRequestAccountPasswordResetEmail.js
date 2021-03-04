'use strict'

/**
 * Send and email with a link to reset password ONLY if the user has activated onine access for the unit
 * 
 * TOPICS: 
 * - Request: (P|Q|D)/scican/1234AB5678/srv/request/account-password_reset_email
 * - Response: (P|Q|D)/scican/srv/+/response/account-password_reset_email

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
// const crypto = require('crypto')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
const { getPasswordHash } = require('./utils/getPasswordHash')
const { getProductName, checkOnlineAccessStatus } = require('./utils/ProductsData')
const { getUserDetails, updateActivationKey } = require('./utils/UsersData')
const { iso3LanguageCode } = require('./utils/Data')
const { generateRandomValue } = require('./utils/helpers')

const mysql = require('mysql2/promise')
const { isatty } = require('tty')

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
    iotdata.publish(params, (err, res) => resolve(res)))


const getEmailPayload = (params) => {
    const { email, firstname, lastname, product_name, serial_num, language, iso3_lang, country_code, password_hash, activation_key } = params
    const lname = lastname ? ` ${lastname}` : ''
    const baseUrl = "https://updates.scican.com"
    const locale = language && country_code ? `${language.toLowerCase()}_${country_code.toUpperCase()}` : 'en_US'
    const templateName = `iot_reset_password_${locale}`
    const vars = {
        "name": `${firstname}${lname}`, 
        "linkUrl": baseUrl, 
        "email": email, 
        "product_name": product_name,
        "password_hash" : password_hash,
        "activation_key": activation_key,
        "lang": iso3_lang
    }

    const payload = {
        "mail": email,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-password_reset_email`,
        "mqtt_response_payload": {
            "result": "email_sent"
        },
        "template": templateName,
        "variables": vars
    }

    return payload
}

/**
 * if account exists and userDetail is not undefined(meaning query failed), send reset email 
 * if user does not exist in db , publish account does not exist
 * else if query failed, do notthing
 * 
 * Only allow password change if there is online access active
*/
module.exports.fnRequestAccountPasswordResetEmail = async (event) => {
    let connection

    try {
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}
        let isActive = false

        const account_email = event.account_email
        const language = event.language_iso639 ? event.language_iso639 : ''
        const country_code = event.language_iso3166 ? event.language_iso3166 : ''

        console.log('++++ Received Payload ', event)

        connection = await mysql.createConnection({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        let userDetails = await getUserDetails(account_email)

        if(typeof userDetails == 'object' && Object.keys(userDetails).length > 0) {
            //get activation key
            const activation_key = generateRandomValue()

            //get new password
            const new_password = generateRandomValue()

            //get password hash
            const password_hash = getPasswordHash(account_email, new_password, Date.now())
            // console.log(' Password Hash = ', password_hash)

            if(password_hash) {
                const activationKeyUpdated = await updateActivationKey(account_email, activation_key)
            
                if(activationKeyUpdated && activation_key != null) {
                    //get product name
                    const productName = await getProductName(serialNumber)

                    //get ISO639_2 language code
                    let iso3_lang = 'ENG'
                    if(language && language != null) {
                        iso3_lang = await iso3LanguageCode(language)
                    }
                
                    //get email payload
                    const emailPayload = getEmailPayload({
                        email: account_email, 
                        firstname: userDetails.firstname,
                        lastname: userDetails.lastname, 
                        product_name: productName,
                        serial_num: serialNumber, 
                        language: language,
                        iso3_lang: iso3_lang,
                        country_code: country_code,
                        password_hash: password_hash,
                        activation_key: activation_key 
                    })

                    publishParams = {
                        topic: `${MQTT_TOPIC_ENV}/scican/cmd/send_email`,
                        payload: JSON.stringify(emailPayload),
                        qos: '0' 
                    }

                    console.info('+++ Sending Email ... ', publishParams)
                } else {
                    if(activation_key == null) {
                        publishParams = {
                            topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-password_reset_email`,
                            payload: JSON.stringify({"result": "unknown_error"}),
                            qos: '0' 
                        }
                    }
                    console.log('+++ Activation key not saved! - ', activationKeyUpdated)
                }
            }
        } else if(typeof userDetails == 'object' && Object.keys(userDetails).length == 0 && userDetails != null) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-password_reset_email`,
                payload: JSON.stringify({"result": "existing_account_not_found"}),
                qos: '0' 
            }

            console.info('+++ Account does not exist ... ', publishParams)
        } else {
            if(userDetails == null) {
                publishParams = {
                    topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-password_reset_email`,
                    payload: JSON.stringify({"result": "unknown_error"}),
                    qos: '0' 
                }
            }
            console.log("🚀 1-Something went wrong. Nothing Published: userDetails = ", userDetails)
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

