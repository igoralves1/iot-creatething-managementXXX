'use strict'

/**
 * Activate online access ONLY if the user is successfully authenticated. Disassociate associated user if any
 * If association is successful, publish to (P/Q/D)/scican/evn/get-account-information
 * 
 * TOPICS: 
 * - Request: (P|Q|D)/scican/1234AB5678/srv/request/account-associate-direct
 * - Response: (P|Q|D)/scican/srv/+/response/account-associate-direct
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
const crypto = require('crypto')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
const { getPasswordHash } = require('./utils/getPasswordHash')
const { isValidUserLogin } = require('./utils/userAuthentication')
const { getProductName } = require('./utils/ProductsData')
const { getUserDetails } = require('./utils/UsersData')
const { AssociateUnit } = require('./utils/ManageAssociations')


const mysql = require('mysql2/promise')

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))


const getRandomValue = () => {
    const randVal = Math.random() + Math.random() + Math.random() + Math.random() + Math.random()
    let hash = crypto.createHash('md5').update(String(randVal)).digest("hex")

    return hash
}

const getEmailPayload = (params) => {
    const { email, firstname, lastname, product_name, serial_num, language } = params
    const lname = lastname ? `, ${lastname}` : ''
    const linkUrl = "updates.scican.com"
    const source = "no-reply.notification@scican.com"
    const templateName = "template_name"
    let subject = "Online Access Activation"
    let body = `Dear ${firstname}${lname},  <br /><br /> `
            + `${serial_num} has been successfully registered and activated on your account on  <a href='https://updates.scican.com'>updates.scican.com</a>. You can now access your cycle data, unit information by logging into your account. <br /><br />`
            + `Please feel free to contact SciCan or your local dealer for more information about ${product_name} and its G4<sup>+</sup> features. <br /><br />`
            + `Regards, <br /><br />`
            + `SciCan Team`

    const payload = {
        "mail": email,
        "subject": subject,
        "body": body,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-associate-direct`,
        "mqtt_response_payload": {
            "result": "associated"
        },
        // "template": templateName,
        // "variables": ""
    }

    return payload
}

module.exports.fnAccountAssociateDirect = async (event) => {
    let connection

    try {
        // const axios = require('axios')
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}
        let associated = false

        const account_email = event.account_email
        const language = event.language_iso639 ? event.language_iso639 : 'en'
        const account_password = event.account_password
        const unknown_error =  {
            topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-associate-direct`,
            payload: JSON.stringify({"result": "unknown_error"}),
            qos: '0' 
        }

        console.log('++++ Received Payload ', event);

        connection = await mysql.createConnection({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        const userIdres = await isValidUserLogin(account_email, account_password)

        if (userIdres && userIdres != null){
            //get user's details
            const userDetails = await getUserDetails(account_email)

            //activate online access
            associated = await AssociateUnit({user_id: userDetails.user_id, useremail: account_email, serial_num: serialNumber})

            if(associated && associated != null) {
                //get product name
                const productName = await getProductName(serialNumber)
    
                //get payload
                const emailPayload = getEmailPayload({
                    email: account_email, 
                    firstname: userDetails.firstname,
                    lastname: userDetails.lastname, 
                    product_name: productName,
                    serial_num: serialNumber, 
                    language: language 
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
            
        } else if(!userIdres && userIdres != null) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-associate-direct`,
                payload: JSON.stringify({"result": "invalid_credentials"}),
                qos: '0' 
            }
            
            console.info('+++ Invalid Credentials ... ', publishParams)
        } else {
            if(userIdres == null) {
                publishParams = unknown_error
            }
            console.log("🚀 Something went wrong. Nothing Published: userIdres = ", userIdres)
        }

        if(Object.keys(publishParams).length > 0) {
            console.info('+++ Publishing ...')

            await publishMqtt(publishParams)
                .then( () => console.log('Publish Done: Params - ', publishParams))
                .catch(e => console.log(e))

            if(associated && associated != null) {
                //publish to Account Event topic
                const eventParams = {
                    "email": account_email,
                    "serial_number": serialNumber,
                    "response_topic": `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/event/account`,
                    "error_topic": `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-associate-direct`
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

