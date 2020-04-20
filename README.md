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


# Test
url cefla: iot-dev-ub.scicanapi.com/things/cefla
url scican: iot-dev-ub.scicanapi.com/things/scican

## Header
- x-api-key: iot-creatething-management-80efExmuKC4x2RO0mEdzl7GeERTyOblN5rau4WK0 (SCICAN - use whatever is set for the state)
- x-api-key: iot-creatething-management-S7FADNS4yb1epFEThjO19fzywX6X3jy2NlFN6PCg (CEFLA - use whatever is set for the state)

## Tests

### QA
End point SciCan - POST `iot-qa.scicanapi.com/thing/scican`  
x-api-key - `70efExmuKV6x2RP9mEdzl7YeERTyOblN5rau4WK9`  

`
{
"serialNumber":"testToday2",
"privateKey":"scKQ$0enfb3P1Q0zPmSU$2iFU8kz$KP&tmC4CgBbBU&QHlDC!DzD7"
}  
`  

End point Cefla - POST `iot-qa.scicanapi.com/thing/cefla`  
x-api-key - `S9FADNS9tb1epKIRhj367fzywX8H4jy2NlFN6ZXg`  

`
{
"serialNumber":"testToday2",
"privateKey":"cf@6zZDNjY27C^zn91zci#7xRlslxw7Pt!hnOTHS*HzUBVaAETzD7"
}
`
### PROD
End point SciCan - POST `iot.scicanapi.com/thing/scican`  
x-api-key - `t3GwdX9YuH1t0LdJ1qXVR9Dswe1Newxn4ZXOyH34`  

`  
{
"serialNumber":"testToday2",
"privateKey":"scKQ$7lpfb3P1Q0zPmSU$3oUU8kz$KP&tmC4sItbBU&QHlDC!DzD7"
}
`  

End point Cefla - POST `iot.scicanapi.com/thing/cefla`  
x-api-key - `IyQKqVDSx62zFXYWO1nSB8R2Ew6rPHhv5YgTkVjR`  

`
{
"serialNumber":"testToday2",
"privateKey":"cf@9iIDNjY27C^lg61zci#7xRlslxw7Pt!hmTTHS*HzUAPaAETzD7"
}
`