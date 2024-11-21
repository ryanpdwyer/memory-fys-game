const tf = ml5.tf;


// Base class for ML models
class MLModel {
    constructor(config) {
      if (new.target === MLModel) {
        throw new Error('MLModel is an abstract class');
      }
      this.config = config;
      this.model = null;
    }
  
    async train(data, options) { throw new Error('Not implemented'); }
    async predict(input) { throw new Error('Not implemented'); }
    async save(path) { throw new Error('Not implemented'); }
    async load(path) { throw new Error('Not implemented'); }
  }
  
  // ML5.js Neural Network implementation
  class ML5NeuralNetwork extends MLModel {
    constructor(config) {
      super(config);
      this.model = ml5.neuralNetwork({
        inputs: config.inputSize,
        outputs: config.outputSize,
        task: 'classification',
        debug: config.debug || false
      });
    }

    save(nameOrCb = 'model', cb) {
      return new Promise((resolve) => {
        this.model.save(nameOrCb, () => {
          if (cb) cb();
          resolve();
        });
      });
    }

    load(filesOrPath, cb) {
      return new Promise((resolve) => {
        this.model.load(filesOrPath, () => {
          if (cb) cb();
          resolve();
        });
      });
    }
  
    async train(data, options) {
      // Format data for ML5
      const trainingData = this.formatData(data);
      
      // Add data to the model
      trainingData.forEach(sample => {
        this.model.addData(sample.input, sample.output);
      });
  
      // Normalize the data
      this.model.normalizeData();
  
      // Train the model
      const trainingOptions = {
        epochs: options.epochs || 50,
        batchSize: options.batchSize || 32,
        learningRate: options.learningRate || 0.2
      };
  
      return new Promise((resolve, reject) => {
        this.model.train(trainingOptions, 
          (epoch, loss) => {
            if (options.onEpoch) options.onEpoch(epoch, loss);
          },
          () => resolve(),
          (err) => reject(err)
        );
      });
    }
  
    formatData(gestureData) {
      const formattedData = [];
      Object.entries(gestureData).forEach(([label, data]) => {
        data.samples.forEach(sample => {
          // Flatten landmarks array into a single input array
          const input = sample.landmarks.flatMap(l => [l.x, l.y, l.z]);
          // Output labels are always just "class" - one classifier output...
          const output = { class: label };
          formattedData.push({ input, output });
        });
      });
      return formattedData;
    }
  
    predict(input) {
      this.model.classify(input, (results) => {
          this.classifierOutput = results;
      });
    }
  }
  
  // Training interface that manages UI and training process
  class MLTrainingInterface {
    constructor(config) {
      this.validateConfig(config);
      this.container = config.containerElement;
      this.predictor = config.predictor;
      this.model = null;
      this.chart = null;
      this.lossData = [];
      
      this.createInterface();
      this.attachEventListeners();
    }
  
    validateConfig(config) {
      if (!config.containerElement || !(config.containerElement instanceof HTMLElement)) {
        throw new Error('containerElement is required and must be an HTML element');
      }

      if (!config.predictor) {
        throw new Error('predictor instance is required');
      }
    }
  
    createInterface() {
      this.container.innerHTML = `
        <div class="ml-training-container container bg-white text-dark p-4 rounded">
          <h3 class="text-center">Model Training</h3>
          <p class="text-center">Use the form below to train a model using the provided data (upload json from the previous section).</p>
          <div class="data-section mb-3">
        <input type="file" accept=".json" id="dataUpload" class="form-control">
        <span class="data-status mt-2 d-block">No data loaded</span>
          </div>
          <div class="debug-section mb-3">
        <label class="form-check-label">
          <input type="checkbox" class="debug-checkbox form-check-input">
          Debug Mode
        </label>
          </div>
          
          <div class="parameters-section mb-3">
        <h4>Training Parameters</h4>
        <div class="parameter mb-2">
          <label>Learning Rate:</label>
          <input type="number" class="learning-rate form-control" value="0.2" step="0.01" min="0.01" max="1">
        </div>
        <div class="parameter mb-2">
          <label>Epochs:</label>
          <input type="number" class="epochs form-control" value="50" step="1" min="1">
        </div>
        <div class="parameter mb-2">
          <label>Batch Size:</label>
          <input type="number" class="batch-size form-control" value="32" step="1" min="1">
        </div>
          </div>
      
          <div class="training-controls mb-3">
        <button class="train-button btn btn-primary">Train Model</button>
        <button class="test-button btn btn-secondary" disabled>Test Model</button>
        <div class="model-io-controls mt-3">
          <button class="save-button btn btn-success" disabled>Save Model</button>
          <input type="file" multiple id="modelUpload" style="display: none">
          <button class="load-button btn btn-info">Load Model</button>
        </div>
          </div>
          <p class="text-center">To load a model, you must select all three files created by the Save Model command (model.json, model.weights.bin, and model_meta.json).</p>
      
          <div class="training-progress" style="display: none">
        <div class="progress-info d-flex justify-content-between mb-2">
          <span class="epoch-display">Epoch: 0/0</span>
          <span class="loss-display">Loss: --</span>
        </div>
        <canvas class="loss-chart"></canvas>
          </div>
        </div>
      `;

      // Store element references
      this.dataStatus = this.container.querySelector('.data-status');
      this.trainButton = this.container.querySelector('.train-button');
      this.testButton = this.container.querySelector('.test-button');
      this.saveButton = this.container.querySelector('.save-button');
      this.loadButton = this.container.querySelector('.load-button');
      this.modelUpload = this.container.querySelector('#modelUpload');
      this.debugCheckbox = this.container.querySelector('.debug-checkbox');

        // Update file input to accept only .model.json files
        const modelUpload = this.container.querySelector('.load-button');
        modelUpload.accept = '.model.json';


      this.progressSection = this.container.querySelector('.training-progress');
      this.epochDisplay = this.container.querySelector('.epoch-display');
      this.lossDisplay = this.container.querySelector('.loss-display');
      this.lossChart = this.container.querySelector('.loss-chart');
    }
  
    attachEventListeners() {
      const dataUpload = this.container.querySelector('#dataUpload');
      dataUpload.addEventListener('change', (e) => this.handleDataUpload(e));
      
      this.trainButton.addEventListener('click', () => this.startTraining());
      this.testButton.addEventListener('click', () => this.testModel());
      this.saveButton.addEventListener('click', () => this.saveModel());
      this.modelUpload.addEventListener('change', (e) => this.loadModel(e));
      this.loadButton.addEventListener('click', () => this.modelUpload.click());

      
    }

    async saveModel() {
      if (!this.model) {
        alert('No model to save');
        return;
      }

      try {
        await this.model.save('gesture-model');
        this.dataStatus.textContent = 'Model saved (3 files downloaded)';
      } catch (error) {
        console.error('Error saving model:', error);
        alert('Failed to save model');
      }
    }

    async loadModel(event) {
      const files = event.target.files;
      if (!files || files.length < 3) {
        alert('Please select all three model files (model.json, model.weights.bin, and model_meta.json)');
        return;
      }

      try {
        // Find the metadata file
        const metaFile = Array.from(files).find(f => f.name.includes('_meta'));
        if (!metaFile) {
          throw new Error('Metadata file not found');
        }

        // Read the metadata to get input/output dimensions
        const metadata = JSON.parse(await metaFile.text());
        
        // Create new model instance with inferred configuration
        this.model = new ML5NeuralNetwork({
          inputs: metadata.inputs,
          outputs: metadata.outputs,
          task: 'classification'
        });

        // Load the model using ml5's built-in functionality
        await this.model.load(files);
        
        // Enable testing
        this.testButton.disabled = false;
        this.saveButton.disabled = false;
        this.dataStatus.textContent = 'Model loaded successfully';
        
        // Start testing automatically...
        this.testModel();
        
      } catch (error) {
        console.error('Error loading model:', error);
        alert('Failed to load model: ' + error.message);
      }
      
      // Reset file input
      event.target.value = '';
    }


    async handleDataUpload(event) {
      const file = event.target.files[0];
      if (file) {
        try {
          const text = await file.text();
          this.gestureData = JSON.parse(text);
          this.dataStatus.textContent = `Data loaded: ${Object.keys(this.gestureData).length} classes`;
          this.trainButton.disabled = false;
        } catch (error) {
          console.error('Error loading data:', error);
          this.dataStatus.textContent = 'Error loading data';
        }
      }
    }
  
    async startTraining() {
      if (!this.gestureData) {
        alert('Please load data first');
        return;
      }
      const learningRate = parseFloat(this.container.querySelector('.learning-rate').value);
      const epochs = parseInt(this.container.querySelector('.epochs').value);
      const batchSize = parseInt(this.container.querySelector('.batch-size').value);
  
      this.progressSection.style.display = 'block';
      this.lossData = [];
      this.initChart();
  
      // Create and configure model
      this.model = new ML5NeuralNetwork({
        inputSize: 21 * 3, // 21 landmarks with x,y,z coordinates
        outputSize: Object.keys(this.gestureData).length,
        debug: this.debugCheckbox.checked
      });
  
      try {
        await this.model.train(this.gestureData, {
          epochs,
          batchSize,
          learningRate,
          onEpoch: (epoch, loss) => this.updateProgress(epoch, loss)
        });
  
        this.testButton.disabled = false;
        this.saveButton.disabled = false;
      } catch (error) {
        console.error('Training error:', error);
        this.dataStatus.textContent = 'Training failed';
      }
    }
    
    
    async loadModelDirect(path="/memory-fys-game/model/") {
    try {
        // First load and parse the metadata file
        const metaResponse = await fetch(path+'model_meta.json');
        if (!metaResponse.ok) {
            throw new Error('Failed to load metadata file');
        }
        const metadata = await metaResponse.json();
        
        // Create new model instance with inferred configuration
        this.model = new ML5NeuralNetwork({
            inputs: metadata.inputs,
            outputs: metadata.outputs,
            task: 'classification'
        });
        
        // Load the model
        const modelInfo = {
            model: path+'model.json',
            metadata: path+'model_meta.json',
            weights: path+'model.weights.bin'
        };

        await this.model.load(modelInfo);
        
        console.log("Model loaded successfully");
        this.testButton.disabled = false;
        this.saveButton.disabled = false;
        this.dataStatus.textContent = 'Model loaded successfully';
        
    } catch (error) {
        console.error('Error loading model:', error);
        alert('Failed to load model: ' + error.message);
    }
      
    this.testModel();
}
    
    
  
    initChart() {

      if (this.chart) {
        this.chart.destroy();
      }
      // Initialize Chart.js loss chart
      this.chart = new Chart(this.lossChart.getContext('2d'), {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Log Loss',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  
    updateProgress(epoch, loss) {
      // ML5.js returns loss as an object with a value property
      const lossValue = typeof loss === 'object' ? loss.loss : loss;
      
      this.epochDisplay.textContent = `Epoch: ${epoch}`;
      this.lossDisplay.textContent = `Loss: ${lossValue.toFixed(4)}`;
      
      // Update chart
      this.lossData.push(Math.log(lossValue));
      this.chart.data.labels.push(epoch);
      this.chart.data.datasets[0].data = this.lossData;
      this.chart.update();
  }
  
  async testModel() {
    if (!this.model) {
        alert('Please train a model first');
        return;
    }

    let predictionDisplay = document.getElementById('prediction-display');
    if (!predictionDisplay) {
        predictionDisplay = document.createElement('p');
        predictionDisplay.id = 'prediction-display';
        predictionDisplay.style.textAlign = 'center';
        predictionDisplay.style.fontSize = '18px';
        predictionDisplay.style.margin = '10px 0';
        this.predictor.config.containerElement.after(predictionDisplay);
    }

    this.testButton.textContent = this.testButton.textContent === 'Test Model' ? 'Stop Testing' : 'Test Model';
    
    if (this.testButton.textContent === 'Test Model') {
        predictionDisplay.textContent = '';
        return;
    }

    // This is an async function - I should, in the loop, check if the button is still 'Stop Testing'
    // If it is, then I should continue to predict
    // If it is not, then I should break out of the loop
    while (this.testButton.textContent === 'Stop Testing') {
        if (this.predictor.results && this.predictor.results.landmarks && this.predictor.results.landmarks.length > 0) {
        const input = this.predictor.results.landmarks[0].flatMap(l => [l.x, l.y, l.z]);
        this.model.predict(input);
        if (this.model.classifierOutput) {
            const topPrediction = this.model.classifierOutput.sort((a, b) => b.value - a.value)[0];
            predictionDisplay.textContent = `Prediction: ${topPrediction.label} (${(topPrediction.confidence * 100).toFixed(2)}%)`
          // Update window.currentPrediction and window.previousPrediction, then run the updateSequence function
   
          if (window.previousPrediction !== window.currentPrediction) {
          window.previousPrediction = window.currentPrediction
          window.currentPrediction = topPrediction.label;
          window.updateSequenceDisplay();
          }
      }
    }
      // Add a sleep function here to slow down the prediction rate
      await new Promise(resolve => setTimeout(resolve, 125));
    }
  }
  
  }

window.MLModel = MLModel;
window.ML5NeuralNetwork = ML5NeuralNetwork;
window.MLTrainingInterface = MLTrainingInterface;