
'use strict';

class WebGPUWorker {
    constructor() {
        this.worker_ = null;
        this.worker2_ = null;
        this.offscreen_ = null;
        this.screencanvas_ = null;
        this.offscreen2_ = null;
        this.screencanvas2_ = null;
    }

    async init() {
        console.log('[WebGPUWorker] Initializing WebGPUWorkers.');
        this.screencanvas_ = document.createElement('canvas');
        const screenCanvas = this.screencanvas_;
        document.getElementById('outputVideo').append(screenCanvas);
        const offScreen = screenCanvas.transferControlToOffscreen();
        this.offscreen_ = offScreen;

        this.screencanvas2_ = document.createElement('canvas');
        const screenCanvas2 = this.screencanvas2_;
        document.getElementById('gumOutputVideo').append(screenCanvas2);
        const offScreen2 = screenCanvas2.transferControlToOffscreen();
        this.offscreen2_ = offScreen2;
        this.worker_ = new Worker("./js/worker.js");
        this.worker2_ = new Worker("./js/worker.js");
        this.worker_.postMessage(
            {
                operation: 'init',
                canvas: offScreen,
            }, [offScreen]);
        this.worker2_.postMessage(
            {
                operation: 'init',
                canvas: offScreen2,
            }, [offScreen2]);
    }

    async transform(frame, frame2) {
        if(frame){
            this.worker_.postMessage(
                {
                    operation: 'transform',
                    frame: frame,
                    number: 1,
                }, [frame]);
            
        }
        if(frame2){
            this.worker2_.postMessage(
                {
                    operation: 'transform',
                    frame: frame2,
                    number: 2,
                }, [frame2]);

        }
    }

    async destroy() {
        console.log('[WebGPUWorker] Forcing WebGPU context to be lost.');
        this.worker_.postMessage(
            {
                operation: 'destroy',
            });
        this.worker2_.postMessage(
            {
                operation: 'destroy',
            });

        if (this.screencanvas_.parentNode) {
            this.screencanvas_.parentNode.removeChild(this.screencanvas_);
        }
        if (this.screencanvas2_.parentNode) {
            this.screencanvas2_.parentNode.removeChild(this.screencanvas2_);
        }
    }
}
