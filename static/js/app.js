var app = angular.module("app", []);

var color; //to change line color
var width = 5; //to change line width
var isPensil = false;
var isEraser = false;
var isHighlighter = false;
var canvas,
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

//socket connection

var socket;
socket = io.connect('http://localhost:8443');
socket.on('mouse', newDrawing);
socket.on('pencolor',newColor);
socket.on('undoRedo', newUndoRedo);
socket.on('eraser', NewEraser);
socket.on('Highlighter', newHighlighter);
socket.on('penwidth', newwidthdata);


app.controller('mainCtrl',function($scope) {
  $scope.init = function() {

    canvas = document.getElementById("canvas");
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
    


    console.log(colorC);
    //console.log(colorSelect);
          // Fill Window Width and Height
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;

          drawImage(); 

        

        context = canvas.getContext('2d');
        context.strokeStyle = colorC;
        context.lineWidth = width;
        context.linecape = 'round';
        context.Opacity='0.005';

        
       

  }
});


//colorSelect.addEventListener("click", getRadioColor );
//addEventListener('click', getRadioColor, false);

  app.controller('colorCon',function($scope, $window) {
    $scope.getRadioColor = function() {

  console.log('fffffffff');
   colorC = document.querySelector(':checked').getAttribute('data-color');
   console.log('color changed  to :  '+colorC);

   //send color to server
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

      canvas.setAttribute("style","background-image: url('images/dotedgrid.svg'); background-repeat: no-repeat; height: canvas.height; background-position:center;background-size: cover;");

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



  app.controller('pencilCtrl',function($scope) {
    $scope.pencil = function() {
      console.log('pencil function');
        isEraser = false;
        isHighlighter = false;
        isPensil = true;
      
        canvas.addEventListener('mousedown', dragStart, false);
        canvas.addEventListener('mousemove', drag, false);
        canvas.addEventListener('mouseup', dragStop, false);
        canvas.addEventListener('mouseleave',dragLeave, false);
        
       
      

       function dragStart(event) {
          console.log('drag Start');
          mousePressed = true;
          Draw(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop, false);
          // cPush();


       }

       function drag(event) {
        
        if (mousePressed) {
          Draw(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop, true);

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
          
                  //name of the message is mouse 
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

//undo redo function

app.controller('UndoRedo', function($scope){

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
 var convertimage = canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, '');
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

socket.emit('undoRedo', canvasclick);

}

app.controller('download',function($scope) {
  
     $scope.downloadCanvas = function()
     {
      console.log("Redy to download the PDF");
  
      var imgData = canvas.toDataURL("image/jpeg", 1.0);
      var pdf = new jsPDF();
    
      pdf.addImage(imgData, 'JPEG', 0, 0);
      pdf.save("download.pdf");
  
     }
  
  });


//controller for pencil tool
app.controller('widthCtrler',function($scope, $window){

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

app.controller('pencliCtrl',function($scope) {
  $scope.getPencil = function()
  {
    isPensil = true;
    console.log('isPensil=true');
  }

});


//change the background image
app.controller('backImage', function($scope){
  $scope.changeBackgroundchart = function()
  {
  console.log('channge background image');
  canvas.setAttribute("style","background-image: url('images/chart paper.png'); background-repeat: no-repeat; height: canvas.height; background-position:center;background-size: cover;");
  }

  $scope.changeBackgroundlined = function()
  {
  console.log('channge background image');
  canvas.setAttribute("style","background-image: url('images/dotedgrid.svg'); background-repeat: no-repeat; height: canvas.height; background-position:center;background-size: cover;");
  }

  $scope.changeBackgroundsqureblack = function()
  {
  console.log('channge background image');
  canvas.setAttribute("style","background-image: url('images/squrewhite.svg'); background-repeat: no-repeat; height: canvas.height; background-position:center;background-size: cover;");
  }

});



