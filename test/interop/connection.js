/*
 *  Copyright (c) 2022 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
const {buildDriver} = require('../webdriver');
const {PeerConnection, MediaDevices} = require('../webrtcclient');
const steps = require('../steps');

const browserA = process.env.BROWSER_A || 'chrome';
const browserB = process.env.BROWSER_B || 'chrome';

describe(`basic interop test ${browserA} => ${browserB}`, function() {
    this.retries(3); // retry up to three times.
    let drivers;
    let clients;
    before(async () => {
        const options = {
            version: process.env.BVER || 'stable',
            browserLogging: true,
        }
        drivers = [
            buildDriver(browserA, options),
            buildDriver(browserB, options),
        ];
        clients = drivers.map(driver => {
            return {
                connection: new PeerConnection(driver),
                mediaDevices: new MediaDevices(driver),
            };
        });
    });
    after(async () => {
        await drivers.map(driver => driver.close());
    });

    it('establishes a connection', async () => {
        await Promise.all(drivers); // timeouts in before(Each)?
        await steps.step(drivers, (d) => d.get('https://webrtc.github.io/samples/emptypage.html'), 'Empty page loaded');
        await steps.step(clients, (client) => client.connection.create(), 'Created RTCPeerConnection');
        await steps.step(clients, async (client) => {
            const stream = await client.mediaDevices.getUserMedia({audio: true, video: true});
            return Promise.all(stream.getTracks().map(async track => {
                return client.connection.addTrack(track, stream);
            }));
        }, 'Acquired and added audio/video stream');
        const offerWithCandidates = await clients[0].connection.setLocalDescription();
        await clients[1].connection.setRemoteDescription(offerWithCandidates);
        const answerWithCandidates = await clients[1].connection.setLocalDescription();
        await clients[0].connection.setRemoteDescription(answerWithCandidates);

        await steps.step(drivers, (d) => steps.waitNVideosExist(d, 1), 'Video elements exist');
        await steps.step(drivers, steps.waitAllVideosHaveEnoughData, 'Video elements have enough data');
    }).timeout(30000);
}).timeout(90000);;
