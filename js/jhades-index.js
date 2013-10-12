$(function () {

    "use strict";

    // generate a unique reportId
    var reportId = guid();

    var jqXHR = null;

    // setup the ajax file upload
    $('#fileUploadField').fileupload({
        url: 'war-upload?reportId=' + reportId,
        add: function (e, data) {
            jqXHR = data.submit();
        },        
        done: function (e, data) {
            console.log('Upload finished, starting report...');
            $('#progressBar .bar').css('width', '100%');
            $('#modalUploadDialog .badge').text('100%');
            setTimeout(function() {
                window.location = 'report.html?reportId=' + reportId;
            },100);            
        },
        progressall: function (e, data) {
            var progress = parseInt(data.loaded / data.total * 100, 10);

            $('#progressBar .bar').css('width', progress + '%');
            $('#modalUploadDialog .badge').text(progress + '%');
        },
        fail: function(e, data) {
            console.log('upload failed.');
            $('#modalUploadDialog').modal('hide');

            var alert = '<div class="alert alert-danger fade in">' +
                 '<a class="close" data-dismiss="alert" href="#">&times;</a>' +
                 '<h4>' + data.jqXHR.responseText + '</h4>' +
             '</div>';

             $('#fileUploadErrors').append(alert);
        }
    });

    // abort the upload on cancel button clicked
    $('#cancelUpload').click(function (e) {
        console.log('File upload cancelled!');
        jqXHR.responseText = 'File Upload Cancelled!';
        jqXHR.abort();
    });

    // open the progress dialog when a file upload starts
    $('#fileUploadField').change(function() {
        // show the progress dialog
        $('#modalUploadDialog').modal({});
    });

    //when upload WAR button clicked, launch file upload dialog
    $('#uploadWarButton').click(function() {
        $('#fileUploadField').click();
    });

    // when clicking on a tweet link, click the tweet button
    $('.tweetLink').click(function(evt) {
        console.log('clicked tweetLink');
        evt.preventDefault();
        $('.tweetButton > a').click();
    });

    // utility functions for generating a unique identifier
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
                 .toString(16)
                 .substring(1);
    }

    function guid() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }


});
