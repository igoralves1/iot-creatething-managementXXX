'use strict'
const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv


const axios = require('axios')


const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))


async function SendEmail(email, userExist, language){
    try {
        var body
        var subject
        var url = "https://dev4.scican.com/send-email-template"
        //var url = "http://3.86.253.251/send-email-template"
        var data
        if (userExist == true) {
            subject = "You are a customer"
            body = "Hello, <br><br>" +

                "Please, click " + "<a href='https://updates.scican.com'>here</a>" + " to complete Online Access Activation.<br><br>"

            data = {
                sendto: email,
                subject: subject,
                body: body
            }

            var axiosconnect = await axios.create()
            let res = await axiosconnect.post(url, data)

            console.log("Normal email ===== ", res)
            return res.data.success


        } else {
            subject = "You are NOT a customer"
            body = "Hello No Customer, <br><br>" +

                "Please, click " + "<a href='https://updates.scican.com'>here</a>" + " to complete Online Access Activation.<br><br>"

            data = {
                sendto: email,
                subject: subject,
                body: body
            }

            var axiosconnect = await axios.create()
            let res = await axiosconnect.post(url, data)
            console.log("Normal email ===== ", res)

            return res.data.success
        }

    }catch (error) {
        console.log("🚀 0.SendEmail - error:", error)
        console.log("🚀 0.1.SendEmail - error:", error.stack)
    }
}

module.exports.SendEmailtest = async (event) => {
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


        // event: {
        //     language_iso3166: 'US',
        //         language_iso639: 'en',
        //         account_email: '928064091@qq.com',
        //         topic: 'Q/scican/1234AB5678/srv/request/account-password_reset_email'
        //
        // }


        const haha =

            {
            "account_email": "928064091@qq.com",
            "language_iso639": "en",
            "language_iso3166": "US",
            "userCheck": false
            }

        const account_email = event.account_email
        const language = event.language_iso639

        //const serialNumber = "12345AB5678"

        console.log("account_email === ", account_email)

        const userCheck = event.userCheck

        console.log("userCheck === ", userCheck)

        var info
        if (userCheck == true){
            await SendEmail(account_email, userCheck, language)
            info = {
                "result": "email_sent"
            }
        } else {
            await SendEmail(account_email, userCheck, language)
            info = {
                "result": "existing_account_not_found"
            }
        }


        var params = {
            topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-password_reset_email`,
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
            "language_iso3166": "US",
            "userCheck": false
        }

        const input1 =
            {
                "account_email": "zzheng@scican.com",
                "language_iso639": "en",
                "language_iso3166": "US",
                "userCheck": false
            }

        //Q/scican/1234AB5678/srv/request/account-password_reset_email
        //Q/scican/#
        //Q/scican/srv/1234AB5678/response/account-password_reset_email



    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


