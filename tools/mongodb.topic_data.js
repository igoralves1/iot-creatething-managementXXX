const MongoClient = require('mongodb').MongoClient;
/**
 * Mongodb share data insert into topic table
 * @param params
 * @return {Promise<void>}
 */
module.exports.insert = async function  (params) {
    const url = `mongodb://lambdaSciCanRnDlogs:SO3Tbada$1ads3434FhYhx8ypJ@172.31.34.205:27017/mqtt`
    const conn = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = await conn.db('mqtt');
    const collection = await db.collection('topic_data');
    return collection.insertOne(params, (err, response)=>{
        if(err) {
            throw err;
        } else {
            return response.ops[0];
        }
    });
}