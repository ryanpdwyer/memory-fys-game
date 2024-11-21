// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


let handLandmarker = undefined;

const HAND_CONNECTIONS = [
    {start: 0, end: 1}, {start: 1, end: 2}, {start: 2, end: 3}, {start: 3, end: 4},           // thumb
    {start: 0, end: 5}, {start: 5, end: 6}, {start: 6, end: 7}, {start: 7, end: 8},           // index finger
    {start: 5, end: 9}, {start: 9, end: 10}, {start: 10, end: 11}, {start: 11, end: 12},      // middle finger
    {start: 9, end: 13}, {start: 13, end: 14}, {start: 14, end: 15}, {start: 15, end: 16},    // ring finger
    {start: 13, end: 17}, {start: 0, end: 17}, {start: 17, end: 18}, {start: 18, end: 19}, {start: 19, end: 20}  // pinky
  ];

let runningMode = "VIDEO";
/**
 * @type {HTMLButtonElement}
 */
let enableWebcamButton;

/**
 * @type {boolean}
 */
let webcamRunning = false;

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 2
  });
};



/********************************************************************
// Demo 2: Continuously grab image from webcam stream and detect it.
********************************************************************/

class WebcamPredictor extends EventTarget {
  constructor(config) {
    super();

    if (!handLandmarker) {
      createHandLandmarker();
    }
    
    // Generate unique instance ID
    this.instanceId = Math.random().toString(36).substring(2, 9);
    
    // Internal state
    this.webcamRunning = false;
    this.lastVideoTime = -1;
    this.results = undefined;
    this.runningMode = "IMAGE";
    
    this.config = config;

    // Add scoped styles
    this.addStyles();
    
    // Create and initialize DOM elements
    this.createDOMElements();

        
    // Bind methods
    this.enableCam = this.enableCam.bind(this);
    this.predictWebcam = this.predictWebcam.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  addStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      #liveView-${this.instanceId} {
      font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      font-weight: 400;
      color: #000000;
      background-color: #ffffff;
      }

