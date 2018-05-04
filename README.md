# Cloudera Data Explorer v2
Bardess coded updated build of CDE.

This is the "GA" of the Cloudera Data Explorer based off the Data Concierge platform developed by Dennis Jaskowiak and Qlik DACH SA team.

Philip Corr of Bardess rebuilt the code to enhance user viability and create guardrails for user interaction. The application is powered by the Cloudera Data Catalog developed by Dave Freriks. The data catalog collects and associates metadata from Impala, Cloudera Navigator, and Cloudera Navigator.

This software is released "AS-IS", but welcome improvements to the base code as there are many cool things that could be added to this concept.

------------------------------------------------------------------------------------------

# Contents & What to do...

##Setup: 

1. Download the contents (or do the magical gitgub repository desktop thingy) into a folder on you Qlik Sense server.

2. Nav to Install Drive (I'll use C: for example) of Qlik Sense [c:\program files\qlik\sense\client] and unzip/create a folder for DataConciergev21
![alt text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/install%20directory%20CDE.png "Install Image1")

3. There are 4 files that need to be edited to match your Qlik Sense environment  
  * index.js, qdc-cloudera-beta.js, index_config.json, and qdc_config.json, first two files are in root dir, next two are in \json dir  

4. Index.js: This config matches the index.html landing page... Adjust ports to match (default is port 80), as well as Qlik Sense proxy (a secondary 'ticket' proxy is shown)
![alt text](https://github.com/Qlik-PE/ClouderaDataExplorer_v2/blob/master/img/indexjs.png "Index.js")

5. Qdc-cloudera-beta.js: Config for the Data Explorer UI launched from main page, matches index.js config.

