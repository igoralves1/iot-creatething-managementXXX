// Zabbix sender
const ZabbixSender = require('./zabbix-sender.js');

// Instantiate the Zabbix Sender client
const configured = typeof process.env.ZABBIX_SERVER !== "undefined" && typeof process.env.ZABBIX_HOSTNAME !== "undefined"
var sender = new ZabbixSender({
    host: process.env.ZABBIX_SERVER,
    items_host: process.env.ZABBIX_HOSTNAME,
    timeout: 15000
});
// Private item adding
const addItem = (type, code, value) => {

    // Trapper key, can be [err] or [err.svc]
    let key;
    if (code) {
        key = type + "." + code;

    } else {
        key = type;
    }
    sender.addItem(key, value);
    console.log("Added key no " + sender.countItems() + ":" + key + ", value: " + value);
}

/**
 *  Send error message or value to zabbix trapper item: err.{code}
 * @param value string
 * @param code (optional)
 */
exports.error = (value, code) => {
    addItem('err', code, value);
}

/**
 *  Send info message or value to zabbix trapper item: inf.{code}
 * @param value string
 * @param code (optional)
 */
exports.info = (value, code) => {
    addItem('inf', code, value);
}

/**
 *  Send warning message or value to zabbix trapper item: war.{code}
 * @param value string
 * @param code (optional)
 */
exports.warning = (value, code) => {
    addItem('war', code, value);
}

/**
 *  Send debug message or value to zabbix trapper item: dev.{code}
 * @param value string
 * @param code (optional)
 */
exports.debug = (value, code) => {
    addItem('deb', code, value);
}

/**
 *  Send custom message or value to zabbix trapper item.
 * @param value string
 * @param code (optional)
 */
exports.custom = (value, code) => {
    addItem(code, "", value);
}
/**
 * Sender function
 *
 */
exports.send = async () => {
    var startTime = new Date();
    if(!configured){
        console.warning("Zabbix server and host seem to not be properly configured");
        return ;
    }
    try {
        return new Promise((resolve, reject) => {
            sender.send(function (err, res) {
                if (err) {
                    console.error("Error received from metrics server: " + process.env.ZABBIX_SERVER
                        + ", error:" + err + ", started at: " + startTime.toISOString());
                    console.error("Error trace: " + err.stack);
                    reject(err);
                }else{
                    console.info("Sent metrics successful: "+ JSON.stringify(res) + ", started at: " + startTime.toISOString());
                    resolve(1);
                }
            })
        });
    } catch (err) {
        console.error("Error on sending metrics to server: " + process.env.ZABBIX_SERVER
            + ", error:" + err + ", started at: " + startTime.toISOString())
        console.error("Error trace: " + err.stack);
    }
}
