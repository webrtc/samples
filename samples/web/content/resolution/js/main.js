var vgaButton = document.querySelector("button#vga");
var qvgaButton = document.querySelector("button#qvga");
var hdButton = document.querySelector("button#hd");
var dimensions = document.querySelector("p#dimensions");
var video = document.querySelector("video");
var stream;

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

function successCallback(stream) {
  window.stream = stream; // stream available to console
  video.src = window.URL.createObjectURL(stream);
}

function errorCallback(error){
  console.log("navigator.getUserMedia error: ", error);
}

function displayVideoDimensions() {
  dimensions.innerHTML = "Actual video dimensions: " + video.videoWidth +
    "x" + video.videoHeight + 'px.';
}

video.addEventListener('play', function(){
  setTimeout(function(){
    displayVideoDimensions();
  }, 500);
});

var qvgaConstraints  = {
  video: {
    mandatory: {
      maxWidth: 320,
      maxHeight: 180
    }
  }
};

var vgaConstraints  = {
  video: {
    mandatory: {
      maxWidth: 640,
      maxHeight: 360
    }
  }
};

var hdConstraints  = {
  video: {
    mandatory: {
      minWidth: 1280,
      minHeight: 720
    }
  }
};

qvgaButton.onclick = function(){getMedia(qvgaConstraints)};
vgaButton.onclick = function(){getMedia(vgaConstraints)};
hdButton.onclick = function(){getMedia(hdConstraints)};

function getMedia(constraints){
  if (!!stream) {
    video.src = null;
    stream.stop();
  }
  navigator.getUserMedia(constraints, successCallback, errorCallback);
}

