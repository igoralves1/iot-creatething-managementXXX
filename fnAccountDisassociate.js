'use strict'

/**
 * Disassociate account from online access ONLY if the user has an account
 * Publish to Account event if successfully disassociated
 * 
 * TOPICS: 
 * - Request: (P|Q|D)/scican/1234AB5678/srv/request/account-disassociate
 * - Response: (P|Q|D)/scican/srv/+/response/account-disassociate

 * 
 * Expected Payload:
 * {
 *  "account_email": "digitalgroupbravog4demo@gmail.com",
 *  "language_iso639": "en",
 *  "language_iso3166": "US"
 * }
 * 
 *
 */

const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
const { getPasswordHash } = require('./utils/getPasswordHash')
const { getProductName, associationDetails } = require('./utils/ProductsData')
const { getUserDetails } = require('./utils/UsersData')
const { disassociate } = require('./utils/ManageAssociations')

const mysql = require('mysql2/promise')

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))


const getEmailPayload = (params) => {
    const { email, firstname, lastname, product_name, serial_num, language, country_code } = params
    const lname = lastname ? `, ${lastname}` : ''
    const baseUrl = "https://updates.scican.com"
    const locale = language && country_code ? `${language.toLowerCase()}_${country_code.toUpperCase()}` : 'en_US'
    const templateName = `iot_disassociate_${locale}`
    const vars = {
        "name": `${firstname}${lname}`, 
        "linkUrl": baseUrl, 
        "email": email, 
        "product_name": product_name,
        "serial_num": serial_num
    }

    const payload = {
        "mail": email,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-disassociate`,
        "mqtt_response_payload": {
            "result": "disassociated"
        },
        "template": templateName,
        "variables": vars
    }

    return payload
}

/**
 * if entry exists in customer unit table then process disassociation and and send email 
 * if user does not exist in table , publish was associated
 * else if check entry in table query failed, do notthing
*/
module.exports.fnAccountDisassociate = async (event) => {
    let connection
    try {
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}
        let isDisassociated = false
        let useremail = ''
        let ca_active_ref_id = ''

        const account_email = event.account_email
        const language = event.language_iso639 ? event.language_iso639 : ''
        const country_code = event.language_iso3166 ? event.language_iso3166 : ''

        console.log('+++ Received payload', event)

        connection = await mysql.createConnection({
                host     : process.env.rdsMySqlHost,
                user     : process.env.rdsMySqlUsername,
                password : process.env.rdsMySqlPassword,
                database : process.env.rdsMySqlDb
            })
        
        let checkRes = await associationDetails(account_email, serialNumber)

        if (checkRes != null) {
            useremail = checkRes.length > 0 ? checkRes[0] : ""
            ca_active_ref_id = checkRes.length > 0 ? checkRes[1] : ""
        }

        if (useremail && useremail != null){
            isDisassociated = await disassociate(useremail, serialNumber, ca_active_ref_id)
            
            if(isDisassociated) {
                //get user's details
                const userDetails = await getUserDetails(useremail)

                //get product name
                const productName = await getProductName(serialNumber)

                const emailPayload = getEmailPayload({
                    email: useremail, 
                    firstname: userDetails.firstname,
                    lastname: userDetails.lastname || '', 
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
            } else {
                if(isDisassociated == null) {
                    publishParams = {
                        topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-disassociate`,
                        payload: JSON.stringify({"result": "unknown_error"}),
                        qos: '0' 
                    }
                }
                console.log("🚀 Dissociation not successful. isDisassociated = ", isDisassociated)
            }
        } else if(account_email && !useremail && useremail != null && checkRes != null) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-disassociate`,
                payload: JSON.stringify({"result": "was_disassociated"}),
                qos: '0' 
            }

            console.info('+++ Was already associated. Publishing to unit ... ', publishParams)
        } else {
            if(checkRes == null) {
                publishParams = {
                    topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-disassociate`,
                    payload: JSON.stringify({"result": "unknown_error"}),
                    qos: '0' 
                }
            }
            console.log("🚀 Something went wrong. Nothing Published: useremail = ", useremail)
        }

        if(Object.keys(publishParams).length > 0) {
            console.log('++++ Publishing ...')

            await publishMqtt(publishParams)
                .then( () => console.log('Publish Done: Params - ', publishParams))
                .catch(e => console.log(e))


            //publish to /event/account when there is a change in the db
            if (isDisassociated) {
                const publishData = {
                    topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/event/account`,
                    payload: JSON.stringify({"account_state": "disassociated", "account_state_time_modified_utc_seconds": Date.now()}),
                    qos: '0'
                }

                await publishMqtt(publishData)
                .then( () => console.log('Account Event Publish Done: Params - ', publishData))
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