      #liveView-${this.instanceId} .videoView {
      position: relative;
      width: 48%;
      margin: 2% 1%;
      display: inline-block;
      cursor: pointer;
      }

      #liveView-${this.instanceId} video {
      clear: both;
      display: block;
      transform: rotateY(180deg);
      -webkit-transform: rotateY(180deg);
      -moz-transform: rotateY(180deg);
      }

      #liveView-${this.instanceId} .output_canvas {
      transform: rotateY(180deg);
      -webkit-transform: rotateY(180deg);
      -moz-transform: rotateY(180deg);
      z-index: 1;
      position: absolute;
      pointer-events: none;
      }

      #liveView-${this.instanceId} button {
      border-radius: 8px;
      border: 1px solid transparent;
      padding: 0.6em 1.2em;
      font-size: 1em;
      font-weight: 500;
      font-family: inherit;
      background-color: #ffffff;
      cursor: pointer;
      transition: border-color 0.25s;
      color: #000000;
      }

      #liveView-${this.instanceId} button:hover {
      border-color: #646cff;
      }

      #liveView-${this.instanceId} button:focus,
      #liveView-${this.instanceId} button:focus-visible {
      outline: 4px auto -webkit-focus-ring-color;
      }

      @media (prefers-color-scheme: light) {
      #liveView-${this.instanceId} {
        color: #000000;
      }
      
      #liveView-${this.instanceId} button {
        background-color: #ffffff;
        color: #000000;
      }
      }

      #liveView-${this.instanceId} .videoView p {
      position: absolute;
      padding: 5px;
      background-color: #007f8b;
      color: #000000;
      border: 1px dashed rgba(0, 0, 0, 0.7);
      z-index: 2;
      font-size: 12px;
      margin: 0;
      }

      #liveView-${this.instanceId} .highlighter {
      background: rgba(0, 255, 0, 0.25);
      border: 1px dashed #000000;
      z-index: 1;
      position: absolute;
      }

      #liveView-${this.instanceId} .removed {
      display: none;
      }

      #liveView-${this.instanceId} .invisible {
      opacity: 0.2;
      }
    `;
    document.head.appendChild(styleElement);
    this.styleElement = styleElement;
  }
  
  createDOMElements() {
    // Create main container
    this.liveView = document.createElement('div');
    this.liveView.className = 'videoView';
    this.liveView.id = `liveView-${this.instanceId}`;
    
    // Create button
    this.enableWebcamButton = document.createElement('button');
    this.enableWebcamButton.id = `webcamButton-${this.instanceId}`;
    this.enableWebcamButton.className = 'mdc-button mdc-button--raised';
    
    // Create button inner elements
    const ripple = document.createElement('span');
    ripple.className = 'mdc-button__ripple';
    
    const label = document.createElement('span');
    label.className = 'mdc-button__label';
    label.textContent = 'ENABLE WEBCAM';
    
    this.enableWebcamButton.appendChild(ripple);
    this.enableWebcamButton.appendChild(label);
    
    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.style.position = 'relative';
    
    // Create video element
    this.video = document.createElement('video');
    this.video.id = `webcam-${this.instanceId}`;
    this.video.autoplay = true;
    this.video.playsinline = true;
    this.video.width = this.config.videoWidth || 320;  // Default to 320 if not specified
    this.video.height = this.config.videoHeight || 240; // Default to 240 if not specified

    // Create canvas element
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.id = `output_canvas-${this.instanceId}`;
    this.canvasElement.className = 'output_canvas';
    this.canvasElement.width = this.config.videoWidth || 320;
    this.canvasElement.height = this.config.videoHeight || 240;

    // Position canvas over video
    this.canvasElement.style.position = 'absolute';
    this.canvasElement.style.left = '0px';
    this.canvasElement.style.top = '0px';
    this.canvasElement.style.width = `${this.config.videoWidth || 320}px`;
    this.canvasElement.style.height = `${this.config.videoHeight || 240}px`;


    // Get canvas context
    this.canvasCtx = this.canvasElement.getContext("2d");

    this.du = new DrawingUtils(this.canvasCtx);
    
    // Assemble the elements
    videoContainer.appendChild(this.video);
    videoContainer.appendChild(this.canvasElement);
    
    this.liveView.appendChild(this.enableWebcamButton);
    this.liveView.appendChild(videoContainer);
    
    // Add to specified container
    this.config.containerElement.appendChild(this.liveView);
  }
  
  initialize() {
    if (this.hasGetUserMedia()) {
      this.enableWebcamButton.addEventListener("click", this.enableCam);
    } else {
      console.warn("getUserMedia() is not supported by your browser");
      this.dispatchEvent(new CustomEvent('error', { 
        detail: new Error("getUserMedia() is not supported by your browser") 
      }));
    }
  }
  
  hasGetUserMedia() {
    return !!navigator.mediaDevices?.getUserMedia;
  }
  
  async enableCam(event) {
    if (!handLandmarker) {
        console.log("Wait! objectDetector not loaded yet.");
        return;
    }
    this.handLandmarker = handLandmarker;
    
    this.webcamRunning = !this.webcamRunning;
    this.enableWebcamButton.querySelector('.mdc-button__label').textContent = 
        this.webcamRunning ? "DISABLE PREDICTIONS" : "ENABLE WEBCAM";
    
    if (this.webcamRunning) {
        const constraints = {
            video: true
        };
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            this.video.addEventListener("loadeddata", this.predictWebcam);
            // Emit event when webcam is enabled
            this.dispatchEvent(new CustomEvent('webcamEnabled'));
        } catch (error) {
            console.error("Error accessing webcam:", error);
            this.dispatchEvent(new CustomEvent('error', { detail: error }));
        }
    } else {
        this.stop();
    }
}
  
  async predictWebcam() {
    // Set canvas dimensions

        // In the predictWebcam method:
//     if (this.video.videoWidth) {
//       this.canvasElement.style.width = this.video.videoWidth + 'px';
//       this.canvasElement.style.height = this.video.videoHeight + 'px';
//       this.canvasElement.width = this.video.videoWidth;
//       this.canvasElement.height = this.video.videoHeight;
//     }
    
    // Update running mode if needed
    if (this.runningMode === "IMAGE") {
      this.runningMode = "VIDEO";
      await handLandmarker.setOptions({ runningMode: "VIDEO" });
    }
    
    // Detect hands
    const startTimeMs = performance.now();
    if (this.lastVideoTime !== this.video.currentTime) {
      this.lastVideoTime = this.video.currentTime;
      this.results = handLandmarker.detectForVideo(this.video, startTimeMs);
      
      // Emit prediction event
      this.dispatchEvent(new CustomEvent('prediction', { 
        detail: { 
          results: this.results,
          timestamp: startTimeMs,
          instanceId: this.instanceId
        }
      }));
    }
    
    
    if (this.results.landmarks) {
      // Clear canvas...
      // Clear the canvas before drawing new frame
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      for (const landmarks of this.results.landmarks) {
        
        // console.log(landmarks);
        this.du.drawConnectors(
          landmarks, 
          HAND_CONNECTIONS, 
          { color: "#00FF00", lineWidth: 5 }
        );
        this.du.drawLandmarks(
          landmarks, 
          { color: "#FF0000", lineWidth: 2 }
        );
      }
    }
    
    
    // Continue prediction loop if webcam is running
    if (this.webcamRunning) {
      window.requestAnimationFrame(this.predictWebcam);
    }
  }
  
  stop() {
    this.webcamRunning = false;
    if (this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    this.video.srcObject = null;
  }
  
  // Method to remove the entire predictor
  destroy() {
    this.stop();
    if (this.styleElement) {
      this.styleElement.remove();
    }
    this.liveView.remove();
  }
}
  
window.WebcamPredictor = WebcamPredictor