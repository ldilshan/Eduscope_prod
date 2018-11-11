




var eduscope = angular.module('eduscope', ['FBAngular']);


// ===================================Whiteboard Variables ==============================================


var color; //to change line color
var width = 5; //to change line width
var isPensil = false;
var isEraser = false;
var isHighlighter = false;
var whitecanvas,
    context;
var lastX, lastY;
var cPushArray = new Array();
var cStep = -1;
var colorC;
var colorSelect;

//varibles for server side changes
var ServerColor;
var ServerWidth;




var mousePressed = false;
var erasermousePressed = false;


// ======================================================================================================

var socket;


eduscope.controller('buttonController', function($scope,$window, Fullscreen){



    socket = io.connect('http://localhost:3000');
    socket.on('mouse', newDrawing);
    socket.on('pencolor',newColor);
    socket.on('undoRedo', newUndoRedo);
    socket.on('eraser', NewEraser);
    socket.on('Highlighter', newHighlighter);
    socket.on('penwidth', newwidthdata);
    $scope.stopVisble = false;
    $scope.callVisible = true;

    $scope.goFullscreen = function () {

        if (Fullscreen.isEnabled())
           Fullscreen.cancel();
        else
           Fullscreen.all();
     };


    var ws = new WebSocket('wss://' + location.host + '/one2one');
    var videoInput;
    var videoOutput;
    var webRtcPeer;
    var canvas;
    var registerName = null;
    const NOT_REGISTERED = 0;
    const REGISTERING = 1;
    const REGISTERED = 2;
    var registerState = null;

    var audioInput;
    $scope.stopVisble = false;
    $scope.callVisible = true;
    var setting;
    $scope.callingTypes ={};
    $scope.callingTypes.callingId = "1";
    $scope.callingTypes.callings = [
        {id: "1", type: 'localCamera'},
        {id: "2", type: 'wifiCamera'},
        {id: "3", type: 'audio' }
    ];

    $scope.setRegisterState = function(nextState) {
        switch (nextState) {
        case NOT_REGISTERED:
            $('#register').attr('disabled', false);
            $('#call').attr('disabled', true);
            $('#terminate').attr('disabled', true);
            break;

        case REGISTERING:
            $('#register').attr('disabled', true);
            break;

        case REGISTERED:
            $('#register').attr('disabled', true);
            $scope.setCallState(NO_CALL);
            break;

        default:
            return;
        }
        registerState = nextState;
    }

    const NO_CALL = 0;
    const PROCESSING_CALL = 1;
    const IN_CALL = 2;
    var callState = null

    $scope.setCallState = function(nextState) {
        switch (nextState) {
        case NO_CALL:
            $('#call').attr('disabled', false);
            $('#terminate').attr('disabled', true);
            break;

        case PROCESSING_CALL:
            $('#call').attr('disabled', true);
            $('#terminate').attr('disabled', true);
            break;
        case IN_CALL:
            $('#call').attr('disabled', true);
            $('#terminate').attr('disabled', false);
            break;
        default:
            return;
        }
        callState = nextState;
    }

    $scope.onload = function(){
        $scope.muteVisible = true;
        $scope.setRegisterState(NOT_REGISTERED);
        var drag = new Draggabilly(document.getElementById('videoSmall'));

        // camVideo  = document.getElementById('camVideo');
         videoOutput = document.getElementById('videoOutput')
        // videoInput = document.getElementById('videoInput');
        document.getElementById('name').focus();
       // canvas = document.getElementById("myCanvas");



        // var modal = document.getElementById('myModal');
        // var span = document.getElementsByClassName("close")[0];
        // span.onclick = function() {
        //     modal.style.display = "none";
        // }
        // window.onclick = function(event) {
        //     if (event.target == modal) {
        //         modal.style.display = "none";
        //     }
        // }



    }

    // ===========================================Whiteboard Onload function===============================================

    $scope.init = function() {

        whitecanvas = document.getElementById("canvas");
        colorSelect = document.getElementById("colorSwatch");
        colorC = document.querySelector(':checked').getAttribute('data-color');
        var colordata = {
          colorS: colorC
        }
    
        socket.emit('pencolor', colordata);
    
        var widthdata = {
          widthS: width
        }
    
        socket.emit('penwidth', widthdata);
        
    
    
        console.log('colorrrrrrr'+colorC);
        //console.log(colorSelect);
              // Fill Window Width and Height
              whitecanvas.width = window.innerWidth;
              whitecanvas.height = window.innerHeight;
    
              drawImage(); 
    
            
    
            context = whitecanvas.getContext('2d');
            context.strokeStyle = colorC;
            context.lineWidth = width;
            context.linecape = 'round';
            context.Opacity='0.005';
    
            
           
    
      }


    //   ===========================================================================================================





    window.onbeforeunload = function() {
        ws.close();
    }

    ws.onmessage = function(message) {
        var parsedMessage = JSON.parse(message.data);
        console.info('Received message: ' + message.data);

        switch (parsedMessage.id) {
        case 'registerResponse':
            $scope.resgisterResponse(parsedMessage);
            break;
        case 'callResponse':
        $scope.callResponse(parsedMessage);
            break;
        case 'incomingCall':
        $scope.incomingCall(parsedMessage);
            break;
        case 'startCommunication':
        $scope.startCommunication(parsedMessage);
            break;
        case 'stopCommunication':
            console.info("Communication ended by remote peer");
            $scope.stop(true);
            break;
        case 'iceCandidate':
            webRtcPeer.addIceCandidate(parsedMessage.candidate)
            break;
        default:
            console.error('Unrecognized message', parsedMessage);
        }
    }

   $scope.resgisterResponse = function(message) {
        if (message.response == 'accepted') {
            $scope.setRegisterState(REGISTERED);
        } else {
            $scope.setRegisterState(NOT_REGISTERED);
            var errorMessage = message.message ? message.message
                    : 'Unknown reason for register rejection.';
            console.log(errorMessage);
            alert('Error registering user. See console for further information.');
        }
    }

    $scope.callResponse = function(message) {
        if (message.response != 'accepted') {
            console.info('Call not accepted by peer. Closing call');
            var errorMessage = message.message ? message.message
                    : 'Unknown reason for call rejection.';
            console.log(errorMessage);
            $scope.stop(true);
        } else {
            $scope.setCallState(IN_CALL);
            webRtcPeer.processAnswer(message.sdpAnswer);
        }
    }

    $scope.startCommunication = function(message) {
        $scope.setCallState(IN_CALL);
        webRtcPeer.processAnswer(message.sdpAnswer);
    }

    $scope.incomingCall = function(message) {
        // If bussy just reject without disturbing user

        $scope.stopVisible = true;
        $scope.callVisible = false;

        if (callState != NO_CALL) {
            var response = {
                id : 'incomingCallResponse',
                from : message.from,
                callResponse : 'reject',
                message : 'bussy'

            };
            return $scope.sendMessage(response);
        }

        $scope.setCallState(PROCESSING_CALL);
        if (confirm('User ' + message.from + ' is calling you..')) {
            videoInput = document.getElementById('videoInput');
        $scope.showSpinner(videoInput, videoOutput);


           var constraints = {
            audio : true,
            video :{
                width: 640,
                framerate : 15,
            }
    }


    var options = {
        localVideo : videoInput,
        remoteVideo : videoOutput,
        onicecandidate : onIceCandidate,
        mediaConstraints : constraints
    }

            webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options,
                    function(error) {
                        if (error) {
                            console.error(error);
                            $scope.setCallState(NO_CALL);
                        }

                        this.generateOffer(function(error, offerSdp) {
                            if (error) {
                                console.error(error);
                                $scope.setCallState(NO_CALL);
                            }
                            var response = {
                                id : 'incomingCallResponse',
                                from : message.from,
                                callResponse : 'accept',
                                sdpOffer : offerSdp
                            };
                            $scope.callVisible = false;

                            $scope.sendMessage(response);
                        });
                    });

        } else {
            var response = {
                id : 'incomingCallResponse',
                from : message.from,
                callResponse : 'reject',
                message : 'user declined'
            };
            $scope.sendMessage(response);
           $scope.stop(true);
        }
    }

   $scope.register = function() {


        var name = document.getElementById('name').value;
        if (name == '') {
            window.alert("Enter the  Name");
            return;
        }

       $scope.setRegisterState(REGISTERING);

        var message = {
            id : 'register',
            name : name
        };
        $scope.sendMessage( message);
        //document.getElementById('peer').focus();
    }

    $scope.call = function(data) {


        if (document.getElementById('peer').value == '') {
            window.alert("You must specify the peer name");
            return;
        }

        $scope.setCallState(PROCESSING_CALL);

        $scope.stopVisible = true;
        $scope.callVisible = false;

        var options;

        var constraints = {
                audio : true,
                 video :{
                    width: 640,
                    framerate : 15
            }
        }

        if(data.callingId == '1') {

            videoInput = document.getElementById('videoInput');
            $scope.showSpinner(videoInput, videoOutput);
            options = {
                localVideo: videoInput,
                remoteVideo: videoOutput,
                onicecandidate: onIceCandidate,
                mediaConstraints: constraints
            };
        }
        else{
           canvas = document.getElementById("myCanvas");
            camLoad(data);
            var canvasVideo = canvas.captureStream();
            options = {
                videoStream: canvasVideo,
                remoteVideo: videoOutput,
                onicecandidate: onIceCandidate,
                mediaConstraints: constraints

            };
        }
        // else {
        //     audioInput = document.getElementById(audioInput);
        //     options = {
        //         lcoalVideo: audioInput,
        //         remoteStream: audioOutput,
        //         onicecandidate: onIceCandidate
        //     };
        //
        // }
        webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function(
                error) {
            if (error) {
                console.error(error);
               $scope.setCallState(NO_CALL);
            }

            this.generateOffer(function(error, offerSdp) {
                if (error) {
                    console.error(error);
                    $scope.setCallState(NO_CALL);
                }
                var message = {
                    id : 'call',
                    from : document.getElementById('name').value,
                    to : document.getElementById('peer').value,
                    sdpOffer : offerSdp
                };
                $scope.sendMessage(message);
            });
        });

    }

    $scope.stop = function(message) {

       // $scope.name="";
        $scope.callVisible = true;
        $scope.stopVisible = false;
        $scope.setCallState(NO_CALL);
        if (webRtcPeer) {
            webRtcPeer.dispose();
            webRtcPeer = null;

            if (!message) {
                var message = {
                    id : 'stop'
                }
               $scope.sendMessage(message);
            }
        }
       $scope.hideSpinner(videoInput, videoOutput);
    }
    console.log("you are");
    $scope.sendMessage = function(message) {

        var jsonMessage = JSON.stringify(message);
        console.log("Sending message: " + jsonMessage);
        console.log("hello world");
        ws.send(jsonMessage);
    }

    function onIceCandidate(candidate) {
        console.log('Local candidate' + JSON.stringify(candidate));

        var message = {
            id : 'onIceCandidate',
            candidate : candidate
        }
        $scope.sendMessage(message);
    }

    $scope.showSpinner = function() {
        for (var i = 0; i < arguments.length; i++) {
            arguments[i].poster = './img/transparent-1px.png';
            arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
        }
    }

            $scope.hideSpinner = function() {
        for (var i = 0; i < arguments.length; i++) {
            arguments[i].src = '';
            arguments[i].poster = './img/eye.png';
            arguments[i].style.background = '';
        }
    }

    $scope.mute = function(){

       videoInput = document.getElementById("videoInput");
       videoOutput = document.getElementById("videoOutput");
       videoInput.muted = true;
       videoOutput.muted = true;

       $scope.muteVisible = false;
       $scope.unmuteVisible = true;

    }
    $scope.unmute = function(){
        var videoInput = document.getElementById("videoInput");
        var  videoOutput = document.getElementById("videoOutput");
        videoInput.muted =false;
        videoOutput.muted = false;

        $scope.unmuteVisible = false;
        $scope.muteVisible = true;
    }
        // $scope.setting = function(){

        //     modal.style.display = "block";
        // }



    // When the user clicks anywhere outside of the modal, close it




    $(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
        event.preventDefault();
        $(this).ekkoLightbox();
    });


});

