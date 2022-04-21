const AWS = require('aws-sdk')

// Added lower timeout to reduce the running in pending.
// Add short timeouts
AWS.config.update({
  httpOptions: {
    timeout: 3000,
    connectTimeout: 1000
  }
})

const S3 = new AWS.S3()
const { v4: uuidv4 } = require('uuid')

module.exports.uploadToS3 = async (params) => {
  try {
    console.log('🚀 START uploadToS3')
    console.log('🚀 params: ', params)
    const objectParams = {
      Bucket: params.bucket,
      Key: uuidv4() + '.json',
      Body: params.body
    }
    console.log('🚀 objectParams: ', objectParams)
    const result = await S3.putObject(objectParams).promise()
    return result
  } catch (e) {
    return { error: e }
  }
}

module.exports.deleteS3 = async (params) => {
  try {
    console.log('🚀 START deleteS3')
    console.log('🚀 params: ', params)
    const objectParams = {
      Bucket: params.bucket,
      Key: params.Key
    }
    console.log('🚀 objectParams: ', objectParams)
    const result = await S3.deleteObject(objectParams).promise()
    return result
  } catch (e) {
    return { error: e }
  }
}

module.exports.getObject = async (params) => {
  try {
    console.log('🚀 START getObject')
    console.log('🚀 params: ', params)
    const objectParams = {
      Bucket: params.bucket,
      Key: params.Key
    }
    console.log('🚀 objectParams: ', objectParams)
    const data = await S3.getObject(objectParams).promise()
    const s3Object = JSON.parse(data.Body)
    console.log('🚀 s3Object: ', s3Object)
    return s3Object
  } catch (e) {
    return { error: e }
  }
}
