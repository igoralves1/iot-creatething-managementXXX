'use strict'
/* requires env ZABBIX_HOSTNAME and ZABBIX_SERVER, read the system-monitoring project info*/

const watchdog = require('./tools/watchdog');
const mongodb =  require('./tools/mongodb.topic_data');
const rndLogs =  require('./tools/s3.rnd_logs');
const dbPool =  require('./tools/mysql.pool');
const dbconnection =  require('./tools/mysql.conn');

const error = function(err, resource){
    console.error(resource + " error:" + err);
    console.error(resource + " error stack:" + err.stack);
    watchdog.error(resource + " error :" + err.stack);
    watchdog.error(resource + " error stack:" + err.stack);
}

module.exports.handler = async (event) => {
    try {
        watchdog.start();
        console.log("Watchman start execution for payload: " + JSON.stringify(event));
        watchdog.info("Watchman start execution for payload: " + JSON.stringify(event));
        /* Check the S3 resource */
        await rndLogs.uploadToS3(JSON.stringify(event))
            .then(console.log("Write OK to S3"))
            .catch(err => error(err, "S3"));
        /* Check the MongoDB resource */
        await mongodb.insert(event)
            .then((result) => console.log("Insert OK to mongodb:" + JSON.stringify(result)))
            .catch(err => error(err, "MongoDB"))
        /* Check the Mysql DB single query resource */
        await dbconnection.execute("SELECT 1", [])
                    .then(console.log("DB [" + process.env.rdsMySqlHost + "] single connection OK select"))
                    .catch(err => error(err, "DB [" + process.env.rdsMySqlHost + "] connection"))
        /* Check the Mysql DB single query resource */
        await dbconnection.execute("SHOW STATUS WHERE `variable_name` = 'Threads_connected';", [])
                .then(result => {
                        console.log("DB [" + process.env.rdsMySqlHost + "] CONNECTIONS: " + JSON.stringify(result));
                        watchdog.info(parseInt(result[0].Value), 'mysql_connected_clients');
                    }
                )
                .catch(err => error(err, "DB [" + process.env.rdsMySqlHost + "] connection"))

        /* Check the Mysql DB pool resource */
        await dbPool.execute("SELECT 1", [])
                    .then(console.log("DB [" + process.env.rdsMySqlHost + "] pool OK select:" + process.env.rdsMySqlHost))
                    .catch(err => error(err, "DB [" + process.env.rdsMySqlHost + "] pool"));
        /* @TODO the rest of the important resources */
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

