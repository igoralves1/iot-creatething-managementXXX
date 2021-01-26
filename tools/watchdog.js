// Zabbix sender
const ZabbixSender = require('node-zabbix-sender');
// Performace lib
const {performance} = require('perf_hooks');


// The items count
let itemsCount = 0;
//Milliseconds start
let startMiliSeconds = performance.now();

//Memory start
let startMemBytes = process.memoryUsage().rss;


// Instantiate the Zabbix Sender client
const configured = typeof process.env.ZABBIX_SERVER !== "undefined" && typeof process.env.ZABBIX_HOSTNAME !== "undefined"
const sender = new ZabbixSender({
    host: process.env.ZABBIX_SERVER,
    items_host: process.env.ZABBIX_HOSTNAME,
});

// Private item adding
const addItem = (type, code, value) => {
    itemsCount++;
    // Trapper key, can be [err] or [err.svc]
    let key;
    if (code) {
        key = type + "." + code;

    } else {
        key = type;
    }
    console.log("Added key no " + itemsCount + ":" + key + ", value: " + value);
    sender.addItem(key, value);
}

const end2MiliSeconds = () => {
    return parseFloat(performance.now() - startMiliSeconds).toFixed(4);
}

const end2MemMB = () => {
    // Started memory minus current started memory
    // Count inside used memory, not by entire start up
    return Number.parseFloat((process.memoryUsage().rss - startMemBytes) /  (1024 * 1024)).toFixed(4);
}

// Start timer
exports.start = () => {
    startMiliSeconds = performance.now();
    startMemBytes = process.memoryUsage().rss;
}
/**
 *  Send error message or value to zabbix trapper item.
 * @param value string
 * @param code (optional)
 */
exports.error = (value, code) => {
    addItem('err', code, value);
}

/**
 *  Send info message or value to zabbix trapper item.
 * @param value string
 * @param code (optional)
 */
exports.info = (value, code) => {
    addItem('inf', code, value);
}

/**
 *  Send warning message or value to zabbix trapper item.
 * @param value string
 * @param code (optional)
 */
exports.warning = (value, code) => {
    addItem('war', code, value);
}

/**
 *  Send debug message or value to zabbix trapper item.
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
 * @returns {Promise<void>}
 */
exports.send = async () => {
    if(!configured){
        console.warning("Zabbix server and host seem to not be properly configured");
        return ;
    }
    try {
        // Add time duration
        addItem('inf', 'tim', end2MiliSeconds());
        // Add memory item
        addItem('inf', 'mem', end2MemMB());
    } catch (err) {
        console.error("Error on collecting base time and memory metrics, error:" + err);
        // Add time duration
        addItem('inf', 'tim', 0);
        // Add memory item
        addItem('inf', 'mem', 0);
    }
    try {
        sender.send(function (err, res) {
            if (err) {
                console.error("Error received from metrics server: " + process.env.ZABBIX_SERVER
                    + ", error:" + err)
            }
            console.dir(res);
        });
    } catch (err) {
        console.error("Error on sending metrics to server: " + process.env.ZABBIX_SERVER
            + ", error:" + err)
    } finally {
        console.info("Sent metrics successful");
    }
}
