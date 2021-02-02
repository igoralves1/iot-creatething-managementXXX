// Import AWS SDK
var AWS = require("aws-sdk");
// Set the region
AWS.config.update({region:  process.env.REGION});

var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});

const emailIsValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)));
/**
 * Default payload
 * @type {{language_iso639: string, mqtt_response_topic: string, mail: string, subject: string, header: string, language_iso3166: string, mqtt_qos: string, source: string, body: string, mqtt_response_payload: {result: string, messageId: string}}}
 */
var data =  {
    mail: '',
    subject: '',
    body: '',
    header: '',
    mqtt_response_topic: '',
    mqtt_response_payload: {
        result: "email_not_sent",
        messageId: ''
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
    payloadIntegrityInc = 0;
    if (!emailIsValid(receivedData.mail)) {
        throw new error("Invalid email address: " + receivedData.mail);
    }
    data.mail = receivedData.mail;
    data.subject = receivedData.subject;
    data.header = receivedData.header;
    data.body = receivedData.body;
    data.language_iso639 = receivedData.language_iso639;
    data.language_iso3166 = receivedData.language_iso3166;

    if (!data.subject) {
        console.warn('Invalid payload field: subject.');
    }
    if (!data.header) {
        console.warn('Invalid payload field: header.');
    }
    if (!data.body) {
        console.warn('Invalid payload field: body.');
    }
    if (!data.language_iso639) {
        console.warn('Invalid payload field: language_iso639.');
    }
    if (!data.language_iso3166) {
        console.warn('Invalid payload field: language_iso639.');
    }
}

/**
 * Preprocess the data back
 * @param data
 * @returns {Promise<void>}
 */
const postProcessHandler = async (processedData) => {
    if (processedData && processedData.mqtt_response_topic) {
        var params = {
            topic: processedData.mqtt_response_topic,
            payload: JSON.stringify(processedData.mqtt_response_payload),
            qos: processedData.mqtt_qos
        };
        try {
            await publishMqtt(params);
            console.log('Deliver back email notification on mqtt:' + JSON.stringify(data));
        }catch (e) {
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
    try{
        preProcessPayload(JSON.parse(event.body));
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
        let sendPromise = new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();
        sendPromise.then(
            function(response) {
                // Add message id to the data.
                data.mqtt_response_payload.messageId = response.MessageId;
                data.mqtt_response_payload.result = 'email_sent';
                console.log("Sent email message id:", response.MessageId);
                postProcessHandler();
            }).catch(
            function(err) {
                console.error(err, err.stack);
                postProcessHandler();
            });
    }catch (err) {
        postProcessHandler();
        console.error(err, err.stack);
        console.error('Error sending email from payload:' + JSON.stringify(event.data));
    }
}