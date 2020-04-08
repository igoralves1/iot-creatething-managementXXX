# Get Endpoint
Install plugins
- To install run npm install serverless-domain-manager

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

