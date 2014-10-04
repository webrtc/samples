WebRTCTest

.testsuite(
  'Connectivity',
  'Tests TCP and UDP connectivity to TURN'
)

.helper({
  CEOD_URL:('https://computeengineondemand.appspot.com/turn?' +
                'username=1234&key=5678')
})

.test('udpConnectivityTest',function(t, h){
   h.asyncCreateTurnConfig(
      t, h, h.CEOD_URL,
      function(config) {
        h.filterConfig(config, 'udp');
        h.gatherCandidates(t, h, config, null, h.checkRelay);
      },
      t.fail);
})

.test('tcpConnectivityTest',function(t, h){
   h.asyncCreateTurnConfig(
      t, h, h.CEOD_URL,
      function(config) {
        h.filterConfig(config, 'tcp');
        h.gatherCandidates(t, h, config, null, h.checkRelay);
      },
      t.fail);
})

.test('hasIpv6Test', function(t,h){
  var params = { optional: [ { googIPv6: true } ] };
  h.gatherCandidates(t, h, null, params, h.checkIpv6);
})


// Ask computeengineondemand to give us TURN server credentials and URIs.
.helper('asyncCreateTurnConfig', function (t, h, url, onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  function onResult() {
    if (xhr.readyState != 4)
      return;

    if (xhr.status != 200) {
      onError('TURN request failed');
      return;
    }

    var response = JSON.parse(xhr.responseText);
    var iceServer = {
      'username': response.username,
      'credential': response.password,
      'urls': response.uris
    };
    onSuccess({ 'iceServers': [ iceServer ] });
  }

  xhr.onreadystatechange = onResult;
  xhr.open('GET', url, true);
  xhr.send();
})

.helper('filterConfig', function(config, protocol) {
  var transport = 'transport=' + protocol;
  for (var i = 0; i < config.iceServers.length; ++i) {
    var iceServer = config.iceServers[i];
    var newUrls = [];
    for (var j = 0; j < iceServer.urls.length; ++j) {
      if (iceServer.urls[j].indexOf(transport) !== -1) {
        newUrls.push(iceServer.urls[j]);
      }
    }
    iceServer.urls = newUrls;
  }
})

.helper('checkRelay', function(c) {
  return c.type === 'relay';
})

.helper('checkIpv6', function(c) {
  return (c.address.indexOf(':') !== -1);
})

.helper('gatherCandidates', function (t, h, opt_config, opt_params, isGood) {
  var pc = new RTCPeerConnection(opt_config, opt_params);

  // In our candidate callback, stop if we get a candidate that passes |isGood|.
  pc.onicecandidate = function(e) {
    // Once we've decided, ignore future callbacks.
    if (pc.signalingState === 'closed')
      return;

    if (e.candidate) {
      var parsed = WebRTCCall.prototype.parseCandidate(e.candidate.candidate);
      if (isGood(parsed)) {
        t.success('Gathered candidate with type: ' + parsed.type +
                      ' address: ' + parsed.address);
        pc.close();
        t.complete();
      }
    } else {
      pc.close();
      t.fail('Failed to gather specified candidates');
      t.complete();
    }

  };

  // Create an audio-only, recvonly offer, and setLD with it.
  // This will trigger candidate gathering.
  var createOfferParams = { mandatory: { OfferToReceiveAudio: true } };
  var noop = function(){}
  pc.createOffer(function(offer) { pc.setLocalDescription(offer, noop, noop); },
                 noop, createOfferParams);
})
