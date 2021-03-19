'use strict'
/* requires env ZABBIX_HOSTNAME and ZABBIX_SERVER, read the system-monitoring project info*/

const watchdog = require('./tools/watchdog');
const mongodb =  require('./tools/mongodb.topic_data');
const rndLogs =  require('./tools/s3.rnd_logs');
const dbPool =  require('./tools/mysql.pool');
const dbconnection =  require('./tools/mysql.conn');
const mqtt =  require('./tools/mqtt.conn');

const error = function(err, resource){
    console.error(resource + " error:" + err);
    console.error(resource + " error stack:" + err.stack);
    watchdog.error(resource + " error :" + err);
    watchdog.error(resource + " error stack:" + err.stack);
}

module.exports.handlerCron = async (event) => {
    try {
        console.log("Watchman start execution for payload: " + JSON.stringify(event));
        watchdog.info("Watchman start execution for payload: " + JSON.stringify(event));
        /* Check the S3 resource */
        await rndLogs.uploadToS3(JSON.stringify(event))
            .then(() => {
                watchdog.info(1, 's3');
                console.log("Write OK to S3");
            })
            .catch(err => {
                watchdog.info(0, 's3');
                error(err, "S3");
            });
        /* Check the MongoDB resource */
        await mongodb.insert(event)
            .then((result) => {
                watchdog.info(1, 'mdb');
                console.log("Insert OK to mongodb:" + JSON.stringify(result));
            })
            .catch(err => {
                watchdog.info(0, 'mdb');
                error(err, "MongoDB");
            })
        /* Check the Mysql DB single query resource */
        await dbconnection.execute("SELECT 1", [])
                    .then(() => {
                        watchdog.info(1, 'mysql.single_connection');
                        console.log("DB [" + process.env.rdsMySqlHost + "] single connection OK select")
        })
                    .catch(err => {
                        watchdog.info(0, 'mysql.single_connection');
                        error(err, "DB [" + process.env.rdsMySqlHost + "] connection")
                    })
        /* Check the Mysql DB single query resource */
        await dbconnection.execute("SHOW STATUS WHERE `variable_name` = 'Threads_connected';", [])
                .then(result => {
                        watchdog.info(parseInt(result[0].Value), 'mysql_connected_clients');
                        console.log("DB [" + process.env.rdsMySqlHost + "] CONNECTIONS: " + JSON.stringify(result));
                    }
                )
                .catch(err => error(err, "DB [" + process.env.rdsMySqlHost + "] connection"))

        /* Check the Mysql DB pool resource */
        await dbPool.execute("SELECT 1", [])
                    .then(() => {
                        watchdog.info(1, 'mysql.pool_connection');
                        console.log("DB [" + process.env.rdsMySqlHost + "] pool OK select:" + process.env.rdsMySqlHost)
                    })
                    .catch(err => {
                        error(err, "DB [" + process.env.rdsMySqlHost + "] pool");
                        watchdog.info(0, 'mysql.pool_connection');
                    });
        /* Check the MQTT DB pool resource */
        const topicPrefix = process.env.MQTT_TOPIC_ENV ? process.env.MQTT_TOPIC_ENV.trim() : 'Q/';
        const topic = process.env.WATCHMAN_MQTT_RECEIVER_TOPIC ? process.env.WATCHMAN_MQTT_RECEIVER_TOPIC:  'scican/watchman';
        const mqttPayload = {
            topic: (topicPrefix  + '/' + topic).replace('//', '/'),
            payload: JSON.stringify({sender:'watchman', date: new Date().toISOString()}),
            qos: 0
        };
        // Set reveiver to failure
        watchdog.info(0, 'mqtt.receive');
        await mqtt.publish(mqttPayload)
            .then((result) => {
                console.log("MQTT publish OK data: " + JSON.stringify(mqttPayload));
                watchdog.info(1, 'mqtt.publish');
            }).catch(err => {
                watchdog.info(0, 'mqtt.publish');
                error(err, "MQTT publish");
            });

        console.log("Watchman  execution successful");
        watchdog.info("Watchman  execution successful");
        return watchdog.send();
    } catch (err) {
        error(err, 'Watchman handler');
        watchdog.error("Watchman  execution fail:" + err);
        console.log(err.stack)
        return watchdog.send();
    }
}

module.exports.handlerMqtt = async (event) => {
    try {
        console.log("Watchman mqtt start execution for payload: " + JSON.stringify(event));
        watchdog.info("Watchman mqtt start execution for payload: " + JSON.stringify(event));
        watchdog.info(1, 'mqtt.receive');
        watchdog.info("Watchman mqtt receiver execution successful");
        return watchdog.send();
    } catch (err) {
        error(err, 'Watchman handler');
        watchdog.error("Watchman  execution fail:" + err);
        console.log(err.stack)
        return watchdog.send();
    }
}
