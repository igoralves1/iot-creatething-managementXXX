'use strict'

/**
 * Send an email with a link to activate online access ONLY if the user has an account
 * 
 * TOPICS: 
 * - Request: (P|Q|D)/scican/1234AB5678/srv/request/account-associate-email
 * - Response: (P|Q|D)/scican/srv/+/response/account-associate-email

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
const uuid = require('uuid')
const { saveAssociationEmailRequest } = require('./utils/ManageAssociations')
const { getProductName } = require('./utils/ProductsData')
const { getUserDetails } = require('./utils/UsersData')



const mysql = require('mysql2/promise')
const axios = require('axios');
const { exist } = require('@hapi/joi');

const getEmailPayload = (params) => {
    const { email, firstname, lastname, product_name, serial_num, language, country_code } = params
    const lname = lastname ? `, ${lastname}` : ''
    const baseUrl = "https://updates.scican.com"
    const locale = language && country_code ? `${language.toLowerCase()}_${country_code.toUpperCase()}` : 'en_US'
    const templateName = `iot_associate_email_${locale}`
    const vars = {
        "name": `${firstname}${lname}`, 
        "linkUrl": baseUrl, 
        "email": email, 
        "product_name": product_name,
        "serial_num": serial_num
    }

    const payload = {
        "mail": email,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-associate-email`,
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


module.exports.fnRequestAccountAssocEmail = async (event) => {
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

        connection = await mysql.createConnection({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        let userDetails = await getUserDetails(account_email)

        if(userDetails != null && typeof userDetails == 'object' && Object.keys(userDetails).length > 0) {
            //insert email and sn into online_access_email_request table
            const saveRequest = await saveAssociationEmailRequest(serialNumber, account_email)

            //get product name
            const productName = await getProductName(serialNumber)
        
            const emailPayload = getEmailPayload({
                email: account_email, 
                firstname: userDetails.firstname,
                lastname: userDetails.lastname, 
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

            console.info('+++ Sending Email ... ', publishParams)
        } else if(typeof userDetails == 'object' && Object.keys(userDetails).length == 0) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-associate-email`,
                payload: JSON.stringify({"result": "existing_account_not_found"}),
                qos: '0' 
            }

            console.info('+++ Account does not exist ... ', publishParams)
        } else {
            if(userDetails == null) {
                publishParams = {
                    topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-associate-email`,
                    payload: JSON.stringify({"result": "unknown_error"}),
                    qos: '0' 
                }
            }
            console.log("🚀 Something went wrong. Nothing Published: userDetails = ", userDetails)
        }

        if(Object.keys(publishParams).length > 0) {
            console.log('Publishing ......')

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

