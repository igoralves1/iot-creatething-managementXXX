'use strict'
/* requires env ZABBIX_HOSTNAME and ZABBIX_SERVER, read the system-monitoring project info*/
const watchdog = require('./tools/watchdog');
watchdog.start();

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
        console.log("Watchman start execution for payload: " + JSON.stringify(event));
        watchdog.info("Watchman start execution for payload: " + JSON.stringify(event));
        return Promise.all([
                /* Check the S3 resource */
                rndLogs.uploadToS3(JSON.stringify(event))
                    .then(console.log("Write OK to S3"))
                    .catch(err => error(err, "S3"))
                ,
                /* Check the MongoDB resource */
                mongodb.insert(event)
                    .then((result) => console.log("Insert OK to mongodb:" + JSON.stringify(result)))
                    .catch(err => error(err, "MongoDB"))
                ,
                /* Check the Mysql DB pool resource */
                dbPool.execute("SELECT 1", [])
                    .then(console.log("DB pool OK select:" + process.env.rdsMySqlHost))
                    .catch(err => error(err, "DB [" + process.env.rdsMySqlHost + "] pool"))
                ,
                /* Check the Mysql DB single query resource */
                dbconnection.execute("SELECT 1", [])
                    .then(console.log("DB single connection OK select"))
                    .catch(err => error(err, "DB [" + process.env.rdsMySqlHost + "] connection"))
                /* @TODO the rest of the important resources */
            ]
            ).then(() => {
                    console.log("Watchman  execution successful");
                    watchdog.info("Watchman  execution successful");
                    watchdog.send();
            }).then(() =>  { return  {statusCode: 200,   body: '{}'} }
            ).catch((err) => {
                    watchdog.error("Watchman  execution fail:" + err);
                    console.log(err.stack)
                    watchdog.send();
                    return  {statusCode: 503,   body: JSON.stringify({error: err, stack: err.stack })};
            });
    } catch (err) {
        error(err, 'Watchman handler');
        watchdog.send();
    }
}

