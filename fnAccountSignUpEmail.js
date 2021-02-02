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


async function SendEmail(email, userExist, serial_num, language){
    try {
        var body
        var subject
        var url = "https://dev4.scican.com/send-email-template"
        //var url = "http://3.86.253.251/send-email-template"
        const weburl = "updates.scican.com"
        var data
        if (userExist == true) {
            subject = "Account SignUp Email"
            // body = "Hello, <br><br>" +
            //
            //     "Please, click " + "<a href='https://updates.scican.com'>here</a>" + " to complete Online Access Activation.<br><br>"


            body = "Hello, <br><br>" +

                "Your Scican account is already exist. Please log in your account.<br><br>" +


                "Regards,<br>" +
                "The <a href='https://updates.scican.com'>updates.scican.com</a> Team."


            data = {
                sendto: email,
                subject: subject,
                body: body
            }

            console.log("body ===== ", body)

            var axiosconnect = await axios.create()

            console.log("axiosconnect ==== ", axiosconnect)
            let res = await axiosconnect.post(url, data)
            console.log("VPC Assoc Email ==== ", res)
            return res.data.success

        } else {
            subject = "Account SignUp Email"
            body = "Hello, <br><br>" +

                "Please, click " + "<a href='https://updates.scican.com'>here</a>" + " to sign up your email.<br><br>"

            data = {
                sendto: email,
                subject: subject,
                body: body
            }

            var axiosconnect = await axios.create()
            let res = await axiosconnect.post(url, data)

            console.log("VPC Email ==== ", res)
            return res.data.success
        }

    }catch (error) {
        console.log("🚀 0.SendEmail - error:", error)
        console.log("🚀 0.1.SendEmail - error:", error.stack)
    }
}

module.exports.fnAccountSignUpEmail = async (event) => {
    try {

        const topic = event.topic
        console.log("🚀 3 - topic:", topic)
        const res = topic.split("/")
        console.log("🚀 4 - res:", res)
        const serialNumber = res[2]
        console.log("🚀 5 - serialNumber:", serialNumber)


        // event: {
        //     language_iso3166: 'US',
        //         language_iso639: 'en',
        //         account_email: '928064091@qq.com',
        //         topic: 'Q/scican/1234AB5678/srv/request/account-password_reset_email'
        // }

        const account_email = event.account_email
        const language = event.language_iso639

        //const serialNumber = "12345AB5678"

        console.log("account_email === ", account_email)

        const userCheck = await isUserExist(account_email)

        console.log("userCheck === ", userCheck)

        var info
        if (userCheck == true){
            await SendEmail(account_email, userCheck, serialNumber, language)
            info = {
                "result": "account_already_exist"
            }
        } else {
            await SendEmail(account_email, userCheck, serialNumber, language)
            info = {
                "result": "email_sent"
            }
        }


        var params = {
            topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-email`,
            payload: JSON.stringify(info),
            qos: '0'
        };
        await publishMqtt(params)




        // {
        //     "result": "email_sent"
        // }
        // {
        //     "result": "existing_account_not_found"
        // }


        const input = {
            "account_email": "928064091@qq.com",
            "language_iso639": "en",
            "language_iso3166": "US"
        }

        const input1111 =
            {
                "account_email": "zzheng@scican.com",
                "language_iso639": "en",
                "language_iso3166": "US"
            }

        //Q/scican/1234AB5678/srv/request/account-signup-email
        //Q/scican/#
        //Q/scican/srv/1234AB5678/response/account-signup-email



    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


