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
const axios = require('axios')


const pool = mysql.createPool({
    host     : process.env.rdsMySqlHost,
    user     : process.env.rdsMySqlUsername,
    password : process.env.rdsMySqlPassword,
    database : process.env.rdsMySqlDb
})


const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))


const getEmailPayload = (params) => {
    const { email, firstname, lastname, product_name, serial_num, language } = params
    const lname = lastname ? `, ${lastname}` : ''
    const linkUrl = "updates.scican.com"
    const source = "no-reply.notification@scican.com"
    const templateName = "template_name"
    let subject = "Account Disassociation"
    let body = `Dear ${firstname}${lname},  <br /><br /> `
            + `You have selected to disassociate your ${product_name} with serial number ${serial_num} from your account ${email}. You can still access the cycle data prior to disassociation by logging in to your account on <a href='https://updates.scican.com'>updates.scican.com</a>.`
            +` Your ${product_name} will not be able to upload any cycle data after the disassociation date and you will not be able to create any reports. <br /><br />`
            + `If you want to associate your ${product_name} with serial number ${serial_num} again, please follow the Online Access steps from the unit. <br /><br />`
            + `Please feel free to contact SciCan for more information <br /><br />`
            + `Regards, <br /><br />`
            + `SciCan Team`

    const payload = {
        "mail": email,
        "subject": subject,
        "body": body,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-disassociate`,
        "mqtt_response_payload": {
            "result": "disassociated"
        },
        // "template": templateName,
        // "variables": ""
    }

    return payload
}

/**
 * if entry exists in customer unit table then process disassociation and and send email 
 * if user does not exist in table , publish was associated
 * else if check entry in table query failed, do notthing
*/
module.exports.fnAccountDisassociate = async (event) => {
    try {
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}
        let isDisassociated = false

        const account_email = event.account_email
        const language = event.language_iso639 ? event.language_iso639 : ''

        console.log('+++ Received payload', event)

        let checkRes = await associationDetails(account_email, serialNumber, pool)

        if (checkRes == null) {
            checkRes = []
        }

        const useremail = checkRes.length > 0 ? checkRes[0] : ""
        const ca_active_ref_id = checkRes.length > 0 ? checkRes[1] : ""
console.log('checkRes', checkRes)
        if (useremail && useremail != null){
            isDisassociated = await disassociate(useremail, serialNumber, ca_active_ref_id, pool)
            
            if(isDisassociated) {
                //get user's details
                const userDetails = await getUserDetails(useremail, pool)

                //get product name
                const productName = await getProductName(serialNumber, pool)

                const emailPayload = getEmailPayload({
                    email: useremail, 
                    firstname: userDetails.firstname,
                    lastname: userDetails.lastname || '', 
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
            } else {
                console.log("🚀 Dissociation not successful. isDisassociated = ", isDisassociated)
            }
        } else if(account_email && !useremail && useremail != null) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-disassociate`,
                payload: JSON.stringify({"result": "was_disassociated"}),
                qos: '0' 
            }

            console.info('+++ Was already associated. Publishing to unit ... ', publishParams)
        } else {
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
    }
}
