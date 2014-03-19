navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var constraints = {audio: false, video: true};
var video = document.querySelector("video");

function successCallback(stream) {
  window.stream = stream; // stream available to console
  if (window.URL) {
    video.src = window.URL.createObjectURL(stream);
  } else {
    video.src = stream;
  }
  video.play();
}

function errorCallback(error){
  console.log("navigator.getUserMedia error: ", error);
}

navigator.getUserMedia(constraints, successCallback, errorCallback);

var button = document.querySelector("button");
var video = document.querySelector("video");
var canvas = document.querySelector("canvas");
canvas.width = 480;
canvas.height = 360;

button.onclick = function snap() {
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
}
