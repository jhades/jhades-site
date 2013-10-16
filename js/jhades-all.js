
// aplication global variables
window.JHADES = {};

//pollyfil for console.log
if (typeof window.console === "undefined" || typeof window.console.log === "undefined") {
    window.console = {};
    window.console.log = function(msg) {
      // at least no errors occur
    };
}

// factory method for the websocket singleton service
angular.module('webSocketService',[]).factory('webSocket',function() {
    var socket = io.connect();
    return socket;
});

// bootstrap based paged grid
angular.module('myComponents' , ['webSocketService'])
    .directive('bootstrapGrid', function($http, $templateCache, $compile) {
        return {
            restrict : 'E',
            scope: {
                dataset: '='
            },
            link: function(scope , iElement, iAttrs) {
                var columns = [];

                // parse the data columns configuration 
                $("column",iElement).each(function(idx, value){
                    var column = {};
                    column.styles = value.getAttribute('styles');
                    column.headerText = value.textContent;
                    column.property = value.getAttribute('property');
                    column.type = value.getAttribute('type');
                    column.onclick = value.getAttribute('onclick');
                    columns.push(column);
                    console.log('Adding column config: ' + JSON.stringify(column));
                });

                scope.columns = columns;
                scope.action = iAttrs.action;
                // load template from the server, cache it and compile it
                $http.get('bootstrap-grid.html', {cache: $templateCache}).success(function(tplContent){
                    iElement.replaceWith($compile(tplContent)(scope));
                });
            },
            controller: function($scope, $element, $attrs, webSocket) {

                $scope.dataset.rows= [];
                $scope.currentPage = 1;
                $scope.dataset.totalPages = '...';

                $scope.isFirstPage = function() {
                  return $scope.currentPage === 1;
                };

                $scope.disableIfFirstPage = function() {
                    return $scope.isFirstPage() ? 'disabled' : '';
                };

                $scope.isLastPage = function() {
                  return $scope.currentPage === $scope.dataset.totalPages;
                };

                $scope.disableIfLastPage = function() {
                    return $scope.isLastPage() ? 'disabled' : '';
                };

                $scope.onPrevious = function() {
                  if ($scope.currentPage > 1) {
                      $scope.currentPage -= 1;
                  }
                  requestPage($scope.currentPage);
                };

                $scope.onNext = function() {
                    if ($scope.currentPage <  $scope.dataset.totalPages) {
                        $scope.currentPage += 1;
                    }
                    requestPage($scope.currentPage);
                };

                $scope.viewDetail = function(rowData) {
                    $scope.$parent.detailClicked = rowData;
                };

                function requestPage(page) {
                    var pageRequest = {};
                    pageRequest.reportId = JHADES.reportId;
                    pageRequest.page = $scope.currentPage;
                    console.log('requesting page for reportId: ' + JHADES.reportId);
                    webSocket.emit($scope.action, pageRequest);
                }
            }
        };
    });


var jHadesApp = angular.module('jhades-app',['myComponents','webSocketService']);


// directive to prevent a link from being clicked
jHadesApp.directive('eatClick', function() {
    return function(scope, element, attrs) {
        $(element).click(function(event) {
            event.preventDefault();
        });
    };
});

// loading spinner
jHadesApp.directive('spinner', function() {
    return {
        restrict: 'E',
        link: function($scope, element, attrs) {
            // configure the spinner widget
            var opts = {
                lines: 10, // The number of lines to draw
                length: 9, // The length of each line
                width: 7, // The line thickness
                radius: 12, // The radius of the inner circle
                corners: 1, // Corner roundness (0..1)
                rotate: 0, // The rotation offset
                direction: 1, // 1: clockwise, -1: counterclockwise
                color: '#000', // #rgb or #rrggbb
                speed: 1, // Rounds per second
                trail: 60, // Afterglow percentage
                shadow: false, // Whether to render a shadow
                hwaccel: false, // Whether to use hardware acceleration
                className: 'spinner', // The CSS class to assign to the spinner
                zIndex: 2e9, // The z-index (defaults to 2000000000)
                 top: '0', // Top position relative to parent in px
                 left: 'auto' // Left position relative to parent in px
            };

            function createSpinner() {
                element.html('<div class="jhades-spinner"/>');
                var spinner = new Spinner(opts).spin(element.get(0));
                element.find('.spinner').addClass('container');
                return spinner;
            }

           var spinner = createSpinner();

            $scope.$watch(attrs.finished, function(value) {
                 console.log('new value for loading indicator: ' + value);
                 if (value) {
                    console.log('removing spinner ..');
                    spinner.stop();
                 }
                 else {
                    spinner = createSpinner();
                 }
            });
        }
    };
});


function JHadesDonwloadController($scope,webSocket)  {

    console.log('Initializing donwload controller ...');

    $scope.onDonwloadJHadesCore = function() {
        console.log('core donwloaded ...');
        webSocket.emit('jHadesCoreDonwloaded', {});
    };

    $scope.onDonwloadJHadesStandalone = function() {
        console.log('standalone donwloaded ...');
        webSocket.emit('jHadesStandaloneDonwloaded', {});
    };

}

