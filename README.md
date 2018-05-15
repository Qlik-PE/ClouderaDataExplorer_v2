# Cloudera Data Explorer v2
Bardess coded updated build of CDE.

## The Cloudera Data Explorer is an Qlik API & Cloudera metadata powered data lake browser for exploratory ad-hoc analytics.

This is the "GA" of the Cloudera Data Explorer based off the Data Concierge platform developed by Dennis Jaskowiak and Qlik DACH SA team.

Philip Corr of Bardess rebuilt the code to enhance user viability and create guardrails for user interaction. The application is powered by the Cloudera Data Catalog developed by Dave Freriks. The data catalog collects and associates metadata from Impala, Cloudera Navigator, and Cloudera Navigator.

This software is released "AS-IS", but welcome improvements to the base code as there are many cool things that could be added to this concept.

------------------------------------------------------------------------------------------

# Contents & What to do...

## Setup: 

1. Download the contents (or do the magical gitgub repository desktop thingy) into a folder on you Qlik Sense server.

2. Nav to Install Drive (I'll use C: for example) of Qlik Sense [c:\program files\qlik\sense\client] and unzip/create a folder for DataConciergev21
![alt text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/install%20directory%20CDE.png "Install Image1")

3. There are 4 files that need to be edited to match your Qlik Sense environment  
  * index.js, qdc-cloudera-beta.js, index_config.json, and qdc_config.json, first two files are in root dir, next two are in \json dir  
4. Index.js: This config matches the index.html landing page... Adjust ports to match (default is port 80), as well as Qlik Sense proxy (a secondary 'ticket' proxy is shown)
![alt text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/indexjs.png "Index.js")

5. Qdc-cloudera-beta.js: Config for the Data Explorer UI launched from main page, matches index.js config.
![alt text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/qdc_cloudera.png "qdc-cloudera-beta.js")

6. Index_config.json: This controls the UI object users select to launch CDE from the index.html landing page
![alt text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/index_config.png "index_config.js")

7. Qdc_config.json:  This links CDE to the metadata application used to create Qlik applications dynamically. The appid can be found in QMC.  
![alt text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/qdc_config.png "qdc_config.js")

## Setup Metadata Catalog App

1. Download the the app from dropbox [here](https://www.dropbox.com/s/d4h8lm1ig1u8xy1/Cloudera%20Data%20Catalog.qvf?dl=0) 

2. Upload to your QMC

3. There are 3 config connections that need to be mapped to your Cloudera instance.

### Impala:
- Create / modify an Impala ODBC SQL connection to your Cloudera system (proxy/gateway or specific node) in the **Impala SQL Metadata** tab.
![alt_text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/impala_connect.png "impala connect")

### Cloudera Navigator:
- Create/modify a connection to the Cloudera Navigator using the REST connector.
  1. Format for REST: http://52.6.112.39:7187/api/v10/entities/paging?query=((type:database)OR(type:table)OR(type:operation)OR(type:field))&limit=220000&offset=0
  2. Change IP to Navigator, v10 API is good for CDH 5.8+
  3. LIMIT value can be changed based on your Navigator repository count values
  ![alt text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/navigator_setup.png "navigator setup")

### Cloudera Manager:
- Create/Modify a connection to Cloudera Manager using the REST connector.
  1. Format for REST: http://52.6.112.39:7180/api/v16/clusters/your_cluster/services/your_impala_service/impalaQueries?filter=(rowsProduced > 1)&from=2016-01-01
  2. You will need to change "your_cluster" and "your_impala_service" to match your config
  3. query date should be modified to suite your desired time frame
 ![alt text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/manager_setup.png "manager_setup")

# Connecting
1. Open browser and connect to https://your_sense_server/resources/DataConciergev21/index.html
2. You may have to login in first to Sense (still testing)...
