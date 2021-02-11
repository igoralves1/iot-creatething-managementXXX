/**
 *
 * Email sender notification
 * Expected payload :
 * {
 *   "mail": "nicolicioiu.liviu@enode.ro",
 *   "subject": "Demo Subject",
 *   "body": "Body demo <br >",
 *   "mqtt_response_topic": "/de/null/",
 *   "mqtt_response_payload": {},
 *   "template": 'template_name',
 *   "variables": {},
 *   "source": ""
 *  }

 Topic:  Q/scican/cmd/send_email

 Test simple email:
 {
 "mail": "nicolicioiu.liviu@enode.ro",
 "subject": "Demo Subject",
 "body": "Body demo <br >",
 "mqtt_response_topic": "/dev/null"
 }

Before use this payload, please check if the template has been created, using the method:
 https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/ses-examples-creating-template.html


 Test template email:
{
"mail": "nicolicioiu.liviu@enode.ro",
"template": "test_welcome_en",
"variables": {"name":"John Doe"},
"mqtt_response_topic": "/dev/null"
}

 Topic:  Q/scican/cmd/send_email
 * Topic $ENV/scican/cmd/send_email, Q/scican/cmd/send_email
 *
 *
 *  The response payload will be delivered back with message status and the message id.
 *
 *  Source is used as a sender, default value is taken from config and override with payload if it exists
 *  Currently, there is used raw html body, not a template.
 *  The env Topic prefix will be added on the topic, to preserve the stage/ENV session.
 */

// Import AWS SDK
const AWS = require("aws-sdk");
// Custom AWS configutation
AWS.config.update({
    region: process.env.AWS_SES_REGION,
    maxRetries: 10,
    httpOptions: {
        timeout: 15000,
        connectTimeout: 3000
    }
});

// Email validator
const emailIsValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
/**
 * Default payload
 * @type {{language_iso639: string, mqtt_response_topic: string, mail: string, subject: string, header: string,  mqtt_qos: string, source: string, body: string, mqtt_response_payload: {result: string, messageId: string}}}
 */
/**
 * Preprocess the payload and fill it with default values if there is any need.
 *
 * @param receivedData
 * @returns {{}}
 */
const preProcessPayload = (receivedData) => {
    let data = {
        mail: '',
        subject: '',
        body: '',
        mqtt_response_topic: '',
        mqtt_response_payload: {
            result: "email_not_sent"
        },
        mqtt_qos: '0',
        template: '',
        variables: {},
        source: process.env.AWS_SES_EMAIL_SENDER ? process.env.AWS_SES_EMAIL_SENDER.trim() : 'no-reply.notification@scican.com',
        result: {
            message_id: ''
        }
    };
    if (receivedData.source && !emailIsValid(receivedData.source)) {
        throw new Error("Invalid email source address on received data: " + JSON.stringify(receivedData));
    }
    if (!emailIsValid(receivedData.mail)) {
        throw new Error("Invalid email address on received data: " + JSON.stringify(receivedData));
    }
    data.mail = receivedData.mail;

    if (receivedData.subject) {
        data.subject = receivedData.subject;
    }
    if (receivedData.body) {
        data.body = receivedData.body;
    }
    // Template will override the simple email.
    if (receivedData.template) {
        data.template = receivedData.template;
        delete data.subject;
        delete data.body;
    }
    if (receivedData.variables) {
        data.variables = receivedData.variables;
    }
    data.mqtt_response_topic = receivedData.mqtt_response_topic;
    if (receivedData.source) {
        data.source = receivedData.source;
    }
    if (!data.mqtt_response_topic) {
        console.warn('Invalid payload field: mqtt_response_topic.');
    }
    if (!data.subject && !data.template) {
        console.warn('Invalid payload field configuration: subject empty.');
    }
    if (!data.body && !data.template) {
        console.warn('Invalid payload fields configuration: body and template are not defined.');
    }
    return data;
}

/**
 * Preprocess the data back
 * @param processedData
 * @returns {Promise<void>}
 */
