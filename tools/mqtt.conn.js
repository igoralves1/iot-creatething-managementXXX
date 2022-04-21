// Import AWS SDK
const AWS = require("aws-sdk");

module.exports.publish = async function(params){
    const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
    return new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)));
}