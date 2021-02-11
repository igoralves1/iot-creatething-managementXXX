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

const mysql = require('mysql2/promise')
const axios = require('axios')

const pool = mysql.createPool({
    host     : process.env.rdsMySqlHost,
    user     : process.env.rdsMySqlUsername,
    password : process.env.rdsMySqlPassword,
    database : process.env.rdsMySqlDb
})

async function isUserExist(user_email) {
    try {

        // console.log("pool ==== ", pool)

        const sql = `SELECT count(1) AS numbers FROM users WHERE username = '${user_email}'`
        // console.log("sql ==== ", sql)

        const sqlResult = await pool.query(sql)
        const res = sqlResult[0]

        // console.log("sqlRes ==== ", sqlResult)
        var userexist
        if (res[0] && res[0].numbers == 0) {
            userexist = false
        } else {
            userexist = true
        }

        return userexist

    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
        return false
    }
}

/**
 * Returns an object with payload data ready for publishing
 * 
 * @param {string} user_email
 * @returns {Object} 
 */
/*
async function getUserDetails(user_email) {
    let details = {}
    try {
        const sql = `SELECT firstname, lastname, company, telephone FROM users WHERE username = '${user_email}'`

        if ( pool ) {
            const sqlResult = await pool.query(sql)
            const res = sqlResult[0]

            if(res[0]) {
                details.firstname = res[0].firstname
                details.lastname = res[0].lastname
                details.company = res[0].lastname
                details.phone = res[0].telephone
            }
        }
        
        return details

    } catch (error) {
        console.log("🚀 getUserDetails - error: ", error)
        console.log("🚀 getUserDetails - error stack: ", error.stack)
    }
}*/

/**
 * Returns product name
 * 
 * @param {string} serial_number
 * @returns {string} 
 */
async function getProductName(serial_number) {
    let product_name = ''
    
    try {
        const sql = `SELECT model_general_name FROM units_models WHERE productSerialNumberPrefix = '${serial_number.slice(0, 4)}'`

        if ( pool ) {
            const sqlResult = await pool.query(sql)
            const res = sqlResult[0]

            if(res[0]) {
                product_name = res[0].model_general_name
            }
        }
        
        return product_name

    } catch (error) {
        console.log("🚀 getProductName - error: ", error)
        console.log("🚀 getProductName - error stack: ", error.stack)
        return ''
    }
}

const getEmailPayload = (params) => {
    const { email, product_name, serial_num, language } = params
    const linkUrl = "updates.scican.com"
    const source = "no-reply.notification@scican.com"
    const templateName = "template_name"
    let subject = "Account SignUp"
    let body = `Dear Sir/Madam  <br /><br /> `
            + `Thank you for choosing ${product_name}. <br /><br />`
            + `Please, click <a href='https://${linkUrl}/register.php?user=CUSTOMER&action=onlineaccess&email=${email}&sn=${serial_num}'>here</a> to complete your registration and online activation for ${serial_num}.<br /><br /> `
            + `You can access your cycle data, unit information and manuals by logging into your account on <a href='https://updates.scican.com'>updates.scican.com</a>. <br /><br />`
            + `Please feel free to contact SciCan or your local dealer for more information about ${product_name} and its G4<sup>+</sup> features. <br /><br />`
            + `Regards, <br /><br />`
            + `SciCan Team`

    

    const payload = {
        "mail": email,
        "subject": subject,
        "body": body,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-signup-email`,
        "mqtt_response_payload": {
            "result": "email_sent"
        },
        //"template": templateName,
        // "variables": ""
    }

    return payload
}

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))


module.exports.fnAccountSignUpEmail = async (event) => {
    try {
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}

        const account_email = event.account_email
        const language = event.language_iso639 ? event.language_iso639 : ''
        console.log('++++ Received Payload ', event);        

        const userExist = await isUserExist(account_email)
    console.log('==user Exists ', userExist)

        if(!userExist && userExist != null) {
            //get product name
            const productName = await getProductName(serialNumber)

            const emailPayload = getEmailPayload({
                email: account_email, 
                product_name: productName,
                serial_num: serialNumber, 
                language: language 
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
            console.log("🚀 Something went wrong. Nothing Published: userExists = ", userExist)
        }

        if(Object.keys(publishParams).length > 0) {
            await publishMqtt(publishParams)
                .then( () => console.log('Publish Done: Params - ', publishParams))
                .catch(e => console.log(e))
        }
    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


