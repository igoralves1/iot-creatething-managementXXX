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
 *   "language_iso639": "en",
 *   "language_iso3166": "US",
 *   "source": "",
 *   }
 *
 * Topic $ENV/scican/cmd/send_email, Q/scican/cmd/send_email
 *
 * The variables: language_iso639, language_iso3166, not in use so are optionally
 *  Required:
 *  mail,
 *  Optional:
 *  subject, body, mqtt_response_topic,source,mqtt_response_payload, mqtt_response_topic
 *
 *  The response payload will be delivered back with message status and the message id.
 *
 *  Source is used as a sender, default value is taken from config and override with payload if it exists
 *  Currently, there is used raw html body, not a template.
 *  The env Topic prefix will be added on the topic, to preserve the stage/ENV session.
 *  @todo
 *      - add template solution based on the language,
 *      - add template variables on payload on manage them
 */

// Import AWS SDK
const AWS = require("aws-sdk");
// Set the region
AWS.config.update({region: process.env.AWS_SES_REGION});
// Email validator
const emailIsValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
// Mqtt publiser method
const publishMqtt = async (params) => {
    const endpoint = process.env.MQTT_ENDPOINT;
    const iotdata = new AWS.IotData({endpoint: endpoint});
    new Promise((resolve) =>
        iotdata.publish(params, (err, res) => {
            resolve(res);
        })
    )
}
/**
 * Default payload
 * @type {{language_iso639: string, mqtt_response_topic: string, mail: string, subject: string, header: string, language_iso3166: string, mqtt_qos: string, source: string, body: string, mqtt_response_payload: {result: string, messageId: string}}}
 */
const data = {
    mail: '',
    subject: '',
    body: '',
    mqtt_response_topic: '',
    mqtt_response_payload: {
        result: "email_not_sent",
        message_id: ''
    },
    mqtt_qos: '0',
    language_iso639: 'en',
    language_iso3166: 'US',
    source: process.env.AWS_SES_EMAIL_SENDER ? process.env.AWS_SES_EMAIL_SENDER.trim() : 'no-reply.notification@scican.com'
};
/**
 * Preprocess the payload and fill it with default values if there is any need.
 *
 * @param receivedData
 * @returns {{}}
 */
const preProcessPayload = (receivedData) => {
    if (receivedData.source && !emailIsValid(receivedData.source)) {
        throw new Error("Invalid email source address on received data: " + JSON.stringify(receivedData));
    }
    if (!emailIsValid(receivedData.mail)) {
        throw new Error("Invalid email address on received data: " + JSON.stringify(receivedData));
    }
    data.mail = receivedData.mail;
    data.subject = receivedData.subject;
    data.header = receivedData.header;
    data.body = receivedData.body;
    data.language_iso639 = receivedData.language_iso639;
    data.language_iso3166 = receivedData.language_iso3166;
    data.mqtt_response_topic = receivedData.mqtt_response_topic;
    if (receivedData.source) {
        data.source = receivedData.source;
    }
    if (!data.subject) {
        console.warn('Invalid payload field: subject.');
    }
    if (!data.mqtt_response_topic) {
        console.warn('Invalid payload field: mqtt_response_topic.');
    }
    if (!data.body) {
        console.warn('Invalid payload field: body.');
    }
    if (!data.language_iso639) {
        console.warn('Invalid payload field: language_iso639.');
    }
    if (!data.language_iso3166) {
        console.warn('Invalid payload field: language_iso3166.');
    }
}

/**
 * Preprocess the data back
 * @param processedData
 * @returns {Promise<void>}
 */
const postProcessHandler = async (processedData) => {
    console.log('Post process start :' + JSON.stringify(processedData));
    if (processedData && processedData.mqtt_response_topic) {
        const topicPrefix = process.env.MQTT_TOPIC_ENV ? process.env.MQTT_TOPIC_ENV.trim() : 'Q'
        let params = {
            topic: (topicPrefix + processedData.mqtt_response_topic).replace('//', '/'),
            payload: JSON.stringify(processedData.mqtt_response_payload),
            qos: processedData.mqtt_qos
        };
        try {
            console.log('Start dlr back email notification on mqtt:' + JSON.stringify(data));
            return publishMqtt(params).then(
                function () {
                    console.log("Sent dlr back to for params: " + params.topic);
                }).catch(
                function (err) {
                    console.error(err, err.stack);
                    console.error('Error sending back dlr to error' + err);
                });
        } catch (err) {
            console.error(err, err.stack);
            console.error('Error deliver back the email notification on mqtt:' + JSON.stringify(data));
        }
    }
}
/**
 * The handler function
 * @param event
 * @returns {Promise<void>}
 */
module.exports.fnSendEmail = async function (event) {
    //Preprocess the payload
    console.log('Sending email start process handler from payload:' + JSON.stringify(event));
    try {
        preProcessPayload(event);
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
        console.log('Sending email collected SES parameters :' + JSON.stringify(params));
        let response = await new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();
        // Add message id to the data.
        data.mqtt_response_payload.message_id = response.MessageId;
        data.mqtt_response_payload.result = 'email_sent';
        console.log("Sent email message id:", response.MessageId);
    } catch (err) {
        console.error(err, err.stack);
        console.error('Error sending email from payload:' + JSON.stringify(event));
    }
    return await postProcessHandler(data);
}