// ===========================Whiteboard Controllers================================================

eduscope.controller('colorCon',function($scope, $window) {
    $scope.getRadioColor = function() {

  console.log('fffffffff');
   colorC = document.querySelector(':checked').getAttribute('data-color');
   
   console.log('color changed  to :  '+colorC);

   // send color to server
var colordata = {
  colorS: colorC
}
  console.log('send'+colordata);
   socket.emit('pencolor', colordata);

}
});



//change background image
function drawImage() {
    var image = new Image();
    image.src = 'images/chart paper.png';
    
    image.onload = function () {
       // context.drawImage(image, 0, 0, canvas.width, canvas.height);
        console.log('inside the drawimage')
        cPush();
  
        whitecanvas.setAttribute("style","background-image: url('images/dotedgrid.svg'); background-repeat: no-repeat; height: canvas.height; background-position:center;background-size: cover;");
  
        // canvas.style.background-image = "url('http://prittytimes.com/wp-content/uploads/2016/03/Indipendant-Travel1.jpg')";
        // canvas.style.background-repeat = no-repeat;
        // canvas.style.background-size:contain;
        // canvas.style.height: 100%;
        // canvas.style.width: 100%;
        // canvas.style.background-position:center;
  
  
  
    };    
    
  
  }
  
  
  
  function cPush()
  {
    console.log('cPush');
    cStep++;
    if (cStep < cPushArray.length) { cPushArray.length = cStep; }
    cPushArray.push(document.getElementById('canvas').toDataURL());
    document.title = cStep + ":" + cPushArray.length;
  }

  eduscope.controller('pencilCtrl',function($scope) {
    $scope.pencil = function() {
      console.log('pencil function');
        isEraser = false;
        isHighlighter = false;
        isPensil = true;
      
        whitecanvas.addEventListener('mousedown', dragStart, false);
        whitecanvas.addEventListener('mousemove', drag, false);
        whitecanvas.addEventListener('mouseup', dragStop, false);
        whitecanvas.addEventListener('mouseleave',dragLeave, false);
        
       
      

       function dragStart(event) {
          console.log('drag Start');
          mousePressed = true;
          Draw(event.pageX - whitecanvas.offsetLeft, event.pageY - whitecanvas.offsetTop, false);
          // cPush();


       }

       function drag(event) {
        
        if (mousePressed) {
          Draw(event.pageX - whitecanvas.offsetLeft, event.pageY - whitecanvas.offsetTop, true);

      }
       }

       function dragStop(event) {
        console.log('drag stop');
        mousePressed = false;
        cPush();
       }

       function dragLeave(event){
         console.log('dragLeave');
         mousePressed = false;
        
       }

      

       

       function Draw(x, y, isDown) {
        if (isDown) {

          console.log('asdasd');
          context.beginPath();
          
         
              
              if(isEraser)
                {
                  context.strokeStyle = 'red';
              context.globalCompositeOperation="destination-out";
              console.log('eraser');

              var data = {
                id:'EraserDrawing',
                tool:'eraser',
                x: x,
                y: y,
                lx:lastX,
                ly:lastY
               
              }

              socket.emit('eraser', data);


                }
                else if(isHighlighter)
                  {
                    context.strokeStyle = 'rgba(255,255,0,0.1)'  
                    context.globalCompositeOperation="source-atop"; 
                    var data = {
                      id:'HighlighterDrawing',
                     
                      x: x,
                      y: y,
                      lx:lastX,
                      ly:lastY
                     
                    }
                    socket.emit('Highlighter', data);

                  }
                else if(isPensil){
                  context.strokeStyle = colorC;
                  context.globalCompositeOperation="source-over";
                  console.log('pencil');

                  var data = {
                    id:'PencilDrawing',
                    color:colorC,
                    x: x,
                    y: y,
                    lx:lastX,
                    ly:lastY
                   
                  }
          
                  // name of the message is mouse
                  socket.emit('mouse', data);


                }
              //context.fill();
            
        
          
          context.lineWidth = width;
          context.lineJoin = "round";
          context.moveTo(lastX, lastY)
          context.lineTo(x, y);
          context.closePath();
          context.stroke();
            
         

        }
        lastX = x; lastY = y;
    }
  
  
  }

 

  $scope.eraser = function(){

    console.log('eraser function');
    isPensil = false;
    isEraser = true;
  }

  $scope.highlighter = function(){
    console.log('highlighter function');
    isPensil = false;
    isEraser = false;
    isHighlighter =  true;

  }



  //clear canvas
  $scope.clearArea = function() {
    // Use the identity matrix while clearing the canvas

    if (confirm("Do you need to clear the canvas..?")) {
      console.log('clear ');
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  } else {
      console.log('canceled');
  }
 
  }



});

