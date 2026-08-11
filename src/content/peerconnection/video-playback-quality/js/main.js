/*
 *  Copyright (c) 2025 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

const callButton = document.getElementById('callButton');
const callSource = document.getElementById('callSource');
const burnControlsContainer = document.getElementById('burnControlsContainer');
const hangupButton = document.getElementById('hangupButton');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const localFpsGraphCanvas = document.getElementById('localFpsGraphCanvas');
const localRmseCanvas = document.getElementById('localRmseCanvas');
const remoteFpsGraphCanvas = document.getElementById('remoteFpsGraphCanvas');
const remoteRmseCanvas = document.getElementById('remoteRmseCanvas');
const oneTimeBurnButton = document.getElementById('oneTimeBurnButton');
const oneTimeBurnSlider = document.getElementById('oneTimeBurnSlider');
const oneTimeBurnValue = document.getElementById('oneTimeBurnValue');
const continuousBurnCheckbox = document.getElementById('continuousBurnCheckbox');
const continuousBurnMeanSlider = document.getElementById('continuousBurnMeanSlider');
const continuousBurnMeanValue = document.getElementById('continuousBurnMeanValue');
const continuousBurnStdDevSlider = document.getElementById('continuousBurnStdDevSlider');
const continuousBurnStdDevValue = document.getElementById('continuousBurnStdDevValue');
const showHarmonicFpsCheckbox = document.getElementById('showHarmonicFpsCheckbox');
const showWebrtcHarmonicFpsCheckbox = document.getElementById('showWebrtcHarmonicFpsCheckbox');
const showJitterMetricCheckbox = document.getElementById('showJitterMetricCheckbox');
const pauseGraphsButton = document.getElementById('pauseGraphsButton');

let localFpsChart, localRmseChart, remoteFpsChart, remoteRmseChart;


let callStartTime;
let oneTimeBurnMs = 0;
let isGraphPaused = false;

const canvasWidth = 640;
const canvasHeight = 360; // 16:9 aspect ratio

[localFpsGraphCanvas, localRmseCanvas, remoteFpsGraphCanvas, remoteRmseCanvas].forEach(canvas => {
  if (canvas) {
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  }
});

const localFpsGraphCtx = localFpsGraphCanvas.getContext('2d');
const localRmseCtx = localRmseCanvas.getContext('2d');
const remoteFpsGraphCtx = remoteFpsGraphCanvas.getContext('2d');
const remoteRmseCtx = remoteRmseCanvas.getContext('2d');

function toRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const unfadedColors = {
  fps: '#007bff',
  presentationHarmonicFps: '#dc3545', // This key maps to "Display Harmonic FPS"
  webrtcHarmonicFps: '#158f00ff',
  rmse: '#fd7e14',
};

const fadedness = 0.4;

const graphColors = {
  ...unfadedColors,
  faded: Object.fromEntries(
    Object.entries(unfadedColors).map(([key, value]) => [key, toRgba(value, fadedness)])
  )
};

const STATS_UPDATE_FREQUENCY_MS = 85;
let GRAPH_TIME_WINDOW_S = 20;
const MAX_GRAPH_TIME_WINDOW_S = 120; // Store up to 2 minutes of data

let localStream;
let peerConnection1;
let peerConnection2;
let worker = null;

let localFpsData = [];
let localHarmonicFpsData = [];
let localRmseData = [];
let localFps5sData = [];
let localHarmonicFps5sData = [];
let localRmse5sData = [];
let remoteFpsData = [];
let remoteHarmonicFpsData = [];
let remoteRmseData = [];
let remoteFps5sData = [];
let remotePresentedHarmonicFps5sData = [];
let remoteRmse5sData = [];
let remoteWebrtcHarmonicFpsData = [];
let remoteWebrtcHarmonicFps5sData = [];

const localVideoStats = {
  data: [localFpsData, localHarmonicFpsData, localRmseData, localFps5sData, localHarmonicFps5sData, localRmse5sData],
  samples: [],
  tickCounter: 0
};
const remoteVideoStats = {
  data: [remoteFpsData, remoteHarmonicFpsData, remoteRmseData, remoteFps5sData, remotePresentedHarmonicFps5sData, remoteRmse5sData,
    remoteWebrtcHarmonicFpsData, remoteWebrtcHarmonicFps5sData],
  samples: [],
  tickCounter: 0
};

const localContexts = [localFpsGraphCtx, localRmseCtx];
const remoteContexts = [remoteFpsGraphCtx, remoteRmseCtx];

let localFpsInterval;
let remoteFpsInterval;

function redrawGraphs() {
  const localFpsDatasets = getFpsDatasets(localFpsData, localHarmonicFpsData, localFps5sData, localHarmonicFps5sData);
  const showJitter = showJitterMetricCheckbox.checked;

  localRmseCanvas.parentElement.style.display = showJitter ? '' : 'none';
  updateChart(localFpsChart, localFpsDatasets);
  if (showJitter) {
    updateChart(localRmseChart, [{ data: localRmseData, label: 'RMSE' }, { data: localRmse5sData, label: 'RMSE (5s)' }]);
  }

  const remoteFpsDatasets = getRemoteFpsDatasets();
  remoteRmseCanvas.parentElement.style.display = showJitter ? '' : 'none';
  updateChart(remoteFpsChart, remoteFpsDatasets);
  if (showJitter) {
    updateChart(remoteRmseChart, [{ data: remoteRmseData, label: 'RMSE' }, { data: remoteRmse5sData, label: 'RMSE (5s)' }]);
  }
}

function getFpsDatasets(fps, harmonicFps, fps5s, harmonicFps5s) {
  const datasets = [
    { data: fps, label: 'FPS' },
    { data: fps5s, label: 'FPS (5s)' }
  ];
  if (showHarmonicFpsCheckbox.checked) {
    datasets.push({ data: harmonicFps, label: 'Display Harmonic FPS' });
    datasets.push({ data: harmonicFps5s, label: 'Display Harmonic FPS (5s)' });
  }
  return datasets;
}

function getRemoteFpsDatasets() {
  const datasets = [
    { data: remoteFpsData, label: 'FPS' },
    { data: remoteFps5sData, label: 'FPS (5s)' }
  ];
  if (showHarmonicFpsCheckbox.checked) {
    datasets.push({ data: remoteHarmonicFpsData, label: 'Display Harmonic FPS' });
    datasets.push({ data: remotePresentedHarmonicFps5sData, label: 'Display Harmonic FPS (5s)' });
  }
  if (showWebrtcHarmonicFpsCheckbox.checked) {
    datasets.push({ data: remoteWebrtcHarmonicFpsData, label: 'WebRTC Harmonic FPS' });
    datasets.push({ data: remoteWebrtcHarmonicFps5sData, label: 'WebRTC Harmonic FPS (5s)' });
  }
  return datasets;
}

function toggleBurnControls() {
  const isScreenshare = callSource.value === 'screenshare';
  burnControlsContainer.disabled = isScreenshare;
}

window.addEventListener('load', () => {
  redrawGraphs();
  oneTimeBurnSlider.addEventListener('input', (e) => {
    oneTimeBurnValue.textContent = e.target.value;
  });
  oneTimeBurnButton.addEventListener('click', () => {
    if (worker) {
      worker.postMessage({
        type: 'update',
        burnOptions: {
          oneTimeBurnMs: parseInt(oneTimeBurnSlider.value, 10),
          continuousBurn: continuousBurnCheckbox.checked,
          continuousBurnMean: parseInt(continuousBurnMeanSlider.value, 10),
          continuousBurnStdDev: parseInt(continuousBurnStdDevSlider.value, 10),
        }
      });
    }
  });

  const updateContinuousBurn = () => {
    if (worker) {
      worker.postMessage({
        type: 'update',
        burnOptions: {
          oneTimeBurnMs: 0,
          continuousBurn: continuousBurnCheckbox.checked,
          continuousBurnMean: parseInt(continuousBurnMeanSlider.value, 10),
          continuousBurnStdDev: parseInt(continuousBurnStdDevSlider.value, 10),
        }
      });
    }
  };

  continuousBurnCheckbox.addEventListener('change', updateContinuousBurn);
  continuousBurnMeanSlider.addEventListener('input', (e) => {
    continuousBurnMeanValue.textContent = e.target.value;
    updateContinuousBurn();
  });

  continuousBurnStdDevSlider.addEventListener('input', (e) => {
    continuousBurnStdDevValue.textContent = e.target.value;
    updateContinuousBurn();
  });

  showHarmonicFpsCheckbox.addEventListener('change', () => {
    redrawGraphs();
  });

  showWebrtcHarmonicFpsCheckbox.addEventListener('change', () => {
    redrawGraphs();
  });

  showJitterMetricCheckbox.addEventListener('change', () => {
    redrawGraphs();
  });

  pauseGraphsButton.addEventListener('click', () => {
    isGraphPaused = !isGraphPaused;
    pauseGraphsButton.textContent = isGraphPaused ? 'Resume Graphs' : 'Pause Graphs';
  });

  callSource.addEventListener('change', toggleBurnControls);

  localFpsChart = createChart(localFpsGraphCanvas, 'FPS', 'Time (s)');
  localRmseChart = createChart(localRmseCanvas, 'RMSE', 'Time (s)');
  remoteFpsChart = createChart(remoteFpsGraphCanvas, 'FPS', 'Time (s)');
  remoteRmseChart = createChart(remoteRmseCanvas, 'RMSE', 'Time (s)');

  const canvases = [localFpsGraphCanvas, localRmseCanvas, remoteFpsGraphCanvas, remoteRmseCanvas];
  canvases.forEach(canvas => {
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = 1.1;
      if (e.deltaY < 0) { // scroll up, zoom in
        GRAPH_TIME_WINDOW_S = Math.max(1, GRAPH_TIME_WINDOW_S / zoomFactor);
      } else { // scroll down, zoom out
        GRAPH_TIME_WINDOW_S = Math.min(MAX_GRAPH_TIME_WINDOW_S, GRAPH_TIME_WINDOW_S * zoomFactor);
      }

      if (isGraphPaused) {
        // While paused, the graphs don't auto-update their range, so we need to
        // manually adjust the x-axis and redraw.
        const center = (localFpsChart.options.scales.x.min + localFpsChart.options.scales.x.max) / 2;
        const halfWindow = (GRAPH_TIME_WINDOW_S * 1000) / 2;
        [localFpsChart, localRmseChart, remoteFpsChart, remoteRmseChart].forEach(chart => {
          if (chart) {
            chart.options.scales.x.min = center - halfWindow;
            chart.options.scales.x.max = center + halfWindow;
          }
        });
        redrawGraphs();
      }
    });
  });
  redrawGraphs();
  callButton.addEventListener('click', call);
  hangupButton.addEventListener('click', hangup);
});


async function call() {
  callStartTime = performance.now();
  try {
    let stream;
    const source = callSource.value;

    if (source === 'screenshare') {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.applyConstraints({
        frameRate: { ideal: 30, min: 0 }
      })
    } else { // camera
      const constraints = {
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    }
    callButton.disabled = true;
    callSource.disabled = true;
    hangupButton.disabled = false;

    if (source === 'screenshare') {
      localStream = stream;
    } else {
      const videoTrack = stream.getVideoTracks()[0];
      const trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
      const trackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });

      worker = new Worker('js/worker.js');
      const { readable } = trackProcessor;
      const { writable } = trackGenerator;
      worker.postMessage({ type: 'init', readable, writable }, [readable, writable]);

      localStream = new MediaStream([trackGenerator]);
    }
    localVideo.srcObject = localStream;

    localVideo.onloadedmetadata = () => {
      localFpsInterval = startStatsTracking(localVideo, localVideoStats, localContexts, null);
    };

    const configuration = {};
    peerConnection1 = new RTCPeerConnection(configuration);
    peerConnection2 = new RTCPeerConnection(configuration);

    peerConnection1.onicecandidate = e => onIceCandidate(peerConnection1, e);
    peerConnection2.onicecandidate = e => onIceCandidate(peerConnection2, e);

    peerConnection2.ontrack = gotRemoteStream;

    const transceiver = peerConnection1.addTransceiver(localStream.getVideoTracks()[0], { streams: [localStream] });
    const capabilities = RTCRtpSender.getCapabilities('video');
    if (capabilities && capabilities.codecs) {
      const av1Codecs = capabilities.codecs.filter(codec => /av1/i.test(codec.mimeType));
      if (av1Codecs.length > 0) {
        console.log('Setting AV1 as preferred codec');
        transceiver.setCodecPreferences(av1Codecs);
      }
    }

    const offer = await peerConnection1.createOffer();
    await peerConnection1.setLocalDescription(offer);

    await peerConnection2.setRemoteDescription(offer);

    const answer = await peerConnection2.createAnswer();
    await peerConnection2.setLocalDescription(answer);

    await peerConnection1.setRemoteDescription(answer);

  } catch (error) {
    console.error('Error starting call:', error);
  }
}

function calculateUint32Difference(currentValue, previousValue) {
  const c = currentValue >>> 0;
  const p = previousValue >>> 0;
  return (c - p) >>> 0;
}

function startStatsTracking(video, stats, contexts, pc) {
  const maxDataPoints = (MAX_GRAPH_TIME_WINDOW_S * 1000) / STATS_UPDATE_FREQUENCY_MS;
  stats.tickCounter = 0;
  return setInterval(async () => {
    stats.tickCounter++;
    const now = performance.now(); //
    const quality = video.getVideoPlaybackQuality();

    const sample = {
      timestamp: now,
      totalVideoFrames: quality.totalVideoFrames,
      droppedVideoFrames: quality.droppedVideoFrames,
      corruptedVideoFrames: quality.corruptedVideoFrames,
      presentationErrorSquaredSum: quality.presentationErrorSquaredSum,
      presentedFrameDurationSum: quality.presentedFrameDurationSum,
      presentedFrameDurationSquaredSum: quality.presentedFrameDurationSquaredSum,
      rtpPresentationErrorSquaredSum: quality.rtpPresentationErrorSquaredSum,
    };

    if (pc) {
      const report = await pc.getStats();
      report.forEach(stat => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
          sample.totalInterFrameDelay = stat.totalInterFrameDelay;
          sample.totalSquaredInterFrameDelay = stat.totalSquaredInterFrameDelay;
        }
      });
    }

    stats.samples.push(sample);
    if (stats.samples.length > maxDataPoints) {
      stats.samples.shift();
    }

    const getSampleFromAgo = (ms) => {
      const target = now - ms;
      return stats.samples.find(s => s.timestamp >= target) || stats.samples[0];
    };

    const calculateMetrics = (current, previous) => {
      if (!previous) return [0, 0, 0, 0];
 
      const timeDiff = current.timestamp - previous.timestamp;
      if (timeDiff <= 0) return [0, 0, 0];

      const currentDisplayed = current.totalVideoFrames - current.droppedVideoFrames - current.corruptedVideoFrames;
      const previousDisplayed = previous.totalVideoFrames - previous.droppedVideoFrames - previous.corruptedVideoFrames;
      const framesDisplayed = currentDisplayed - previousDisplayed;

      const fps = (framesDisplayed / timeDiff) * 1000;

      let rmse = 0;
      if (current.rtpPresentationErrorSquaredSum) {
        const rtpDiff = calculateUint32Difference(current.rtpPresentationErrorSquaredSum, previous.rtpPresentationErrorSquaredSum);
        const displayedFramesIncrease = Math.max(1, framesDisplayed);
        rmse = Math.sqrt(rtpDiff / displayedFramesIncrease);
      } else {
        const presentationErrorSquaredSumIncrease = calculateUint32Difference(current.presentationErrorSquaredSum, previous.presentationErrorSquaredSum);
        const displayedFramesIncrease = Math.max(1, framesDisplayed);
        rmse = Math.sqrt(presentationErrorSquaredSumIncrease / displayedFramesIncrease);
      }

      let presentedHarmonicFps = 0;
      if (current.presentedFrameDurationSum && current.presentedFrameDurationSquaredSum) {
        const presentedFrameDurationSumIncrease = calculateUint32Difference(current.presentedFrameDurationSum, previous.presentedFrameDurationSum);
        const presentedFrameDurationSquaredSumIncrease = calculateUint32Difference(current.presentedFrameDurationSquaredSum, previous.presentedFrameDurationSquaredSum);

        if (presentedFrameDurationSquaredSumIncrease > 0) {
          presentedHarmonicFps = (presentedFrameDurationSumIncrease / presentedFrameDurationSquaredSumIncrease) * 1000;
        }
      }

      let webrtcHarmonicFps = 0;
      if (current.totalInterFrameDelay && current.totalSquaredInterFrameDelay && previous.totalInterFrameDelay && previous.totalSquaredInterFrameDelay) {
        const interFrameDelaySumIncrease = current.totalInterFrameDelay - previous.totalInterFrameDelay;
        const squaredInterFrameDelaySumIncrease = current.totalSquaredInterFrameDelay - previous.totalSquaredInterFrameDelay;

        if (squaredInterFrameDelaySumIncrease > 0) {
          webrtcHarmonicFps = interFrameDelaySumIncrease / squaredInterFrameDelaySumIncrease;
        }
      }
      return [fps, presentedHarmonicFps, webrtcHarmonicFps, rmse];
    };

    const sample1sAgo = getSampleFromAgo(1000);
    const sample5sAgo = getSampleFromAgo(5000);

    const [fps1s, presentedHarmonicFps1s, webrtcHarmonicFps1s, rmse1s] = calculateMetrics(sample, sample1sAgo);
    const [fps5s, presentedHarmonicFps5s, webrtcHarmonicFps5s, rmse5s] = calculateMetrics(sample, sample5sAgo);

    const allNewValues = [fps1s, presentedHarmonicFps1s, rmse1s, fps5s, presentedHarmonicFps5s, rmse5s, webrtcHarmonicFps1s, webrtcHarmonicFps5s];
    stats.data.forEach((dataArray, i) => {
      dataArray.push({ x: sample.timestamp, y: allNewValues[i] });
      if (dataArray.length > maxDataPoints) {
        dataArray.shift();
      }
    });

    let fpsDatasets;
    if (pc) { // remote
      fpsDatasets = getRemoteFpsDatasets();
    } else { // local
      fpsDatasets = getFpsDatasets(stats.data[0], stats.data[1], stats.data[3], stats.data[4]);
    }
    updateChart(contexts[0] === localFpsGraphCtx ? localFpsChart : remoteFpsChart, fpsDatasets);
    const showJitter = showJitterMetricCheckbox.checked;
    if (showJitter) {
      updateChart(contexts[1] === localRmseCtx ? localRmseChart : remoteRmseChart, [{ data: stats.data[2], label: 'RMSE' }, { data: stats.data[5], label: 'RMSE (5s)' }]);
    }
  }, STATS_UPDATE_FREQUENCY_MS);
}

function createChart(canvas, label, xLabel) {
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: { datasets: [] },
    options: {
      animation: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: xLabel
          },
          ticks: {
            callback: function(value, index, values) {
              if (!callStartTime) {
                return '0s';
              }
              const secondsSinceCall = (value - callStartTime) / 1000;
              return `${secondsSinceCall.toFixed(0)}s`;
            }
          }
        },
        y: {
          title: {
            display: true,
            text: label
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true
          }
        }
      }
    }
  });
}

function updateChart(chart, datasets) {
  if (!chart) return;

  chart.data.datasets = datasets.map(dataset => ({
    label: dataset.label,
    data: [...dataset.data],
    borderColor: getColorForLabel(dataset.label),
    backgroundColor: getColorForLabel(dataset.label),
    fill: false,
    tension: 0.4,    
    borderWidth: 1,
    pointRadius: 0
  }));

  if (!isGraphPaused) {
    const now = performance.now();
    chart.options.scales.x.min = now - (GRAPH_TIME_WINDOW_S * 1000);
    chart.options.scales.x.max = now;
  }

  chart.update();

}

const getColorForLabel = (label) => {
  if (label.includes('WebRTC Harmonic FPS (5s)')) return graphColors.webrtcHarmonicFps;
  if (label.includes('WebRTC Harmonic FPS')) return graphColors.faded.webrtcHarmonicFps;
  if (label.includes('Display Harmonic FPS (5s)')) return graphColors.presentationHarmonicFps;
  if (label.includes('Display Harmonic FPS')) return graphColors.faded.presentationHarmonicFps;
  if (label.includes('FPS (5s)')) return graphColors.fps;
  if (label.includes('FPS')) return graphColors.faded.fps;
  if (label.includes('(5s)')) return graphColors.rmse;
  if (label.includes('RMSE')) return graphColors.faded.rmse;
  return '#333';
};

function onIceCandidate(pc, event) {
  if (event.candidate) {
    const otherPeer = (pc === peerConnection1) ? peerConnection2 : peerConnection1;
    otherPeer.addIceCandidate(event.candidate);
  }
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
  }
  if (remoteFpsInterval) {
    clearInterval(remoteFpsInterval);
    remoteFpsInterval = null;
  }
  remoteFpsInterval = startStatsTracking(remoteVideo, remoteVideoStats, remoteContexts, peerConnection2);
}

function hangup() {
  if (peerConnection1) {
    peerConnection1.close();
    peerConnection1 = null;
  }
  if (peerConnection2) {
    peerConnection2.close();
    peerConnection2 = null;
  }

  if (worker) {
    worker.terminate();
    worker = null;
  }

  localVideo.srcObject = null;
  remoteVideo.srcObject = null;

  hangupButton.disabled = true;
  callButton.disabled = false;
  callSource.disabled = false;

  clearInterval(localFpsInterval);
  clearInterval(remoteFpsInterval);
  localFpsInterval = null;
  remoteFpsInterval = null;

  // This ensures that the references held by localVideoStats.data
  // and remoteVideoStats.data remain valid.
  localFpsData.length = 0;
  localHarmonicFpsData.length = 0;
  localRmseData.length = 0;
  localFps5sData.length = 0;
  localHarmonicFps5sData.length = 0;
  localRmse5sData.length = 0;
  remoteFpsData.length = 0;
  remoteHarmonicFpsData.length = 0;
  remoteRmseData.length = 0;
  remoteFps5sData.length = 0;
  remotePresentedHarmonicFps5sData.length = 0;
  remoteRmse5sData.length = 0;
  remoteWebrtcHarmonicFpsData.length = 0;
  remoteWebrtcHarmonicFps5sData.length = 0;
  
  // These are properties, so direct assignment is fine (or .length = 0)
  localVideoStats.samples = [];
  remoteVideoStats.samples = [];

  localVideoStats.tickCounter = 0;
  remoteVideoStats.tickCounter = 0;
  callStartTime = undefined;

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  redrawGraphs();
}
