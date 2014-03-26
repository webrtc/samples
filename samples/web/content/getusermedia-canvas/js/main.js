// variables in global scope so available to console
button = document.querySelector("button");
video = document.querySelector("video");
canvas = document.querySelector("canvas");

canvas.width = 480;
canvas.height = 360;

button.onclick = function(){
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var constraints = {audio: false, video: true};
var video = document.querySelector("video");

function successCallback(stream){
  window.stream = stream; // stream available to console
  if (window.URL) {
    video.src = window.URL.createObjectURL(stream);
  } else {
    video.src = stream;
  }
}

function errorCallback(error){
  console.log("navigator.getUserMedia error: ", error);
}

navigator.getUserMedia(constraints, successCallback, errorCallback);

