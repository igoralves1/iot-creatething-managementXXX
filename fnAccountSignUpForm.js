'use strict'

/**
 * Sign up a user if email does not exist. Activate online access. Disassociate any account associated to this SN
 * If association is successful, publish to (P/Q/D)/scican/evn/get-account-information
 * 
 * TOPICS: 
 * - Request: (P|Q|D)/scican/1234AB5678/srv/request/account-signup-form
 * - Response: (P|Q|D)/scican/srv/+/response/account-signup-form
 * 
 * Expected Payload:
 * {
 *  "account_email": "bobdemo@gmail.com",
 *  "account_password": "sc1canltd",
 *
 *  "account_company_name": "Bob Company",
 *  "account_contact_name": "Bob Demo",
 *  "account_phone_number": "+14167778888",
 *  "account_address": "1440 Don Mills",
 *  "account_city": "Toronto",
 *  "account_subregion": "Ontario",
 *  "account_country": "Canada",
 *  "account_zip_code": "m1m 4m4",
 *
 *  "language_iso639": "en",
 *  "language_iso3166": "US"
 * }
 *
 */

const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
const crypto = require('crypto')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
const { getPasswordHash } = require('./utils/getPasswordHash')
const { getProductName } = require('./utils/ProductsData')
const { isUserExist, InsertUser, updateLastLogin } = require('./utils/UsersData')
const { generateRandomValue } = require('./utils/helpers')
const { AssociateUnit } = require('./utils/ManageAssociations')


const mysql = require('mysql2/promise')

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))


const getEmailPayload = (params) => {
    const { email, firstname, lastname, product_name, serial_num, language, country_code } = params
    const baseUrl = "https://updates.scican.com"
    const locale = language && country_code ? `${language.toLowerCase()}_${country_code.toUpperCase()}` : 'en_US'
    const templateName = `iot_signup_form_${locale}`
    const vars = {
        "firstname": `${firstname}`, 
        "linkUrl": baseUrl, 
        "email": email, 
        "product_name": product_name,
        "serial_num": serial_num
    }

    const payload = {
        "mail": email,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-signup-form`,
        "mqtt_response_payload": {
            "result": "associated"
        },
        "template": templateName,
        "variables": vars
    }

    return payload
}

module.exports.fnAccountSignUpForm = async (event) => {
    let connection

    try {
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}
        let associated = false
        const account_password = event.account_password || ''
        let data = {
            account_email: event.account_email || '',
            account_company_name:  event.account_company_name || '',
            account_contact_name:  event.account_contact_name || '',
            account_phone_number:  event.account_phone_number || '',
            account_address:  event.account_address || '',
            account_city:  event.account_city || '',
            account_subregion:  event.account_subregion || '',
            account_country:  event.account_country || '',
            account_zip_code:  event.account_zip_code || '',
            language:  event.language_iso639 || '',
            language_iso3166:  event.language_iso3166 || '',
            country_code: event.language_iso3166 || ''
        }
        
        console.log("++++ Received Event = ", event)

        connection = await mysql.createConnection({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        //get user's details
        const userExist = await isUserExist(data.account_email)

        if (data.account_email && !userExist && userExist != null){
            let user_id = ''
            let isLastLoginUpdated = false
            const hash_time = Date.now()

            const password_hash = getPasswordHash(data.account_email, account_password, hash_time)

            data.password = password_hash || ''

            user_id = await InsertUser(data)

            const login_params = {
                user_id: user_id,
                hash_time: hash_time,
                email: data.account_email
            }
            isLastLoginUpdated = await updateLastLogin(login_params)
            // }

            if(user_id && user_id != null) {
                //activate online access
                associated = await AssociateUnit({user_id: user_id, useremail: data.account_email, serial_num: serialNumber}, connection)

                if(associated && associated != null) {
                //get product name
                const productName = await getProductName(serialNumber)
        
                    //get payload
                    const emailPayload = getEmailPayload({
                        email: data.account_email, 
                        firstname: data.account_contact_name,
                        lastname: data.lastname || '', 
                        product_name: productName,
                        serial_num: serialNumber, 
                        language: data.language,
                        country_code: data.country_code 
                    })
    
                    publishParams = {
                        topic: `${MQTT_TOPIC_ENV}/scican/cmd/send_email`,
                        payload: JSON.stringify(emailPayload),
                        qos: '0' 
                    }

                    console.info('+++ Sending Email ... ', publishParams)
                } else if(!associated && associated != null) {
                    publishParams = {
                        topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-associate-direct`,
                        payload: JSON.stringify({"result": "was_associated"}),
                        qos: '0' 
                    }
                    console.log("🚀 Already associated. Nothing Published:")
                } else {
                    publishParams = unknown_error
                    console.log("🚀 Something went wrong. Nothing Published:")
                }
            }
        } else if(userExist && userExist !== null) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-form`,
                payload: JSON.stringify({"result": "account_already_exists"}),
                qos: '0' 
            }

            console.info('+++ Account already exists ... ', publishParams)
        } else {
            if(userExist == null) {
                publishParams = {
                    topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-form`,
                    payload: JSON.stringify({"result": "unknown_error"}),
                    qos: '0' 
                }
            }
            console.log("🚀 Something went wrong. Nothing Published: userExist = ", userExist)
        }

        if(Object.keys(publishParams).length > 0) {
            console.log('+++ Publishing ...')

            await publishMqtt(publishParams)
                .then( () => console.log('Publish Done: Params - ', publishParams))
                .catch(e => console.log(e))

            if(associated && associated != null) {
                //publish to Account Event topic
                const eventParams = {
                    "email": data.account_email,
                    "serial_number": serialNumber,
                    "response_topic": `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/event/account`,
                    "error_topic": `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-form`
                }
                const evPubParams = {
                    topic: `${MQTT_TOPIC_ENV}/scican/evn/get-account-information`,
                    payload: JSON.stringify(eventParams),
                    qos: '0' 
                }

                await publishMqtt(evPubParams)
                .then( () => console.log('Publish to Account Event Done: Params - ', evPubParams))
                .catch(e => console.log(e))
            }
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