const postProcessHandler = async (processedData) => {
    console.log('Post process start: ' + JSON.stringify(processedData));
    // Decide to not send result back if the email was not sent.
    if(processedData.result.message_id === ""){
        console.warn('Post process ended, the email was not sent: ' + JSON.stringify(processedData));
        return ;
    }
    if (processedData && processedData.mqtt_response_topic) {
        const topicPrefix = process.env.MQTT_TOPIC_ENV ? process.env.MQTT_TOPIC_ENV.trim() : 'Q/'
        let params = {
            topic: (topicPrefix + processedData.mqtt_response_topic).replace('//', '/'),
            payload: JSON.stringify(processedData.mqtt_response_payload),
            qos: processedData.mqtt_qos
        };
        try {
            console.log('Start dlr back email notification on mqtt:' + JSON.stringify(processedData));
            return publishMqtt(params).then(
                function () {
                    console.log("Sent dlr back to for params: " + JSON.stringify(params));
                }).catch(
                function (err) {
                    console.error('Error sending back dlr to error: ' + err + ", for params: " + JSON.stringify(params));
                    console.error(err);
                });
        } catch (err) {
            console.error('Error deliver back the email notification on mqtt:' + JSON.stringify(processedData));
            console.error(err);
        }
    }
}
/**
 * The handler function
 * @param event
 * @param context
 * @returns {Promise<void>}
 */
module.exports.fnSendEmail = async function (event, context, callback) {
    //Preprocess the payload
    console.log('Sending email start process handler from payload:' + JSON.stringify(event));
    let data = preProcessPayload(event);
    try {

        let params = {
            Destination: { /* required */
                ToAddresses: [
                    data.mail
                    /* more items */
                ]
            },
            Source: data.source, /* required */
        }
        let response =  null;
        // Sending with template
        if (data.template && data.template !== ''){
            // Create sendEmail params
            let params = {
                Destination: { /* required */
                    ToAddresses: [
                        data.mail
                        /* more items */
                    ]
                },
                Template: data.template,
                TemplateData: JSON.stringify(data.variables),
                Source: data.source, /* required */
            };
            console.log('Sending email with template collected SES parameters :' + JSON.stringify(params));
            response = await new AWS.SES({apiVersion: '2010-12-01'}).sendTemplatedEmail(params).promise();
        }else {
            // Create sendEmail params
            let params = {
                Destination: { /* required */
                    ToAddresses: [
                        data.mail
                        /* more items */
                    ]
                },
                Message: { /* required */
                    Body: { /* required */
                        Html: {
                            Charset: "UTF-8",
                            Data: data.body
                        }
                    },
                    Subject: {
                        Charset: 'UTF-8',
                        Data: data.subject
                    }
                },
                Source: data.source, /* required */
            };
            console.log('Sending raw email collected SES parameters :' + JSON.stringify(params));
            response = await new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();
        }
        console.log("Sent email message id: " + response.MessageId + "");
        data.result.message_id = response.MessageId;
        data.mqtt_response_payload.result = 'email_sent';
        // Add message id to the data.
        if(data.mqtt_response_topic) {
            return new Promise((resolve, reject) => {
                const topicPrefix = process.env.MQTT_TOPIC_ENV ? process.env.MQTT_TOPIC_ENV.trim() : 'Q/'
                let mqttParams = {
                    topic: (topicPrefix + data.mqtt_response_topic).replace('//', '/'),
                    payload: JSON.stringify(data.mqtt_response_payload),
                    qos: data.mqtt_qos
                };
                const endpoint = process.env.MQTT_ENDPOINT;
                const iotdata = new AWS.IotData({endpoint: endpoint});
                iotdata.publish(mqttParams, (err, res) => {
                    if (err) {
                        err.mqtt_endpoint = endpoint;
                        err.mqtt_params = mqttParams;
                        reject(err);
                    }
                    console.log("Sent mqtt notification: " + endpoint + ", " + JSON.stringify(mqttParams));
                })
            });
        }
    } catch (err) {
        console.error('Error sending email from payload:' + JSON.stringify(event));
        console.error(err);
        throw err;
    }
}