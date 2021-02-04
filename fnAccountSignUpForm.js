//Project 13 Need to test
//VPC time out error. How to fix ????

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


const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))



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




async function CreatePasswordHash(user_email, password){

    try {
        var url = "http://3.86.253.251/user-password-create"
        var data

        data = {
            account_email: user_email,
            account_password: password
        }

        console.log("ready to connect POST API")

        var axiosconnect = await axios.create()
        let res = await axiosconnect.post(url, data)
        console.log("Create Password Hash ==== ", res)
        return res.data.password_hash

    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
    }
}


module.exports.fnAccountSignUpForm = async (event) => {
    try {
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        console.log("event ===== ", event)


        const input =
            {
                "account_email": "928064091@qq.com",
                "account_password": "sc1canltd",

                "account_company_name": "Alpha",
                "account_contact_name": "Bravo",
                "account_phone_number": "+14167778888",
                "account_address": "Charlie",
                "account_city": "Delta",
                "account_subregion": "Echo",
                "account_country": "Foxtrot",
                "account_zip_code": "Golf",

                "language_iso639": "en",
                "language_iso3166": "US"
            }


        const account_email = event.account_email
        const account_password = event.account_password
        console.log("account email ===== ", account_email)

        console.log("account password ===== ", account_email)

        const account_company_name = event.account_company_name
        const account_contact_name = event.account_contact_name
        const account_phone_number = event.account_phone_number
        const account_address = event.account_address
        const account_city = event.account_city
        const account_subregion = event.account_subregion
        const account_country = event.account_country
        const account_zip_code = event.account_zip_code
        const language = event.language_iso639
        const language_iso3166 = event.language_iso3166



        const userExist = await isUserExist(account_email)
        console.log("userExist ===== ", userExist)


        var info
        if (userExist == true){
            info = {
                "result": "account_already_exists"
            }
        } else {
            console.log("ready to POST CreatePasswordHash")
            const passwordhash = await CreatePasswordHash(account_email, account_password)




            console.log("passwordhash ===== ", passwordhash)
            info = {
                "result": "associated"
            }
        }


        var params = {
            topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-form`,
            payload: JSON.stringify(info),
            qos: '0'
        };
        await publishMqtt(params)


        //Q/scican/1234AB5678/srv/request/account-signup-form
        //Q/scican/#
        //Q/scican/srv/1234AB5678/response/account-signup-form



    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