/////////////////////functions for server response////////////////////////////////


function newDrawing(data)
{
    context.beginPath();
    console.log('new drawing');
    console.log(data.color);

    context.globalCompositeOperation="source-over";
    context.lineJoin = "round";

    context.moveTo(data.lx, data.ly)

    context.lineTo(data.x, data.y);

    context.lineWidth = ServerWidth;
    context.strokeStyle = data.color;
    context.closePath();
    context.stroke();

}

function newColor(data)
{
    console.log('new Color'+data.colorS);
    ServerColor = data.colorS;
}

function newUndoRedo(data)
{
    var bimage = new Image();

    var newcanvasimage = new Image();
    var newcanvasimage =  data.image;
    bimage.src = data.image;
    console.log('image data :'+newcanvasimage);

    //var buffer = new Buffer(newcanvasimage, 'base64');
    var bytes = new Uint8Array(newcanvasimage);
    var blob = new Blob([bytes.buffer],{type:'image/png'});
    var  urlObject = URL.createObjectURL(blob);


    bimage.src = urlObject;

    console.log(bimage);

// var length = data.image;
// var blob = new Blob([data.data],{type:'image/png'});
// var url = URL.createObjectURL(blob);

// var img = new Image();

// img.src = url;

// context.globalCompositeOperation="source-over";
// context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    context.drawImage(bimage, 0, 0);


}

