const pool = require('mysql2/promise');
var dbPool = pool.createPool({
    host     : process.env.rdsMySqlHost,
    user     : process.env.rdsMySqlUsername,
    password : process.env.rdsMySqlPassword,
    database : process.env.rdsMySqlDb,
    connectionLimit: 2
});
/**
 * Set timeout on db pool to avoid the connect timeout.
 * Be sure the mysql is properly configured.
 */
setInterval(() => {
    dbPool.query('SELECT 1')
}, 30000);

module.exports.execute = async function (sql, args){
    // query database using promises
    const [rows, fields] = await dbPool.execute(sql, args);
    return rows;
}