# Get Endpoint
Install plugins. To install run:
- npm install --save-dev serverless-domain-manager
- npm install --save-dev serverless-add-api-key

path: companyName
domain: iot-{stage}.scicanapi.com

#  customDomain
To CREATE domain run: serverless create_domain --stage stageName. 
To DELETE domain run: serverless delete_domain --stage stageName.
basePath = things #set for each service. This will be be set after the domain name for all stages.
url: domainName/basePath/company (eg. iot-dev-ub.scicanapi.com/things/cefla)

Note:
- Create domain then run sls deploy
- create_domain needs to be run once in any of the services. this creates the domain which all services can use.
- The domain is created based on the region in specified in the provider. All deployments should be done to the same regioin where the domain was created.


# Tests
  
## Test -dev-ig  

`url cefla`: iot-dev-ig.scicanapi.com/thing/cefla  
`url scican`: iot-dev-ig.scicanapi.com/thing/scican

## Header -dev-ig  

(SCICAN) `x-api-key`: 80efExmuKC4x2RO0mEdzl7GeERTyOblN5rau4WK0 (use whatever is set for the state)  
(CEFLA) `x-api-key`: S7FADNS4yb1epFEThjO19fzywX6X3jy2NlFN6PCg (use whatever is set for the state)

## Body  -dev-ig  

(JSON)
```json
{
    "serialNumber": "string.alphanum.required",
    "privateKey": "string.min(53).max(53).required",
    "macAddress": "string.required"
}
```

(SCICAN) 
`
{  
    "serialNumber":"testDyn5",
    "privateKey":"scKQ$0enfb3P1Q0zPmSU$2iFU8kz$KP&tmC4CgBbBU&QHlDC!DzD7",
    "macAddress":"sdf76"
} 
`

(CEFLA) 
`
{
    "serialNumber":"testDyn5",
    "privateKey":"cf@6zZDNjY27C^zn91zci#7xRlslxw7Pt!hnOTHS*HzUBVaAETzD7",
    "macAddress":"sdf76"
} 
`
## Response  -dev-ig  

(JSON)
```json
{
    "certificatePem": "string",
    "privateKey": "string",
    "scuuid": "string.max(70)",
}
```
  
## Test -qa 

`url cefla`: iot-qa.scicanapi.com/thing/cefla  
`url scican`: iot-qa.scicanapi.com/thing/scican

## Header -qa  

(SCICAN) `x-api-key`: 70efExmuKV6x2RP9mEdzl7YeERTyOblN5rau4WK9 (use whatever is set for the state)  
(CEFLA) `x-api-key`: S9FADNS9tb1epKIRhj367fzywX8H4jy2NlFN6ZXg (use whatever is set for the state)

## Body  -qa  

(JSON)
```json
{
    "serialNumber": "string.alphanum.required",
    "privateKey": "string.min(53).max(53).required",
    "macAddress": "string.required"
}
```

(SCICAN) 
`
{  
    "serialNumber":"testDyn5",
    "privateKey":"scKQ$0enfb3P1Q0zPmSU$2iFU8kz$KP&tmC4CgBbBU&QHlDC!DzD7",
    "macAddress":"sdf76"
} 
`

(CEFLA) 
`
{
    "serialNumber":"testDyn5",
    "privateKey":"cf@6zZDNjY27C^zn91zci#7xRlslxw7Pt!hnOTHS*HzUBVaAETzD7",
    "macAddress":"sdf76"
} 
`
## Response  -qa  

(JSON)
```json
{
    "certificatePem": "string",
    "privateKey": "string",
    "scuuid": "string.max(70)",
}
```


### PROD

`url cefla`: iot.scicanapi.com/thing/cefla  
`url scican`: iot.scicanapi.com/thing/scican

## Header  

(SCICAN) `x-api-key`: t3GwdX9YuH1t0LdJ1qXVR9Dswe1Newxn4ZXOyH34 (use whatever is set for the state)  
(CEFLA) `x-api-key`: IyQKqVDSx62zFXYWO1nSB8R2Ew6rPHhv5YgTkVjR (use whatever is set for the state)

## Body  

(JSON)
```json
{
    "serialNumber": "string.alphanum.required",
    "privateKey": "string.min(53).max(53).required",
    "macAddress": "string.required"
}
```

(SCICAN) 
`
{  
    "serialNumber":"testDyn5",
    "privateKey":"scKQ$7lpfb3P1Q0zPmSU$3oUU8kz$KP&tmC4sItbBU&QHlDC!DzD7",
    "macAddress":"sdf76"
} 
`

(CEFLA) 
`
{
    "serialNumber":"testDyn5",
    "privateKey":"cf@9iIDNjY27C^lg61zci#7xRlslxw7Pt!hmTTHS*HzUAPaAETzD7",
    "macAddress":"sdf76"
} 
`
## Response  

(JSON)
```json
{
    "certificatePem": "string",
    "privateKey": "string",
    "scuuid": "string.max(70)",
}
```

## Invoke Local TEST - file is in the mocks directory.
sls invoke local --function scicancreatething --path mocks/create-thing.json --stage qa


Testing email sendings

Publish an mqtt message to the topic: P/scican/cmd/send_email or Q/scican/cmd/send_email

Example with template

{
    "mqtt_response_payload": {
    "result": "email_sent"
    },
    "mqtt_response_topic": "/dev/null",
    "variables": {
        "description": "Test",
        "subject": "24",
        "email": "uoluigbo@scican.com",
        "phone": "4161111111",
        "name": "Test Tester",
        "linkUrl": "https://dev-my.coltene.com/report-problem?ticket=2291",
        "ticketNumber": 2291,
        "serialNumber": "1234AB5678",
        "model": "HYDRIM C61W G4",
        "firstname": "SciCan Admin",
        "country": "Canada"
        },
    "template": "ocp_report_problem_en_CA",
    "source": "noreply@coltene.com",
    "mail": "uoluigbo@scican.com",
    "topic": "P/scican/cmd/send_email"
}

Example without template


SNS topics:

Standard	arn:aws:sns:us-east-1:366229877060:Liviu_CloudWatch_Alarms_Topic
SES_Feedback_notifications	Standard	arn:aws:sns:us-east-1:366229877060:SES_Feedback_notifications
SES_Feedback_notifications_Bounce	Standard	arn:aws:sns:us-east-1:366229877060:SES_Feedback_notifications_Bounce
SES_Feedback_notifications_Complaint	Standard	arn:aws:sns:us-east-1:366229877060:SES_Feedback_notifications_Complaint
SES_Feedback_notifications_Delivery	

https://docs.google.com/presentation/d/1gELAF4UR0mVIWTLPsTx-hzKMq8hLzdYxp5xVeqoTSRY/edit?usp=sharing
