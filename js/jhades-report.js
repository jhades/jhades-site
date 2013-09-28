
// angular parent controller for the report page 
function ReportController($scope,webSocket)  {

    $scope.report = {};

    webSocket.on('beginReport', function(data) {
        $scope.$apply(function() {
            $scope.warName =  data.fileName;
        });
    });

    webSocket.on('statusUpdate', function(data) {
        console.log('status update:' + data.statusUpdate);
        $('#duplicateClassesFoundRow .summary-cell').text(data.statusUpdate + '...');
    });

    webSocket.on('endReport', function(data) {
        console.log('endReport: ' + JSON.stringify(data));
        $scope.$apply(function() {
            // update the report summary lines when the report ends
            if (data.dupClassesCounter <= 0) {
                $scope.report.status = 'success';
              $('#duplicateClassesFoundRow' + ' .summary-cell' ).text('OK');
            }

            if (data.dupClassesCounter > 0 || data.jarOverlapCounter > 0) {
                setStatusInError($scope);
            }

            $scope.dupClassesCounter = data.dupClassesCounter;
            $scope.jarOverlapCounter = data.jarOverlapCounter;
            $scope.reportFinished = true;
        });
    });

}


// angular controller for the duplicate classes section
function DuplicateClassesController($scope, webSocket) {

    $scope.dupClasses = {};
    $scope.dupClasses.rows = [];

    webSocket.on('newDuplicateClassLine', function (data) {
        console.log('newDuplicateClassLine: ' + data) ;
        $scope.$apply(function() {
            setStatusInError($scope);
            $scope.dupClasses.rows.push(data);
        });
    });

    webSocket.on('classDuplicatesPage', function (data) {
        console.log('classDuplicatesPage: ' + data) ;
        $scope.$apply(function() {
            $scope.dupClasses.rows = [];
            data.forEach(function(dup) {
                $scope.dupClasses.rows.push(dup);
            });
        });
    });

    $scope.$watch('detailClicked', function (newValue, oldValue) {
        if(newValue) {
            var message = {
              reportId: JHADES.reportId,
              packageName: newValue.packageName,
                className:  newValue.className
            };
            console.log("Clicked detail: " + JSON.stringify(message));
            webSocket.emit('duplicateClassDetail', message);
            // show the duplicate classes dialog
            $('#modalDupClassesDialog').modal({});
        }
    });

    $scope.$watch('dupClassesCounter', function(newDupClassesTotalRows) {
        $scope.dupClasses.totalPages = calculateNumberOfPages(newDupClassesTotalRows, 10);
    });

}

// angular controller for the jar overlap grid
function JarOverlapController($scope, webSocket) {

    $scope.overlapJars = {};
    $scope.overlapJars.rows = [];

    webSocket.on('newJarOverlapLine', function (data) {
        console.log('newJarOverlapLine: ' + JSON.stringify(data)) ;
        $scope.$apply(function() {
            setStatusInError($scope);
            $scope.overlapJars.rows.push(data);
        });
    });

    webSocket.on('jarOverlapPage', function (data) {
        console.log('jarOverlapPage: ' + JSON.stringify(data)) ;
        $scope.$apply(function() {
            $scope.overlapJars.rows = [];
            data.forEach(function(dup) {
                $scope.overlapJars.rows.push(dup);
            });
        });
    });

    $scope.$watch('jarOverlapCounter', function(newJarOverlapTotalRows) {
        $scope.overlapJars.totalPages = calculateNumberOfPages(newJarOverlapTotalRows, 10);
    });


    $scope.$watch('detailClicked', function (newValue, oldValue) {
        if(newValue) {
            var message = {
                reportId: JHADES.reportId,
                jar1: newValue.jar1,
                jar2: newValue.jar2
            };
            console.log("Clicked jar overlap detail: " + JSON.stringify(message));
            webSocket.emit('jarOverlapDetail', message);
            // show the jar overlap classes dialog
            $('#modalOverlapJarsDialog').modal({});
        }
    });

}

function JarOverlapDialogController($scope, webSocket, $timeout) {
    $scope.classEntries = {};
    $scope.classEntries.rows = [];
    webSocket.on('jarOverlapDetail', function (data) {
        console.log('jarOverlapDetail: ' + JSON.stringify(data));
        $scope.$apply(function() {
            $scope.classEntries.rows.push(data);
        });
    });

    $scope.onClose = function() {
      $timeout(function() {
          $scope.classEntries = {};
          $scope.classEntries.rows = [];
          $scope.$parent.detailClicked = null;
      }, 300);
    };
}

function DuplicateClassDialogController($scope, webSocket, $timeout) {
    $scope.classpathEntries = {};
    $scope.classpathEntries.rows = [];
    webSocket.on('duplicateClassDetail', function (data) {
        console.log('duplicateClassDetail: ' + JSON.stringify(data));
        $scope.$apply(function() {
            $scope.classpathEntries.rows.push(data);
        });
    });

    $scope.onClose = function() {
      $timeout(function() {
          $scope.classpathEntries = {};
          $scope.classpathEntries.rows = [];
          $scope.$parent.detailClicked = null;
      }, 300);
    };
}

function calculateNumberOfPages(totalRows, pageSize) {
    if (totalRows <= pageSize) {
        return 1;
    }
    var totalPages = Math.floor(totalRows / pageSize);
    if (totalRows % pageSize > 0) {
        totalPages += 1;
    }
    return totalPages;
}

function setStatusInError($scope) {
    $scope.report.status = 'error';
    $('#duplicateClassesFoundRow .summary-cell').text('Overlapping jars where found.');
}

// request report to the backend only after all controllers are initialized
angular.element(document).ready(function() {

    var getReportRequest = {},
        reportId = window.location.href.split('?')[1].split('=')[1];

    console.log('reportId =' + reportId);

    // initialize angular controllers
    var injector = angular.bootstrap(document,['jhades-app']);

    // request the report to the backend
    injector.invoke(function (webSocket) {

        JHADES.reportId = reportId;

        getReportRequest.reportId = reportId;
        webSocket.emit('getReport',getReportRequest);
    });

 });
