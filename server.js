#!/usr/local/bin/node

(function () {

    "use strict";

    require('log-timestamp');

    if (!process.env.JHADES_MONGODB_URL) {
        console.log('Environment variable JHADES_MONGODB_URL must exist and point to a running mongodb instance.');
        process.exit(-1);
    }

    if (!process.env.JHADES_UPLOADS_DIR) {
        console.log('Environment variable JHADES_UPLOADS_DIR must exist and point to a writeable directory.');
        process.exit(-1);
    }

    if (!process.env.JHADES_LOG_DIR) {
        console.log('Environment variable JHADES_LOG_DIR must exist and point to a writeable directory.');
        process.exit(-1);
    }

    var express = require('express'),
        app = express(),
        http = require('http'),
        fs = require('fs'),
        webSocketServer = http.createServer(app),
        io = require('socket.io').listen(webSocketServer),
        mongoose = require('mongoose'),
        ReportStatus = {
            UPLOADED : "UPLOADED",
            COMPLETED : "COMPLETED"
        },
        socket,
        directoryName = '';

    app.use(express.logger());

     io.set('log level', 3);

    // initialize mongodb connection
    mongoose.connect(process.env.JHADES_MONGODB_URL, function(err) {
        if (err) {
            console.log('Error connecting to MongoDB: ' + err);
            console.log('Connection could not be established to MongoDB ' +
                '- check if the mongo server is running and the value of JHADES_MONGODB_URL is correct: ' + process.env.JHADES_MONGODB_URL);
            process.exit(-1);
        }
    });

    // intialize mongodb models
    var JHadesReport = mongoose.model('JHadesReport',
        { reportId: String,
          warFilePath: String,
          status : String,
          dupClassesCounter: String,
          jarOverlapCounter: String ,
          tmpDirectoryPath: String,
          fileName: String });

    var DuplicateClass = mongoose.model('DuplicateClass',
        { reportId : String,
           packageName : String,
          className : String,
          numberOfVersions : String});

    var JarOverlapPair = mongoose.model('JarOverlapPair',
        { reportId : String,
           jar1 : String,
          jar2 : String,
          duplicateClassesTotal : Number});

    var DuplicateClassLocation = mongoose.model('DuplicateClassLocation',
        { reportId : String,
           file : String,
          entry : String,
          size : Number});

    var JHadesStatistics = mongoose.model('JHadesStatistics',
        { donwloadType: String,
          timestamp: String});

    // intialize file upload
    app.use(express.bodyParser({
        uploadDir : process.env.JHADES_UPLOADS_DIR,
        keepExtensions:true
    }));

    //TODO - use if needed
    //app.use(express.limit('150mb'));

    // setup directory for serving static content - no caching for dev purposes 
    app.use(express.static(__dirname, { maxAge: 0 }));

    // receive uploaded war file
    app.post('/war-upload', function (req, res, next) {
        var reportId = req.query['reportId'],
            report,
            fileName = req.files.warFile.path,
            originalFileName = req.files.warFile.name;

        console.log('war upload requested  -> reportId =' + reportId);
        console.log('Uploading file -> ' + originalFileName );

        if (! /\.war$/.test(fileName.toLowerCase())) {
            res.status(500);
            res.end('File Upload failed! - Wrong file extension - .war is expected.');
        }

        // write file record into mongodb AFTER the upload is completed
        directoryName = process.env.JHADES_TMP_DIR + '/' + reportId;
        fs.mkdir(directoryName, function(err){
            if (err) {
                console.log('Error creating directory: ' + directoryName + ' error: ' + err );
            }
            else {
                console.log('Directory created: ' + directoryName);
            }
        });

        report = new JHadesReport({
            "reportId" : reportId,
            "warFilePath" : req.files.warFile.path,
            "status" : ReportStatus.UPLOADED,
            "tmpDirectoryPath" : directoryName,
            "fileName" : originalFileName
        });

        console.log('Saving report: ' + JSON.stringify(report));

        report.save(function(err) {
            if(err) {
                console.log('Error saving report:' + err);
            }
        });

        res.status('200');
        res.end();

    });

    // serve the server log as an attachment popup
    app.get('/jhades.log',function(req, res, next) {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', 'attachment');
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.status('200');
        res.end(fs.readFileSync(process.env.JHADES_LOG_DIR  + '/jhades.log','utf8'));
    });

    // initialize the reporting service
    io.sockets.on('connection', function(socketIo) {
        socket = socketIo;
        // listen for get report requests
        socket.on('getReport', function(message) {
            onGetReport(message);
        });

        // listen for paging request of class duplicates
        socket.on('getClassDuplicatePage', function(message) {
            onGetClassDuplicatePage(message.reportId, message.page);
        });

        // listen for overlap jars page
        socket.on('getOverlapJarsPage', function(message) {
            onGetJarOverlapPage(message.reportId, message.page);
        });

        socket.on('duplicateClassDetail',function(message) {
            onGetDuplicateClassDetail(message);
        });

        socket.on('jHadesCoreDonwloaded',function(message) {
            onJHadesCoreDonwloaded();
        });

        socket.on('jHadesStandaloneDonwloaded',function(message) {
            onJHadesStandaloneDonwloaded();
        });

     });

    function onGetReport(message) {
        // check if the report exists on the db
        findReportAndDo(message.reportId, function(reports){
            var report = reports[0];
            var beginReport = {};
            beginReport.fileName = report.fileName;
            socket.emit('beginReport',beginReport);
            // if reports is not processed yet
            if (reports.length === 1 && report.status === ReportStatus.UPLOADED) {
                console.log('Creating new reports with id ' + message.reportId);
                processGenerateReport(message.reportId);
            }
            // if the reports already exists, send back the first pages
            else {
                console.log('Returning existing reports with id ' + message.reportId);
                onGetClassDuplicatePage(message.reportId, 1);
                onGetJarOverlapPage(message.reportId, 1);
                endReport(report.dupClassesCounter, report.jarOverlapCounter);
            }
        });
    }

    function onGetClassDuplicatePage(reportId, page) {
        DuplicateClass.find()
            .where('reportId').equals(reportId)
            .skip( (page - 1) * 10)
            .limit(10)
            .exec(function(err, dups) {
                console.log('sending dup classes page: ' + JSON.stringify(dups));
                socket.emit('classDuplicatesPage',dups);
            });
    }

    function onGetJarOverlapPage(reportId, page) {
        JarOverlapPair.find()
            .where('reportId').equals(reportId)
            .skip( (page - 1) * 10)
            .limit(10)
            .sort({duplicateClassesTotal: 'desc'})
            .exec(function(err, overlaps) {
                console.log('sending jar overlap classes page: ' + JSON.stringify(overlaps));
                socket.emit('jarOverlapPage',overlaps);
            });
    }

    function onGetDuplicateClassDetail(request) {
        console.log('duplicateClassDetail: ' + JSON.stringify(request));

        var fileName = '/' + request.packageName.replace(/\./g,'/') + '/' +  request.className + '.class',
            message = {}; 

        console.log('searching for ' + fileName);

        DuplicateClassLocation.find()
            .where('reportId').equals(request.reportId)
            .where('file').equals(fileName)
            .exec(function(err, jarDetails){
                var i =0,
                    message = {},
                    jarDetail;
                if (!err && jarDetails) {
                    for (i=0; i < jarDetails.length;i++) {
                        jarDetail = jarDetails[i];
                        message = {};
                        message.location = jarDetail.entry;
                        message.size = jarDetail.size;
                        console.log('sending ' + JSON.stringify(message));
                        socket.emit('duplicateClassDetail', message);
                    }
                }
                else {
                    console.log('Could not find jar details, or error occurred:' + err);
                }
            });
    }

    function processGenerateReport(reportId) {
        console.log('starting report -> reportId =' + reportId);

        var counters = {
            dupClassesCounter: 0,
            jarOverlapCounter: 0
        };

        findReportAndDo(reportId, function(reports) {
            var report;
            if (reports.length === 1) {
                report = reports[0];
                console.log("Running report for file " + report.warFilePath);

                // launch a separate process running a shell script
                var spawn = require('child_process').spawn,
                    jHadesReport  = spawn('./report.sh', [report.warFilePath, report.tmpDirectoryPath]);

                // extract the report content from stdout
                jHadesReport.stdout.on('data', onReportDataChunk.bind(null,reportId,report, counters));

            }
        });
    }

    function onReportDataChunk(reportId, report, counters, dataChunk) {
        var regexResult,
            json,
            dup,
            overlap,
            jarDetail,
            dupClassLine = {},
            jarOverlapLine = {},
            duplicateClassLocation = {},
            sendJson = '',
            message,
            line,
            i =0,
            statusUpdate = {};

        var chunkStr = '' + dataChunk;

        // the data chunk can contain several 
        var lines = chunkStr.split('\n');

        for (i = 0; i< lines.length; i++) {

            line = lines[i];
            console.log(line);

            // check for duplicate class lines
            regexResult = /#DUPLICATE_CLASS# (.*)/.exec('' + line);
            if (regexResult) {
                json = regexResult[1];
                // save the duplicate report line on the database
                dupClassLine = new DuplicateClass({"reportId": reportId });
                dup = JSON.parse(json);

                // save all duplicate lines on the database
                dupClassLine.packageName = dup.packageName;
                dupClassLine.className = dup.className;
                dupClassLine.numberOfVersions = dup.numberOfVersions;
                dupClassLine.save(onDbSave);

                // send to the GUI only the first 10 
                if (counters.dupClassesCounter < 10) {
                    socket.emit('newDuplicateClassLine',dupClassLine);
                }

                counters.dupClassesCounter += 1;
            }
            // check for processing status updates
            regexResult = /#STATUS_UPDATE#(.*)/.exec('' + line);
            if (regexResult) {
                socket.emit('statusUpdate', JSON.parse(regexResult[1]) );
            } 

            // check for overlaping jars entries
            regexResult = /#OVERLAP_JARS#(.*)/.exec('' + line);
            if (regexResult) {
                json = regexResult[1];
                // save the overlap jar report line on the database
                jarOverlapLine = new JarOverlapPair({"reportId": reportId });
                overlap = JSON.parse(json);

                // save all duplicate lines on the database
                jarOverlapLine.jar1 = overlap.jar1.replace(/^.*WEB-INF\/lib\//,'');
                jarOverlapLine.jar2 = overlap.jar2.replace(/^.*WEB-INF\/lib\//,'');
                jarOverlapLine.duplicateClassesTotal = overlap.dupsTotal;
                jarOverlapLine.save(onDbSave);

                // send to the GUI only the first 10 
                if (counters.jarOverlapCounter < 10) {
                    console.log('sending ' + JSON.stringify(jarOverlapLine));
                    socket.emit('newJarOverlapLine',jarOverlapLine);
                }

                counters.jarOverlapCounter += 1;
            }
            // check when summary info is finished, send totals
            regexResult = /#SUMMARY_FINISHED#/.exec('' + line);
            if (regexResult) {
                report.dupClassesCounter = counters.dupClassesCounter;
                report.jarOverlapCounter = counters.jarOverlapCounter;
                report.status = ReportStatus.COMPLETED;

                report.save(makeReportSavedCallback(counters.dupClassesCounter, counters.jarOverlapCounter));
            }
            // continue parsing the report details
            regexResult = /#DETAIL#(.*)/.exec('' + line);
            if (regexResult) {
                json = regexResult[1];
                jarDetail = JSON.parse(json);

                duplicateClassLocation = new DuplicateClassLocation({"reportId": reportId });

                duplicateClassLocation.file = jarDetail.file;
                duplicateClassLocation.entry = jarDetail.entry.replace('/','');
                duplicateClassLocation.size = jarDetail.size;

                duplicateClassLocation.save(onDbSave);
            }
        }

        function makeReportSavedCallback(dupClassesCounter, jarOverlapCounter) {
            return function(err) {
                endReport(dupClassesCounter, jarOverlapCounter);
            };
        }
    }

    function endReport(dupClassesCounter, jarOverlapCounter) {
        var message = {};
        message.dupClassesCounter = dupClassesCounter;
        message.jarOverlapCounter = jarOverlapCounter;
        console.log('sending end report message: ' + JSON.stringify(message));
        socket.emit('endReport',message);
    }

    function onJHadesCoreDonwloaded() {
        console.log('JHades core downloaded...');
        var coreDonwload = new JHadesStatistics({
            "donwloadType": 'core',
            "timestamp": getToday() });
        coreDonwload.save();
    }

    function onJHadesStandaloneDonwloaded() {
        console.log('JHades standalone downloaded...');
        var standaloneDonwload = new JHadesStatistics({
            "donwloadType": 'standalone',
            "timestamp": getToday()});
        standaloneDonwload.save();
    }
 
    function onDbSave(err) {
        if (err) {
            console.log('Error while saving to the database: ' + err);
        }
    }

    function findReportAndDo(reportId, callback) {
        JHadesReport.find()
            .where('reportId').equals(reportId)
            .exec(function(err, reports){
                if (!err && reports && reports.length === 1) {
                    callback(reports);
                }
                else {
                    console.log('Could not find report with Id:' + reportId);
                }
            });
    }

    // start server
    webSocketServer.listen(process.env.JHADES_PORT);
    console.log('jHades server running on port ' + process.env.JHADES_PORT + ' ...');

    function getToday() {
        var today = new Date();
        return today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate();
    }

}());
