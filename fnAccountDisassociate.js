//Project 17

'use strict'
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

        console.log("pool ==== ", pool)

        const sql = `SELECT count(1) AS numbers FROM users WHERE username = '${user_email}'`
        console.log("sql ==== ", sql)

        const sqlResult = await pool.query(sql)
        const res = sqlResult[0]

        console.log("sqlRes ==== ", sqlResult)
        var userexist
        if (res[0].numbers == 0) {
            userexist = false
        } else {
            userexist = true
        }

        return userexist

    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
    }
}



const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))



async function CheckEmail(serial_num){
    try {

        console.log("pool ==== ", pool)

        const sql = `SELECT * FROM customers_units WHERE association_active = 1 AND serial_num = '${serial_num}'`
        console.log("sql ==== ", sql)

        const sqlResult = await pool.query(sql)
        const res = sqlResult[0]

        console.log("sqlRes ==== ", sqlResult)
        const data = res[0]


        console.log("data ===== ", data)




        if (typeof data == 'undefined' || typeof data == []) {
            return ""
        } else {


            const outoput = [data.user_email, data.ca_active_ref_id]
            console.log("output ====== ", outoput)
            return [data.user_email, data.ca_active_ref_id]
        }

    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
    }
}



async function Disassociate(user_email, serial_num, ca_active_ref_id){
    try {

        const sql = `UPDATE scican.customers_units SET
            association_active=0,
            association_from=NULL,
            ca_active_ref_id=NULL,
            web_conf_confirmed=0,
            web_conf_confirmed_date='0000-00-00 00:00:00',
            email_conf_sent_by_unit=0,
            email_conf_sent_by_unit_date='0000-00-00 00:00:00',
            current_location_date='0000-00-00 00:00:00',
            latest_oas_update_date=NOW()
        WHERE user_email='${user_email}' AND serial_num='${serial_num}'`


        console.log("Update sql ==== ", sql)
        const sqlResult = await pool.query(sql)


        const sql1 = `UPDATE scican.customers_units_assoc_dates SET
        linked_to_user_end_date=NOW(),
            data_updated=NOW()
        WHERE ca_active_ref_id='${ca_active_ref_id}' AND user_email='${user_email}' AND serial_num='${serial_num}'`

        console.log("Update sql2 ==== ", sql1)
        const sqlResult2 = await pool.query(sql1)


    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
    }
}





module.exports.fnAccountDisassociate = async (event) => {
    try {

        console.log("🚀 1 - event:", event)
        const retval = event.retval
        console.log("🚀 2 - retval:", retval)
        const topic = event.topic
        console.log("🚀 3 - topic:", topic)
        const res = topic.split("/")
        console.log("🚀 4 - res:", res)
        const serialNumber = res[2]
        console.log("🚀 5 - serialNumber:", serialNumber)


        const account_email = event.account_email
        const language = event.language_iso639
        //const serialNumber = "12345AB5678"


        const checkRes = await CheckEmail(serialNumber)
        const useremail = checkRes[0]
        const ca_active_ref_id = checkRes[1]

        var info
        if (useremail != ""){
            Disassociate(useremail, serialNumber, ca_active_ref_id)
            info = {
                "result": "disassociated"
            }
        } else {
            info = {
                "result": "was_disassociated"
            }
        }


        var params = {
            topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-disassociate`,
            payload: JSON.stringify(info),
            qos: '0'
        };
        await publishMqtt(params)


        const input =
            {
            "language_iso639": "en",
            "language_iso3166": "US"
            }



        //Q/scican/1234AB5678/srv/request/account-disassociate
        //Q/scican/#
        //Q/scican/srv/1234AB5678/response/account-disassociate



    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


