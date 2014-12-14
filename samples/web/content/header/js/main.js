'use strict';


var header = document.querySelector('header');

function showHeader() {
  if (!header.classList.contains('active')) {
    header.classList.add('active');
    setTimeout(function() {
      header.classList.remove('active');
    }, 5000);
  }
}

document.body.onmousemove = showHeader;
