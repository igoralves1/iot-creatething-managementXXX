const MongoClient = require('mongodb').MongoClient;
/**
 * Mongodb share data insert into topic table
 * @param params
 * @return {Promise<void>}
 */
module.exports.insert = async function  (params) {
    const url = `mongodb://lambdaSciCanRnDlogs:SO3Tbada$1ads3434FhYhx8ypJ@172.31.34.205:27017/mqtt`
    MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }).then(client => {
        const db = client.db('mqtt');
        const collection = db.collection('topic_data');
        result = collection.insertOne(params);
        db.close();
        return result;
    }).then(response => { console.log('Successfully uploaded data to mongodb ' + response); })
        .catch(err => {
            console.log('Error on promise insertMongo');
            console.error(err, err.stack);
        });
}