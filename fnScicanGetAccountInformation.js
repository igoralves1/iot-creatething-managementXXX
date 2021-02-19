'use strict'

/**
 * Gets user information including all units owned by the user.
 * 
 * Topics: 
 *  - Request: (P/Q/D)/scican/evn/get-account-information
 *  - Response: response_topic from payload
 * 
 * Expected Payload:
 * {
 *  "email": "digitalgroupbravog4demo@gmail.com",
 *  "serial_number": "1234AB5678",
 *  "response_topic": "D/scican/srv/1234AB5678/event/account"
 * }
 * 
 * Response Payload:
 * accounts: [
 *  {
 *      "account_state": "associated",
 *      "account_state_time_modified_utc_seconds": 1612904346746,
 *      "account_company_name": "Scican",
 *      "account_contact_name": "Digital Group",
 *      "account_phone_number": "1231231234",
 *      "account_address": "",
 *      "account_city": "",
 *      "account_subregion": "",
 *      "account_country": "CA",
 *      "account_zip_code": "",
 *      "units": [
*           {
*            "serial_number": "1234AB5678"
*           }
 *      ]
 *  }
 * ]
 * 
 */

const AWS = require('aws-sdk')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
const uuid = require('uuid')

const mysql = require('mysql2/promise')
const axios = require('axios');

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

/**
 * Returns an object of user information
 * 
 * @param {string} email 
 * @returns {Object}
 */
async function getUserDetails(email) {
    let details = {}
    try {
        const sql = `SELECT email, firstname, lastname, telephone, company, office_address_one, office_address_two, city, 
country,  zip_postal_code, state_province_region FROM users WHERE username = '${email}'`

        if ( pool ) {
            const sqlResult = await pool.query(sql)
            const res = sqlResult[0]

            if(res[0]) {
                details.firstname = res[0].firstname || ''
                details.lastname = res[0].lastname || ''
                details.telephone = res[0].telephone || ''
                details.company = res[0].company || ''
                details.address1 = res[0].office_address_one || ''
                details.address2 = res[0].office_address_two || ''
                details.city = res[0].city || ''
                details.country = res[0].country || ''
                details.region = res[0].state_province_region || ''
                details.zip_code = res[0].zip_postal_code || ''
            }
        }
        
        return details

    } catch (error) {
        console.log("🚀 getUserDetails - error: ", error)
        console.log("🚀 getUserDetails - error stack: ", error.stack)
        return {}
    }
}

/**
 * Returns an array of units
 * 
 * @param {string} email 
 * @returns {Array}
 */
async function getCustomerUnits(email) {
    let units = []
    
    try {
        const sql = `SELECT serial_num, association_active FROM customers_units WHERE association_active = 1 AND user_email = '${email}'`

        if ( pool ) {
            const sqlResult = await pool.query(sql)
            const res = sqlResult[0]
            const data = res && res != null ? res : []

            if(data.length > 0) {
                for( const k in data ) {
                    units.push(
                        {
                            serial_number: data[k].serial_num,
                            association_status: data[k].association_active
                        }
                    )
                }
            }
        }
        
        return units
    } catch (error) {
        console.log("🚀 getProductName - error: ", error)
        console.log("🚀 getProductName - error stack: ", error.stack)
        return []
    }
}

/**
 * Returns an object with payload data ready for publishing
 * 
 * @param {Object} userDetail
 * @param {Array} units - an array of objects
 * @returns {Object} 
 */
const processPaylodData = (serial_num, userDetail, units ) => {
    const { email, firstname, lastname, telephone, company, address1, address2, city, country,  zip_code, region} = userDetail
    const contact_name = firstname + (lastname ? ` ${lastname}` : '')
    const address = address1 +(address2 ? `, ${address2}` : '')
    let account_state = ""
    let customer_units = []

    //process units
    for( const k in units) {
        if(units[k].serial_number == serial_num) {
            account_state = units[k].association_status ? 'associated' : 'disassociated'
        }

        customer_units.push(
            {
                'serial_number': units[k].serial_number
            }
        )
    }
    
    const payload = {
        "accounts": [
            {
                "account_state": account_state,
                "account_state_time_modified_utc_seconds": Date.now(),
                "account_email": email,
            
                "account_company_name": company,
                "account_contact_name": contact_name,
                "account_phone_number": telephone,
                "account_address": address,
                "account_city": city,
                "account_subregion": region,
                "account_country": country,
                "account_zip_code": zip_code,

                "units": customer_units
            }
        ]
    }

    return payload
}


module.exports.fnScicanGetAccountInformation = async (event) => {
    try {
        const retval = event.retval
        const serial_number = event.serial_number || ''
        const email = event.email || ''
        const response_topic = event.response_topic || ''
        
        let publishParams = {}

        console.log('+++ Received payload == ', event)

        let userDetails = await getUserDetails(email)

        /*if(typeof userDetails !== 'object' || userDetails == null) {
            userDetails = {}
        }*/

        if(typeof userDetails == 'object' && Object.keys(userDetails).length > 0) {
            //get user's units
            const units = await getCustomerUnits(email)

            //get payload
            const payload = processPaylodData(serial_number, userDetails, units)

            publishParams = {
                topic: response_topic,
                payload: JSON.stringify(payload),
                qos: '0' 
            }

            console.info('+++ Sending Account Change Event ... ', publishParams)
        } else {
            console.log("🚀 Something went wrong. Nothing Published: userDetails = ", userDetails)
        }

        if(Object.keys(publishParams).length > 0 && response_topic) {
            console.log('Publishing ......')

            await publishMqtt(publishParams)
                .then( () => console.log('Publish Done: Params - ', publishParams))
                .catch(e => console.log(e))
        }
    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}