function NewEraser(data)
{
    context.beginPath();
    console.log('inside new eraser'+data);
    context.globalCompositeOperation="destination-out";


    context.lineJoin = "round";
    context.moveTo(data.lx, data.ly)
    context.lineTo(data.x, data.y);
    context.closePath();
    context.stroke();

}

function newHighlighter(data)
{
    console.log('inside new highlighter function');
    context.beginPath();

    context.strokeStyle = 'rgba(255,255,0,0.1)'
    context.globalCompositeOperation="source-atop";


    context.lineJoin = "round";
    context.moveTo(data.lx, data.ly)
    context.lineTo(data.x, data.y);
    context.closePath();
    context.stroke();
}

function newwidthdata(data)
{
    ServerWidth = data.widthS;
    console.log('width is :'+data);
}





//////////////////////////////////////////////////////////////////////////////////////////


eduscope.controller('UndoRedo', function($scope){

    $scope.cUndo = function()
    { 
      
      console.log('undo'+cStep);
      if (cStep > 0) {
        cStep--;
        var canvasPic = new Image();
        canvasPic.src = cPushArray[cStep];
        canvasPic.onload = function () {
          context.globalCompositeOperation="source-over"; 
          context.clearRect(0, 0, context.canvas.width, context.canvas.height); 
          context.drawImage(canvasPic, 0, 0);
          
          getBase64(canvasPic);
    
        }
        document.title = cStep + ":" + cPushArray.length;
    }
    
    }
    
    
    $scope.cRedo = function()
    {
      console.log('redo'+cStep);
      if (cStep < cPushArray.length-1) {
        cStep++;
        var canvasPic = new Image();
        canvasPic.src = cPushArray[cStep];
        canvasPic.onload = function () {
          context.globalCompositeOperation="source-over"; 
          context.clearRect(0, 0, context.canvas.width, context.canvas.height); 
          context.drawImage(canvasPic, 0, 0); console.log('aksjdhkajsdh');
        
        }
        document.title = cStep + ":" + cPushArray.length;
        //console.log('cStep'+cStep+' length'+cPushArray.length);
    
    }
    
    }
    
    
    
    
    });


    function getBase64(canvasPic){
        let urlObject;
       
        console.log(canvasPic);
        //var baseimage = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
       var convertimage = whitecanvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, '');
       //var buffer = new Buffer(convertimage, 'base64');
      //  var bytes = new Uint8Array(convertimage);
      //  var blob = new Blob([bytes.buffer]);
      //  urlObject = URL.createObjectURL(blob);
      // try{
      
      //  bimage.src = convertimage;
      // }
      // catch(error)
      // {
      //   console.log(error);
      // }
      //  console.log(bimage);
      var canvasclick = {
        id: 'undo',
        image:convertimage
      }
      
    //   socket.emit('undoRedo', canvasclick);
      
      }

      eduscope.controller('download',function($scope) {
  
        $scope.downloadCanvas = function()
        {
         console.log("Redy to download the PDF");
     
         var imgData = whitecanvas.toDataURL("image/jpeg", 1.0);
         var pdf = new jsPDF();
       
         pdf.addImage(imgData, 'JPEG', 0, 0);
         pdf.save("download.pdf");
     
        }
     
     });


     //controller for pencil tool
     eduscope.controller('widthCtrler',function($scope, $window){

    //for change color
  
  
    //for change size
    $scope.GetWidth = function (selected) {
      width = $scope.selected;
      console.log('width is ' + width);
  
      var widthdata = {
        widthS: width
      }
  
      socket.emit('penwidth', widthdata);
      
  
    }
  
  });

  eduscope.controller('pencliCtrl',function($scope) {
    $scope.getPencil = function()
    {
      isPensil = true;
      console.log('isPensil=true');
    }
  
  });

  //change the background image
  eduscope.controller('backImage', function($scope){
    $scope.changeBackgroundchart = function()
    {
    console.log('channge background image');
    whitecanvas.setAttribute("style","background-image: url('images/chart paper.png'); background-repeat: no-repeat; height: whitecanvas.height; background-position:center;background-size: cover;");
    }
  
    $scope.changeBackgroundlined = function()
    {
    console.log('channge background image');
    whitecanvas.setAttribute("style","background-image: url('images/dotedgrid.svg'); background-repeat: no-repeat; height: whitecanvas.height; background-position:center;background-size: cover;");
    }
  
    $scope.changeBackgroundsqureblack = function()
    {
    console.log('channge background image');
    whitecanvas.setAttribute("style","background-image: url('images/squrewhite.svg'); background-repeat: no-repeat; height: whitecanvas.height; background-position:center;background-size: cover;");
    }
  
  });




// ==================================================================================================
