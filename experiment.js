/**
 * KS Contextual Cueing Visual Search Experiment
 * 12x12 Grid, 4-Factor Balanced Design (32 trials/block)
 * Supports Keyboard response and Mouse Trajectory Streaming
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. EXPERIMENT CONSTANTS & QUADRANT DEFINITIONS
  // =========================================================================
  const GRID_ROWS = 12;
  const GRID_COLS = 12;
  const TRIALS_PER_BLOCK = 32;

  // 16 Candidate Target Locations grouped by 4 Quadrants
  // (Row, Column) indexed 1..12
  const QUADRANT_LOCATIONS = {
    1: [ { row: 3, col: 3 }, { row: 4, col: 3 }, { row: 3, col: 4 }, { row: 4, col: 4 } ],
    2: [ { row: 9, col: 3 }, { row: 10, col: 3 }, { row: 9, col: 4 }, { row: 10, col: 4 } ],
    3: [ { row: 3, col: 9 }, { row: 4, col: 9 }, { row: 3, col: 10 }, { row: 4, col: 10 } ],
    4: [ { row: 9, col: 9 }, { row: 10, col: 9 }, { row: 9, col: 10 }, { row: 10, col: 10 } ]
  };

  // Helper set of all 16 candidate target locations for fast lookup
  const ALL_CANDIDATE_TARGETS = [];
  for (let q = 1; q <= 4; q++) {
    QUADRANT_LOCATIONS[q].forEach(loc => {
      ALL_CANDIDATE_TARGETS.push({ quadrant: q, row: loc.row, col: loc.col, key: `${loc.row},${loc.col}` });
    });
  }

  // =========================================================================
  // 2. STATE MANAGEMENT
  // =========================================================================
  const state = {
    config: {
      participantId: 'SUBJ_001',
      responseMode: 'keypress', // 'keypress' or 'mouse_click'
      keyTiltLeft: 'ArrowLeft',
      keyTiltRight: 'ArrowRight',
      blockCount: 2,
      includePractice: false,
      setSize1: 8,
      setSize2: 16,
      fixationDuration: 500, // ms
      itiDuration: 750,      // ms
      volume: 0.7
    },
    audio: {
      ctx: null,
      sound1Buffer: null,
      sound2Buffer: null,
      loaded: false
    },
    // The 16 frozen repeated configurations created in Block 1
    // keyed by configId: "rep_Q{q}_S{setSize}_snd{sound}"
    repeatedConfigurations: {},
    // Current trial and block indices
    blocks: [],
    currentBlockIdx: 0,
    currentTrialIdx: 0,
    isPractice: false,
    trialActive: false,
    trialStartTime: 0,
    // Mouse trajectory collection (only when responseMode === 'mouse_click')
    currentMouseTrajectory: [],
    // All recorded trial results
    trialResults: [],
    // Canvas sizing
    canvasSize: 720,
    cellSize: 60
  };

  // DOM Elements cache
  const DOM = {};

  function initDOMElements() {
    DOM.setupView = document.getElementById('setupView');
    DOM.instructionsView = document.getElementById('instructionsView');
    DOM.experimentView = document.getElementById('experiment-view');
    DOM.breakView = document.getElementById('breakView');
    DOM.debriefView = document.getElementById('debriefView');

    DOM.participantId = document.getElementById('participantId');
    DOM.radioCardKeypress = document.getElementById('radioCardKeypress');
    DOM.radioCardMouse = document.getElementById('radioCardMouse');
    DOM.keyConfigGroup = document.getElementById('keyConfigGroup');
    DOM.keyTiltLeft = document.getElementById('keyTiltLeft');
    DOM.keyTiltRight = document.getElementById('keyTiltRight');
    DOM.blockCount = document.getElementById('blockCount');
    DOM.includePractice = document.getElementById('includePractice');
    DOM.setSize1 = document.getElementById('setSize1');
    DOM.setSize2 = document.getElementById('setSize2');
    DOM.factorSetSizeLabel = document.getElementById('factorSetSizeLabel');
    DOM.fixationDuration = document.getElementById('fixationDuration');
    DOM.itiDuration = document.getElementById('itiDuration');
    DOM.soundVolume = document.getElementById('soundVolume');
    DOM.btnTestSound1 = document.getElementById('btnTestSound1');
    DOM.btnTestSound2 = document.getElementById('btnTestSound2');
    DOM.btnGeneratePreview = document.getElementById('btnGeneratePreview');
    DOM.gridPreview = document.getElementById('gridPreview');
    DOM.gridPreviewStatus = document.getElementById('gridPreviewStatus');
    DOM.sessionSummaryText = document.getElementById('sessionSummaryText');

    DOM.btnProceedToInstructions = document.getElementById('btnProceedToInstructions');
    DOM.btnBackToConfig = document.getElementById('btnBackToConfig');
    DOM.btnStartExperimentNow = document.getElementById('btnStartExperimentNow');

    DOM.searchCanvas = document.getElementById('searchCanvas');
    DOM.experimentStage = document.getElementById('experimentStage');
    DOM.fixationCross = document.getElementById('fixationCross');
    DOM.mouseHint = document.getElementById('mouseHint');
    DOM.hudBlockLabel = document.getElementById('hudBlockLabel');
    DOM.hudTrialLabel = document.getElementById('hudTrialLabel');
    DOM.hudProgressFill = document.getElementById('hudProgressFill');
    DOM.hudModeIndicator = document.getElementById('hudModeIndicator');
    DOM.appModeBadge = document.getElementById('appModeBadge');
    DOM.appModeText = document.getElementById('appModeText');

    DOM.breakTitle = document.getElementById('breakTitle');
    DOM.breakDesc = document.getElementById('breakDesc');
    DOM.btnResumeNextBlock = document.getElementById('btnResumeNextBlock');

    DOM.statTotalTrials = document.getElementById('statTotalTrials');
    DOM.statBlocksSub = document.getElementById('statBlocksSub');
    DOM.statAccuracy = document.getElementById('statAccuracy');
    DOM.statAccuracySub = document.getElementById('statAccuracySub');
    DOM.statMeanRT = document.getElementById('statMeanRT');
    DOM.statCueingDiff = document.getElementById('statCueingDiff');
    DOM.statCueingSub = document.getElementById('statCueingSub');
    DOM.cueingChartContainer = document.getElementById('cueingChartContainer');
    DOM.setSizeChartContainer = document.getElementById('setSizeChartContainer');
    DOM.trialTableBody = document.getElementById('trialTableBody');

    DOM.btnDownloadCSV = document.getElementById('btnDownloadCSV');
    DOM.btnDownloadLayoutsCSV = document.getElementById('btnDownloadLayoutsCSV');
    DOM.btnDownloadLayoutsCSV2 = document.getElementById('btnDownloadLayoutsCSV2');
    DOM.layoutsTableBody = document.getElementById('layoutsTableBody');
    DOM.btnDownloadJSON = document.getElementById('btnDownloadJSON');
    DOM.btnResetExperiment = document.getElementById('btnResetExperiment');
    DOM.fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
    DOM.themeToggleBtn = document.getElementById('themeToggleBtn');

    DOM.instructionResponseTitle = document.getElementById('instructionResponseTitle');
    DOM.instructionResponseDesc = document.getElementById('instructionResponseDesc');
    DOM.keyLabelLeft = document.getElementById('keyLabelLeft');
    DOM.keyLabelRight = document.getElementById('keyLabelRight');

    DOM.trajectoryModal = document.getElementById('trajectoryModal');
    DOM.modalTitle = document.getElementById('modalTitle');
    DOM.modalSubtitle = document.getElementById('modalSubtitle');
    DOM.modalCoordinatesContent = document.getElementById('modalCoordinatesContent');
    DOM.trajectoryPlotContainer = document.getElementById('trajectoryPlotContainer');
    DOM.btnCloseModal = document.getElementById('btnCloseModal');
    DOM.btnCloseModalBtn = document.getElementById('btnCloseModalBtn');
  }

  // =========================================================================
  // 3. AUDIO SYSTEM (Optimized for both file:// and http:// in browser)
  // =========================================================================
  const html5AudioPool = {
    Sound1: new Audio('Sound1.mp3'),
    Sound2: new Audio('Sound2.mp3')
  };

  function initAudio() {
    try {
      html5AudioPool.Sound1.preload = 'auto';
      html5AudioPool.Sound2.preload = 'auto';
    } catch (e) {
      // Audio element initialized
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        state.audio.ctx = new AudioCtx();
        loadAudioFiles();
      }
    } catch (e) {
      console.warn('Web Audio API not supported, using HTML5 Audio pool', e);
    }
  }

  async function loadAudioFiles() {
    if (!state.audio.ctx) return;
    try {
      const [res1, res2] = await Promise.all([
        fetch('Sound1.mp3'),
        fetch('Sound2.mp3')
      ]);

      if (res1.ok && res2.ok) {
        const [buf1, buf2] = await Promise.all([
          res1.arrayBuffer(),
          res2.arrayBuffer()
        ]);
        state.audio.sound1Buffer = await state.audio.ctx.decodeAudioData(buf1);
        state.audio.sound2Buffer = await state.audio.ctx.decodeAudioData(buf2);
        state.audio.loaded = true;
      }
    } catch (err) {
      // When run via local file:// URL, fetch may be blocked by browser CORS policy.
      // In that case, html5AudioPool seamlessly handles playback with zero delay!
      state.audio.loaded = false;
    }
  }

  function playSound(soundFactor) {
    const volume = parseFloat(state.config.volume) || 0.7;

    // Try Web Audio API first for lowest latency
    if (state.audio.ctx && state.audio.loaded) {
      try {
        if (state.audio.ctx.state === 'suspended') {
          state.audio.ctx.resume();
        }
        const buffer = soundFactor === 'Sound1' ? state.audio.sound1Buffer : state.audio.sound2Buffer;
        if (buffer) {
          const source = state.audio.ctx.createBufferSource();
          const gainNode = state.audio.ctx.createGain();
          gainNode.gain.setValueAtTime(volume, state.audio.ctx.currentTime);
          source.buffer = buffer;
          source.connect(gainNode);
          gainNode.connect(state.audio.ctx.destination);
          source.start(0);
          return;
        }
      } catch (e) {
        console.warn('Web Audio playback error, falling back to HTML5 Audio', e);
      }
    }

    // Reliable fallback for file:// and standard browser audio
    try {
      const audio = new Audio(soundFactor === 'Sound1' ? 'Sound1.mp3' : 'Sound2.mp3');
      audio.volume = volume;
      audio.play().catch(e => {
        // Retry with preloaded pool if needed
        try {
          const poolAudio = html5AudioPool[soundFactor];
          if (poolAudio) {
            poolAudio.currentTime = 0;
            poolAudio.volume = volume;
            poolAudio.play();
          }
        } catch (err) {}
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // =========================================================================
  // 4. FACTORIAL DESIGN EXPERIMENT GENERATOR (32 Trials per Block)
  // =========================================================================
  /**
   * Generates a 4-Factor Balanced Block of 32 trials:
   * Factor 1: Target Quadrant (4 levels: 1, 2, 3, 4)
   * Factor 2: Configuration Type (2 levels: 'repeated' vs 'novel')
   * Factor 3: Sound Trigger (2 levels: 'Sound1' vs 'Sound2')
   * Factor 4: Set Size (2 levels: e.g. 8 vs 16)
   * Full factorial combination = 4 * 2 * 2 * 2 = 32 trials.
   *
   * @param {number} blockNumber 1-indexed block number
   * @param {boolean} isPractice Whether this is a practice block
   */
  function generateBlock(blockNumber, isPractice = false) {
    const trials = [];
    const quadrants = [1, 2, 3, 4];
    const configTypes = ['repeated', 'novel'];
    const sounds = ['Sound1', 'Sound2'];
    const setSizes = [parseInt(state.config.setSize1, 10), parseInt(state.config.setSize2, 10)];

    // Generate all 32 factorial combinations
    quadrants.forEach(quadrant => {
      configTypes.forEach(configType => {
        sounds.forEach(soundFactor => {
          setSizes.forEach(setSize => {
            const configId = `${configType}_Q${quadrant}_S${setSize}_${soundFactor}`;

            // Target Orientation: randomly tilted 90 degrees left or right
            const orientation = Math.random() < 0.5 ? 'left' : 'right';

            // Candidate locations in this quadrant
            const candidateList = QUADRANT_LOCATIONS[quadrant];

            let targetLoc;
            let targetJitterX = 0;
            let targetJitterY = 0;
            let distractorLocations = [];

            if (configType === 'repeated') {
              if (blockNumber === 1 || !state.repeatedConfigurations[configId]) {
                // BLOCK 1: Initialize and freeze this repeated configuration!
                // 1. Pick target location from the 4 quadrant cells
                targetLoc = candidateList[Math.floor(Math.random() * candidateList.length)];

                // Assign spatial jitter to each candidate target cell so layout is invariant
                const candidateLocationsWithJitter = candidateList.map(c => ({
                  row: c.row,
                  col: c.col,
                  jitterX: randomJitter(10),
                  jitterY: randomJitter(10)
                }));

                const activeTargetObj = candidateLocationsWithJitter.find(
                  c => c.row === targetLoc.row && c.col === targetLoc.col
                ) || { row: targetLoc.row, col: targetLoc.col, jitterX: randomJitter(10), jitterY: randomJitter(10) };

                targetJitterX = activeTargetObj.jitterX;
                targetJitterY = activeTargetObj.jitterY;

                // 2. Sample distractor locations from remaining 12x12 cells with spatial jitter
                distractorLocations = sampleDistractors(setSize - 1, quadrant, targetLoc);

                // Freeze layout into state
                state.repeatedConfigurations[configId] = {
                  configId,
                  quadrant,
                  setSize,
                  soundFactor,
                  candidateLocations: JSON.parse(JSON.stringify(candidateLocationsWithJitter)),
                  distractorLocations: JSON.parse(JSON.stringify(distractorLocations)),
                  previousTargetLoc: targetLoc,
                  targetLocationsByBlock: { [blockNumber]: targetLoc }
                };
              } else {
                // SUBSEQUENT BLOCKS:
                // Distractor locations remain IDENTICAL to Block 1!
                const frozen = state.repeatedConfigurations[configId];
                distractorLocations = JSON.parse(JSON.stringify(frozen.distractorLocations));

                // Target quadrant is the SAME, but the target location within the quadrant
                // is chosen to be different from the previous block if possible
                const prev = frozen.previousTargetLoc;
                const otherLocs = candidateList.filter(l => !(l.row === prev.row && l.col === prev.col));
                targetLoc = otherLocs[Math.floor(Math.random() * otherLocs.length)] || candidateList[0];
                frozen.previousTargetLoc = targetLoc;
                if (!frozen.targetLocationsByBlock) frozen.targetLocationsByBlock = {};
                frozen.targetLocationsByBlock[blockNumber] = targetLoc;

                // Use the frozen jitter for this candidate location
                const candObj = (frozen.candidateLocations || []).find(
                  c => c.row === targetLoc.row && c.col === targetLoc.col
                );
                targetJitterX = candObj ? candObj.jitterX : randomJitter(10);
                targetJitterY = candObj ? candObj.jitterY : randomJitter(10);
              }
            } else {
              // NOVEL CONFIGURATION:
              // Fresh random distractor layout and random jitter on every trial!
              targetLoc = candidateList[Math.floor(Math.random() * candidateList.length)];
              distractorLocations = sampleDistractors(setSize - 1, quadrant, targetLoc);
              targetJitterX = randomJitter(10);
              targetJitterY = randomJitter(10);
            }

            trials.push({
              blockNumber,
              isPractice,
              quadrant,
              configType,
              configId,
              soundFactor,
              setSize,
              targetRow: targetLoc.row,
              targetCol: targetLoc.col,
              targetOrientation: orientation,
              targetJitterX,
              targetJitterY,
              distractors: distractorLocations
            });
          });
        });
      });
    });

    // Shuffle trial presentation order within the block (Fisher-Yates)
    shuffleArray(trials);

    // If practice block, can take a subset (e.g. 8 trials)
    if (isPractice) {
      return trials.slice(0, 8);
    }

    return trials;
  }

  /**
   * Generates a subtle spatial jitter (-maxPx to +maxPx) within a cell
   * to break collinear alignment across rows and columns.
   */
  function randomJitter(maxPx = 10) {
    return Math.round((Math.random() * 2 - 1) * maxPx);
  }

  /**
   * Samples (N - 1) random distractor positions in the 12x12 grid.
   * Ensures no overlap with target and no overlap with the 4 candidate locations
   * in the target's quadrant (allowing target movement in repeated trials).
   */
  function sampleDistractors(count, targetQuadrant, activeTargetLoc) {
    const forbiddenKeys = new Set();

    // Exclude the 4 candidate target cells of this quadrant
    QUADRANT_LOCATIONS[targetQuadrant].forEach(loc => {
      forbiddenKeys.add(`${loc.row},${loc.col}`);
    });
    // Ensure active target is definitely excluded
    forbiddenKeys.add(`${activeTargetLoc.row},${activeTargetLoc.col}`);

    // Build pool of available grid cells (out of 144)
    const availableCells = [];
    for (let r = 1; r <= GRID_ROWS; r++) {
      for (let c = 1; c <= GRID_COLS; c++) {
        const key = `${r},${c}`;
        if (!forbiddenKeys.has(key)) {
          availableCells.push({ row: r, col: c });
        }
      }
    }

    shuffleArray(availableCells);
    const chosenCells = availableCells.slice(0, count);

    // Each distractor is an 'L' with a random orientation (0, 90, 180, 270)
    // plus a small spatial jitter (+-10px) to prevent collinearities
    return chosenCells.map(cell => ({
      row: cell.row,
      col: cell.col,
      orientation: [0, 90, 180, 270][Math.floor(Math.random() * 4)],
      jitterX: randomJitter(10),
      jitterY: randomJitter(10)
    }));
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // =========================================================================
  // 5. HIGH-DPI CANVAS RENDERING ENGINE
  // =========================================================================
  function setupCanvasDPI() {
    const canvas = DOM.searchCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Base canvas logical size
    const logicalSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.85, 740);
    state.canvasSize = logicalSize;
    state.cellSize = logicalSize / GRID_COLS;

    canvas.width = logicalSize * dpr;
    canvas.height = logicalSize * dpr;
    canvas.style.width = `${logicalSize}px`;
    canvas.style.height = `${logicalSize}px`;

    ctx.scale(dpr, dpr);
  }

  /**
   * Draws a complete visual search trial display onto the canvas.
   */
  function renderSearchDisplay(trial) {
    const canvas = DOM.searchCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Clear canvas
    ctx.clearRect(0, 0, state.canvasSize, state.canvasSize);

    // Uniform clean background (the grid is NOT visible during search trials)
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#1e2532';
    ctx.fillRect(0, 0, state.canvasSize, state.canvasSize);

    // Draw all Distractor L's (with subtle spatial jitter to prevent collinearities)
    trial.distractors.forEach(dist => {
      const centerX = (dist.col - 0.5) * state.cellSize + (dist.jitterX || 0);
      const centerY = (dist.row - 0.5) * state.cellSize + (dist.jitterY || 0);
      drawL(ctx, centerX, centerY, dist.orientation);
    });

    // Draw Target T (with subtle spatial jitter to prevent collinearities)
    const targetCenterX = (trial.targetCol - 0.5) * state.cellSize + (trial.targetJitterX || 0);
    const targetCenterY = (trial.targetRow - 0.5) * state.cellSize + (trial.targetJitterY || 0);
    drawT(ctx, targetCenterX, targetCenterY, trial.targetOrientation);
  }

  /**
   * Draws a crisp rotated 'T' with identical stroke width and arm length as 'L'
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx Center X
   * @param {number} cy Center Y
   * @param {string} orientation 'left' (-90 deg) or 'right' (+90 deg)
   */
  function drawT(ctx, cx, cy, orientation) {
    const strokeColor = getComputedStyle(document.documentElement).getPropertyValue('--canvas-text').trim() || '#ffffff';
    const armLength = 22; // length of stroke
    const halfArm = armLength / 2;
    const lineWidth = 3.8;

    ctx.save();
    ctx.translate(cx, cy);

    // Rotate: 'left' = -90 deg (-Math.PI/2), 'right' = +90 deg (+Math.PI/2)
    const angle = orientation === 'left' ? -Math.PI / 2 : Math.PI / 2;
    ctx.rotate(angle);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'square';

    // Normal T at 0 deg:
    // Crossbar: horizontal from (-halfArm, -halfArm) to (+halfArm, -halfArm)
    // Stem: vertical from (0, -halfArm) to (0, +halfArm)
    ctx.beginPath();
    ctx.moveTo(-halfArm, -halfArm);
    ctx.lineTo(halfArm, -halfArm);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -halfArm);
    ctx.lineTo(0, halfArm);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws a crisp rotated 'L' with identical stroke width and arm length
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx Center X
   * @param {number} cy Center Y
   * @param {number} angleDeg 0, 90, 180, 270
   */
  function drawL(ctx, cx, cy, angleDeg) {
    const strokeColor = getComputedStyle(document.documentElement).getPropertyValue('--canvas-text').trim() || '#ffffff';
    const armLength = 22;
    const halfArm = armLength / 2;
    const lineWidth = 3.8;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angleDeg * Math.PI) / 180);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'square';

    // Normal L at 0 deg:
    // Vertical stem from (-halfArm, -halfArm) to (-halfArm, halfArm)
    // Horizontal foot from (-halfArm, halfArm) to (halfArm, halfArm)
    ctx.beginPath();
    ctx.moveTo(-halfArm, -halfArm);
    ctx.lineTo(-halfArm, halfArm);
    ctx.lineTo(halfArm, halfArm);
    ctx.stroke();

    ctx.restore();
  }

  // =========================================================================
  // 6. EXPERIMENT EXECUTION & TRIAL LOOP
  // =========================================================================
  function startExperimentSession() {
    // Read and sanitize configuration values
    state.config.participantId = DOM.participantId.value.trim() || 'SUBJ_' + Date.now();
    state.config.responseMode = document.querySelector('input[name="responseMode"]:checked').value;
    state.config.keyTiltLeft = DOM.keyTiltLeft.value.trim() || 'ArrowLeft';
    state.config.keyTiltRight = DOM.keyTiltRight.value.trim() || 'ArrowRight';
    state.config.blockCount = Math.max(1, Math.min(30, parseInt(DOM.blockCount.value, 10) || 2));
    state.config.includePractice = DOM.includePractice.checked;
    state.config.setSize1 = parseInt(DOM.setSize1.value, 10) || 8;
    state.config.setSize2 = parseInt(DOM.setSize2.value, 10) || 16;
    state.config.fixationDuration = parseInt(DOM.fixationDuration.value, 10) || 500;
    state.config.itiDuration = parseInt(DOM.itiDuration.value, 10) || 750;
    state.config.volume = parseFloat(DOM.soundVolume.value) || 0.7;

    // Reset trial state
    state.repeatedConfigurations = {};
    state.trialResults = [];
    state.blocks = [];
    state.currentBlockIdx = 0;
    state.currentTrialIdx = 0;

    // Generate practice block if requested
    if (state.config.includePractice) {
      state.blocks.push({
        blockNumber: 0,
        isPractice: true,
        trials: generateBlock(0, true)
      });
    }

    // Generate experimental blocks (1 .. N)
    for (let b = 1; b <= state.config.blockCount; b++) {
      state.blocks.push({
        blockNumber: b,
        isPractice: false,
        trials: generateBlock(b, false)
      });
    }

    // Set UI mode
    DOM.hudModeIndicator.textContent = state.config.responseMode === 'keypress' 
      ? `Keypress Mode (${state.config.keyTiltLeft} / ${state.config.keyTiltRight})` 
      : 'Mouse Click Mode (Tracking Trajectories)';

    DOM.mouseHint.style.display = state.config.responseMode === 'mouse_click' ? 'block' : 'none';

    // Switch to active experiment screen
    showView('experiment');
    setupCanvasDPI();

    // Start trial cycle
    runNextTrial();
  }

  function runNextTrial() {
    const currentBlockObj = state.blocks[state.currentBlockIdx];
    if (!currentBlockObj) {
      // All blocks completed!
      finishExperimentSession();
      return;
    }

    const currentTrial = currentBlockObj.trials[state.currentTrialIdx];
    if (!currentTrial) {
      // Completed all trials in this block
      state.currentBlockIdx++;
      state.currentTrialIdx = 0;

      if (state.currentBlockIdx < state.blocks.length) {
        // Show between-block break screen
        showBlockBreakScreen();
      } else {
        finishExperimentSession();
      }
      return;
    }

    // Update HUD
    const totalTrialsInBlock = currentBlockObj.trials.length;
    const blockDisplayNum = currentBlockObj.isPractice ? 'Practice' : currentBlockObj.blockNumber;
    DOM.hudBlockLabel.textContent = `Block ${blockDisplayNum} of ${state.config.blockCount}`;
    DOM.hudTrialLabel.textContent = `Trial ${state.currentTrialIdx + 1} of ${totalTrialsInBlock}`;
    const pct = ((state.currentTrialIdx) / totalTrialsInBlock) * 100;
    DOM.hudProgressFill.style.width = `${pct}%`;

    // Phase 1: Fixation Cross (reset to neutral color)
    state.trialActive = false;
    DOM.fixationCross.classList.remove('error-feedback');
    DOM.fixationCross.style.display = 'block';

    // Clear canvas during fixation
    const ctx = DOM.searchCanvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvasSize, state.canvasSize);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#1e2532';
    ctx.fillRect(0, 0, state.canvasSize, state.canvasSize);

    // Wait fixation duration
    setTimeout(() => {
      // Phase 2: Stimulus Presentation & Search Start
      DOM.fixationCross.style.display = 'none';
      renderSearchDisplay(currentTrial);

      state.trialActive = true;
      state.trialStartTime = performance.now();
      state.currentMouseTrajectory = [];

      // If mouse mode, record initial cursor position
      if (state.config.responseMode === 'mouse_click') {
        // Tracking begins immediately
      }
    }, state.config.fixationDuration);
  }

  /**
   * Handles keyboard response for Option 1
   */
  function handleKeyPress(e) {
    if (!state.trialActive) {
      // Spacebar to advance past break screen
      if (e.code === 'Space' && DOM.breakView.classList.contains('active')) {
        e.preventDefault();
        resumeNextBlock();
      }
      return;
    }

    // Prevent key holding repeat
    if (e.repeat) return;

    // Check for Pause/Escape
    if (e.key === 'Escape') {
      if (confirm('Do you want to pause and return to Setup? Progress will be cancelled.')) {
        showView('setup');
        state.trialActive = false;
      }
      return;
    }

    if (state.config.responseMode !== 'keypress') return;

    const pressedKey = e.key;
    const currentBlockObj = state.blocks[state.currentBlockIdx];
    const currentTrial = currentBlockObj.trials[state.currentTrialIdx];

    // Normalize keys for left / right
    const expectedKey = currentTrial.targetOrientation === 'left' ? state.config.keyTiltLeft : state.config.keyTiltRight;
    const isTiltLeft = (pressedKey === state.config.keyTiltLeft || (state.config.keyTiltLeft === 'ArrowLeft' && pressedKey === 'ArrowLeft') || pressedKey.toLowerCase() === 'z');
    const isTiltRight = (pressedKey === state.config.keyTiltRight || (state.config.keyTiltRight === 'ArrowRight' && pressedKey === 'ArrowRight') || pressedKey.toLowerCase() === 'm');

    let responseOrientation = null;
    if (isTiltLeft) responseOrientation = 'left';
    else if (isTiltRight) responseOrientation = 'right';
    else {
      // Not an accepted response key
      return;
    }

    e.preventDefault();
    const rt = performance.now() - state.trialStartTime;
    const isCorrect = (responseOrientation === currentTrial.targetOrientation) ? 1 : 0;

    // Record response
    recordTrialResponse({
      trial: currentTrial,
      responseMode: 'keypress',
      response: responseOrientation,
      isCorrect,
      reactionTime: rt,
      trajectory: [] // Strictly empty for keypress mode per requirements!
    });
  }

  /**
   * Handles continuous mouse tracking and click for Option 2
   */
  function handleMouseMove(e) {
    if (!state.trialActive || state.config.responseMode !== 'mouse_click') return;

    const rect = DOM.searchCanvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Only record if inside or immediately surrounding canvas bounds
    const relTime = Math.round(performance.now() - state.trialStartTime);
    state.currentMouseTrajectory.push({
      t: relTime,
      x: Math.round(clientX),
      y: Math.round(clientY)
    });
  }

  function handleCanvasClick(e) {
    if (!state.trialActive || state.config.responseMode !== 'mouse_click') return;

    const rt = performance.now() - state.trialStartTime;
    const rect = DOM.searchCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Map click to 12x12 grid row and col
    const clickedCol = Math.floor(clickX / state.cellSize) + 1;
    const clickedRow = Math.floor(clickY / state.cellSize) + 1;

    // Add final click point to trajectory
    state.currentMouseTrajectory.push({
      t: Math.round(rt),
      x: Math.round(clickX),
      y: Math.round(clickY),
      event: 'click'
    });

    const currentBlockObj = state.blocks[state.currentBlockIdx];
    const currentTrial = currentBlockObj.trials[state.currentTrialIdx];

    // Check hit test: Did participant click on target's grid cell OR within target radius?
    const targetCenterX = (currentTrial.targetCol - 0.5) * state.cellSize + (currentTrial.targetJitterX || 0);
    const targetCenterY = (currentTrial.targetRow - 0.5) * state.cellSize + (currentTrial.targetJitterY || 0);
    const distToTarget = Math.hypot(clickX - targetCenterX, clickY - targetCenterY);

    const inCell = (clickedRow === currentTrial.targetRow && clickedCol === currentTrial.targetCol);
    const inRadius = distToTarget <= (state.cellSize * 0.55);
    const isHit = inCell || inRadius;
    const isCorrect = isHit ? 1 : 0;

    recordTrialResponse({
      trial: currentTrial,
      responseMode: 'mouse_click',
      response: `(${clickedRow},${clickedCol})`,
      clickedRow,
      clickedCol,
      isCorrect,
      reactionTime: rt,
      trajectory: [...state.currentMouseTrajectory] // Saved streaming X,Y coordinates
    });
  }

  /**
   * Finalizes the trial, plays the post-response sound factor, logs data, and schedules next trial.
   */
  function recordTrialResponse(data) {
    state.trialActive = false;

    // Factor 3 Sound: Triggered immediately after participant responds
    // Note: Does NOT indicate correctness; neutral factorial trigger
    playSound(data.trial.soundFactor);

    // Save trial log
    const trialRecord = {
      participantId: state.config.participantId,
      sessionTimestamp: new Date().toISOString(),
      blockNumber: data.trial.blockNumber,
      isPractice: data.trial.isPractice,
      trialInBlock: state.currentTrialIdx + 1,
      totalTrialNumber: state.trialResults.length + 1,
      targetQuadrant: data.trial.quadrant,
      targetLocation: `(${data.trial.targetRow},${data.trial.targetCol})`,
      targetRow: data.trial.targetRow,
      targetCol: data.trial.targetCol,
      targetOrientation: data.trial.targetOrientation,
      targetJitterX: data.trial.targetJitterX || 0,
      targetJitterY: data.trial.targetJitterY || 0,
      configurationType: data.trial.configType,
      configurationId: data.trial.configId,
      setSize: data.trial.setSize,
      soundFactor: data.trial.soundFactor,
      responseMode: data.responseMode,
      response: data.response,
      isCorrect: data.isCorrect,
      reactionTimeMs: parseFloat(data.reactionTime.toFixed(2)),
      // Streaming trajectory only when mouse_click was selected
      mouseTrajectory: data.responseMode === 'mouse_click' ? data.trajectory : []
    };

    state.trialResults.push(trialRecord);

    // Clear canvas for ISI (Inter-Stimulus / Inter-Trial Interval)
    const ctx = DOM.searchCanvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvasSize, state.canvasSize);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#1e2532';
    ctx.fillRect(0, 0, state.canvasSize, state.canvasSize);

    // Visual Feedback during ISI:
    // Display fixation cross during ISI.
    // Turn the fixation cross RED if the response was incorrect.
    DOM.fixationCross.style.display = 'block';
    if (data.isCorrect === 0) {
      DOM.fixationCross.classList.add('error-feedback');
    } else {
      DOM.fixationCross.classList.remove('error-feedback');
    }

    // Advance to next trial after ISI / ITI
    state.currentTrialIdx++;
    setTimeout(() => {
      runNextTrial();
    }, state.config.itiDuration);
  }

  // =========================================================================
  // 7. BLOCK BREAKS & COMPLETION
  // =========================================================================
  function showBlockBreakScreen() {
    DOM.fixationCross.style.display = 'none';
    DOM.fixationCross.classList.remove('error-feedback');

    const completedBlock = state.blocks[state.currentBlockIdx - 1];
    const nextBlock = state.blocks[state.currentBlockIdx];

    DOM.breakTitle.textContent = completedBlock.isPractice 
      ? 'Practice Block Completed!' 
      : `Block ${completedBlock.blockNumber} Completed!`;

    const remaining = state.blocks.length - state.currentBlockIdx;
    DOM.breakDesc.innerHTML = `Great job! Take a short rest. You have <strong>${remaining}</strong> block${remaining > 1 ? 's' : ''} remaining.<br>When you are ready, click below or press the Spacebar.`;

    showView('break');
  }

  function resumeNextBlock() {
    showView('experiment');
    setupCanvasDPI();
    runNextTrial();
  }

  function finishExperimentSession() {
    DOM.fixationCross.style.display = 'none';
    DOM.fixationCross.classList.remove('error-feedback');
    showView('debrief');
    computeAndRenderAnalytics();
  }

  // =========================================================================
  // 8. DATA ANALYTICS & INTERACTIVE SVG CHARTS
  // =========================================================================
  function computeAndRenderAnalytics() {
    const validTrials = state.trialResults.filter(t => !t.isPractice);
    const totalTrials = validTrials.length;

    if (totalTrials === 0) return;

    const correctTrials = validTrials.filter(t => t.isCorrect === 1);
    const overallAcc = (correctTrials.length / totalTrials) * 100;
    const meanRT = validTrials.reduce((sum, t) => sum + t.reactionTimeMs, 0) / totalTrials;

    // Split by Repeated vs Novel
    const repTrials = validTrials.filter(t => t.configurationType === 'repeated' && t.isCorrect === 1);
    const novTrials = validTrials.filter(t => t.configurationType === 'novel' && t.isCorrect === 1);

    const meanRepRT = repTrials.length > 0 ? (repTrials.reduce((s, t) => s + t.reactionTimeMs, 0) / repTrials.length) : 0;
    const meanNovRT = novTrials.length > 0 ? (novTrials.reduce((s, t) => s + t.reactionTimeMs, 0) / novTrials.length) : 0;
    const cueingEffect = meanNovRT - meanRepRT; // Positive means faster on repeated!

    // Update stat cards
    DOM.statTotalTrials.textContent = totalTrials;
    DOM.statBlocksSub.textContent = `${state.config.blockCount} Blocks (32 trials/block)`;
    DOM.statAccuracy.textContent = `${overallAcc.toFixed(1)}%`;
    DOM.statAccuracySub.textContent = `${correctTrials.length} of ${totalTrials} correct`;
    DOM.statMeanRT.textContent = `${Math.round(meanRT)} ms`;
    DOM.statCueingDiff.textContent = `${cueingEffect >= 0 ? '+' : ''}${Math.round(cueingEffect)} ms`;
    DOM.statCueingSub.textContent = cueingEffect >= 0 
      ? 'Contextual Cueing Benefit (Repeated faster)' 
      : 'Novel vs Repeated RT difference';

    // Render SVG Charts
    renderCueingChart(validTrials);
    renderSetSizeChart(validTrials);

    // Populate Data Tables
    renderDataTable();
    renderRepeatedLayoutsTable();
  }

  function renderCueingChart(trials) {
    const blockCount = state.config.blockCount;
    const blockData = [];

    for (let b = 1; b <= blockCount; b++) {
      const bTrials = trials.filter(t => t.blockNumber === b && t.isCorrect === 1);
      const rep = bTrials.filter(t => t.configurationType === 'repeated');
      const nov = bTrials.filter(t => t.configurationType === 'novel');

      const repMean = rep.length ? rep.reduce((s, t) => s + t.reactionTimeMs, 0) / rep.length : 0;
      const novMean = nov.length ? nov.reduce((s, t) => s + t.reactionTimeMs, 0) / nov.length : 0;

      blockData.push({ block: b, repMean, novMean });
    }

    const allMeans = blockData.flatMap(d => [d.repMean, d.novMean]).filter(v => v > 0);
    const minRT = Math.max(0, Math.min(...allMeans) * 0.8);
    const maxRT = Math.max(...allMeans, 1200) * 1.15;

    const width = 460;
    const height = 220;
    const pad = { top: 20, right: 30, bottom: 40, left: 60 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    const getX = (bIdx) => pad.left + (bIdx / Math.max(1, blockCount - 1)) * chartW;
    const getY = (val) => pad.top + chartH - ((val - minRT) / (maxRT - minRT || 1)) * chartH;

    let repPoints = '';
    let novPoints = '';
    blockData.forEach((d, idx) => {
      const x = blockCount === 1 ? pad.left + chartW / 2 : getX(idx);
      if (d.repMean > 0) repPoints += `${x},${getY(d.repMean)} `;
      if (d.novMean > 0) novPoints += `${x},${getY(d.novMean)} `;
    });

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">
      <!-- Grid lines -->
      <line x1="${pad.left}" y1="${pad.top}" x2="${width - pad.right}" y2="${pad.top}" stroke="rgba(255,255,255,0.08)" />
      <line x1="${pad.left}" y1="${pad.top + chartH/2}" x2="${width - pad.right}" y2="${pad.top + chartH/2}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4" />
      <line x1="${pad.left}" y1="${pad.top + chartH}" x2="${width - pad.right}" y2="${pad.top + chartH}" stroke="rgba(255,255,255,0.15)" />
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="rgba(255,255,255,0.15)" />

      <!-- Y Axis Labels -->
      <text x="${pad.left - 10}" y="${pad.top + 4}" fill="#94a3b8" font-size="10" text-anchor="end" font-family="monospace">${Math.round(maxRT)}ms</text>
      <text x="${pad.left - 10}" y="${pad.top + chartH/2 + 4}" fill="#94a3b8" font-size="10" text-anchor="end" font-family="monospace">${Math.round((maxRT+minRT)/2)}ms</text>
      <text x="${pad.left - 10}" y="${pad.top + chartH}" fill="#94a3b8" font-size="10" text-anchor="end" font-family="monospace">${Math.round(minRT)}ms</text>

      <!-- Polyline Repeated -->
      <polyline fill="none" stroke="#38bdf8" stroke-width="3" points="${repPoints.trim()}" stroke-linecap="round" />
      <!-- Polyline Novel -->
      <polyline fill="none" stroke="#f59e0b" stroke-width="3" points="${novPoints.trim()}" stroke-dasharray="5 3" stroke-linecap="round" />
    `;

    // Data points & X axis labels
    blockData.forEach((d, idx) => {
      const x = blockCount === 1 ? pad.left + chartW / 2 : getX(idx);
      if (d.repMean > 0) {
        svg += `<circle cx="${x}" cy="${getY(d.repMean)}" r="4" fill="#38bdf8" />`;
      }
      if (d.novMean > 0) {
        svg += `<circle cx="${x}" cy="${getY(d.novMean)}" r="4" fill="#f59e0b" />`;
      }
      svg += `<text x="${x}" y="${pad.top + chartH + 18}" fill="#94a3b8" font-size="10" text-anchor="middle">B${d.block}</text>`;
    });

    // Legend
    svg += `
      <g transform="translate(${pad.left + 20}, ${pad.top + 10})">
        <line x1="0" y1="0" x2="16" y2="0" stroke="#38bdf8" stroke-width="3" />
        <circle cx="8" cy="0" r="3" fill="#38bdf8" />
        <text x="22" y="3" fill="#cbd5e1" font-size="10">Repeated</text>

        <line x1="90" y1="0" x2="106" y2="0" stroke="#f59e0b" stroke-width="3" stroke-dasharray="4 2" />
        <circle cx="98" cy="0" r="3" fill="#f59e0b" />
        <text x="112" y="3" fill="#cbd5e1" font-size="10">Novel</text>
      </g>
    </svg>`;

    DOM.cueingChartContainer.innerHTML = svg;
  }

  function renderSetSizeChart(trials) {
    const s1 = parseInt(state.config.setSize1, 10);
    const s2 = parseInt(state.config.setSize2, 10);

    const s1Trials = trials.filter(t => t.setSize === s1 && t.isCorrect === 1);
    const s2Trials = trials.filter(t => t.setSize === s2 && t.isCorrect === 1);

    const m1 = s1Trials.length ? s1Trials.reduce((s, t) => s + t.reactionTimeMs, 0) / s1Trials.length : 0;
    const m2 = s2Trials.length ? s2Trials.reduce((s, t) => s + t.reactionTimeMs, 0) / s2Trials.length : 0;

    const slope = (s2 !== s1) ? ((m2 - m1) / (s2 - s1)) : 0;

    const width = 460;
    const height = 220;
    const pad = { top: 35, right: 40, bottom: 45, left: 65 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    const minRT = Math.max(0, Math.min(m1, m2) * 0.75);
    const maxRT = Math.max(m1, m2, 1000) * 1.2;

    const x1 = pad.left + chartW * 0.25;
    const x2 = pad.left + chartW * 0.75;
    const y1 = pad.top + chartH - ((m1 - minRT) / (maxRT - minRT || 1)) * chartH;
    const y2 = pad.top + chartH - ((m2 - minRT) / (maxRT - minRT || 1)) * chartH;

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">
        <!-- Axes -->
        <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="rgba(255,255,255,0.2)" />
        <line x1="${pad.left}" y1="${pad.top + chartH}" x2="${width - pad.right}" y2="${pad.top + chartH}" stroke="rgba(255,255,255,0.2)" />

        <!-- Horizontal Guide lines -->
        <line x1="${pad.left}" y1="${pad.top}" x2="${width - pad.right}" y2="${pad.top}" stroke="rgba(255,255,255,0.06)" />
        <line x1="${pad.left}" y1="${pad.top + chartH/2}" x2="${width - pad.right}" y2="${pad.top + chartH/2}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />

        <!-- Y Axis Ticks & Labels -->
        <text x="${pad.left - 10}" y="${pad.top + 4}" fill="#94a3b8" font-size="10" text-anchor="end" font-family="monospace">${Math.round(maxRT)}ms</text>
        <text x="${pad.left - 10}" y="${pad.top + chartH/2 + 4}" fill="#94a3b8" font-size="10" text-anchor="end" font-family="monospace">${Math.round((maxRT+minRT)/2)}ms</text>
        <text x="${pad.left - 10}" y="${pad.top + chartH + 3}" fill="#94a3b8" font-size="10" text-anchor="end" font-family="monospace">${Math.round(minRT)}ms</text>

        <!-- Search Slope Connecting Line -->
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" />

        <!-- Point 1 (Set Size 1) -->
        <circle cx="${x1}" cy="${y1}" r="6" fill="#38bdf8" stroke="#0f141c" stroke-width="2" />
        <text x="${x1}" y="${y1 - 12}" fill="#38bdf8" font-size="11" font-weight="bold" text-anchor="middle" font-family="monospace">${Math.round(m1)} ms</text>
        <text x="${x1}" y="${pad.top + chartH + 20}" fill="#cbd5e1" font-size="11" text-anchor="middle">Set Size ${s1}</text>

        <!-- Point 2 (Set Size 2) -->
        <circle cx="${x2}" cy="${y2}" r="6" fill="#c084fc" stroke="#0f141c" stroke-width="2" />
        <text x="${x2}" y="${y2 - 12}" fill="#c084fc" font-size="11" font-weight="bold" text-anchor="middle" font-family="monospace">${Math.round(m2)} ms</text>
        <text x="${x2}" y="${pad.top + chartH + 20}" fill="#cbd5e1" font-size="11" text-anchor="middle">Set Size ${s2}</text>

        <!-- Prominent Search Slope Callout -->
        <g transform="translate(${width / 2}, 18)">
          <rect x="-105" y="-14" width="210" height="24" rx="12" fill="rgba(56, 189, 248, 0.15)" stroke="rgba(56, 189, 248, 0.35)" />
          <text x="0" y="2" fill="#38bdf8" font-size="11" font-weight="bold" text-anchor="middle" font-family="monospace">
            Search Slope: ${slope >= 0 ? '+' : ''}${slope.toFixed(1)} ms / item
          </text>
        </g>
      </svg>
    `;
    DOM.setSizeChartContainer.innerHTML = svg;
  }

  function renderDataTable() {
    const tbody = DOM.trialTableBody;
    tbody.innerHTML = '';

    state.trialResults.forEach((t, idx) => {
      const tr = document.createElement('tr');
      const trajPoints = t.mouseTrajectory ? t.mouseTrajectory.length : 0;
      const configTag = t.configurationType === 'repeated'
        ? `<span class="tag tag-rep">Rep (Q${t.targetQuadrant})</span>`
        : `<span class="tag tag-nov">Nov</span>`;

      const trajCell = state.config.responseMode === 'mouse_click'
        ? `<a href="#" class="traj-link" data-index="${idx}" style="color:var(--accent-emerald); font-weight:600; text-decoration:none;">${trajPoints} pts &rarr;</a>`
        : `<span style="color:var(--text-muted);">&mdash;</span>`;

      tr.innerHTML = `
        <td>${t.isPractice ? 'Prac' : t.blockNumber}</td>
        <td>${t.trialInBlock}</td>
        <td>Q${t.targetQuadrant}</td>
        <td>${t.targetLocation}</td>
        <td>${t.targetOrientation}</td>
        <td>${configTag}</td>
        <td>${t.setSize}</td>
        <td>${t.soundFactor}</td>
        <td>${t.response}</td>
        <td style="color:${t.isCorrect ? '#34d399' : '#f87171'}">${t.isCorrect ? '1' : '0'}</td>
        <td>${t.reactionTimeMs}</td>
        <td>${trajCell}</td>
      `;
      tbody.appendChild(tr);
    });

    // Attach click handlers to trajectory links
    document.querySelectorAll('.traj-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const index = parseInt(link.getAttribute('data-index'), 10);
        showTrajectoryModal(index);
      });
    });
  }

  function renderRepeatedLayoutsTable() {
    const tbody = DOM.layoutsTableBody;
    if (!tbody) return;
    tbody.innerHTML = '';

    const configKeys = Object.keys(state.repeatedConfigurations);
    configKeys.sort((a, b) => {
      const cfgA = state.repeatedConfigurations[a];
      const cfgB = state.repeatedConfigurations[b];
      if (cfgA.quadrant !== cfgB.quadrant) return cfgA.quadrant - cfgB.quadrant;
      if (cfgA.setSize !== cfgB.setSize) return cfgA.setSize - cfgB.setSize;
      return cfgA.soundFactor.localeCompare(cfgB.soundFactor);
    });

    configKeys.forEach(key => {
      const cfg = state.repeatedConfigurations[key];
      const tr = document.createElement('tr');

      const candidates = cfg.candidateLocations || QUADRANT_LOCATIONS[cfg.quadrant] || [];
      const candStr = candidates.map(c => `(${c.row},${c.col})`).join(' ');

      const distStr = cfg.distractorLocations.map(d => `(${d.row},${d.col}@${d.orientation}°) `).join('');
      const historyStr = cfg.targetLocationsByBlock
        ? Object.entries(cfg.targetLocationsByBlock).map(([b, l]) => `B${b}:(${l.row},${l.col})`).join(', ')
        : 'None';

      tr.innerHTML = `
        <td><strong style="color:var(--quadrant-${cfg.quadrant})">Quadrant ${cfg.quadrant}</strong></td>
        <td><code>${cfg.configId}</code></td>
        <td>${cfg.setSize}</td>
        <td>${cfg.soundFactor}</td>
        <td style="font-size:0.75rem; color:var(--text-secondary);">${candStr}</td>
        <td style="font-size:0.75rem; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${distStr}">${distStr}</td>
        <td style="font-size:0.75rem; color:var(--accent-emerald);">${historyStr}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function showTrajectoryModal(trialIndex) {
    const t = state.trialResults[trialIndex];
    if (!t || !t.mouseTrajectory) return;

    DOM.modalTitle.textContent = `Trial ${t.totalTrialNumber} Mouse Trajectory (Block ${t.blockNumber})`;
    DOM.modalSubtitle.textContent = `Target: ${t.targetLocation} in Q${t.targetQuadrant} | Set Size: ${t.setSize} | RT: ${t.reactionTimeMs} ms | ${t.mouseTrajectory.length} coordinates logged`;

    // Coordinates JSON text display
    DOM.modalCoordinatesContent.textContent = JSON.stringify(t.mouseTrajectory, null, 2);

    // Plot trajectory SVG
    renderTrajectorySVG(t);

    DOM.trajectoryModal.classList.add('active');
  }

  function renderTrajectorySVG(trial) {
    const pts = trial.mouseTrajectory;
    const container = DOM.trajectoryPlotContainer;
    if (!pts || pts.length === 0) {
      container.innerHTML = '<p class="form-help">No mouse trajectory data recorded for this trial.</p>';
      return;
    }

    const w = 400;
    const h = 180;
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, state.canvasSize || 720);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, state.canvasSize || 720);

    const scaleX = (x) => 20 + ((x - minX) / (maxX - minX || 1)) * (w - 40);
    const scaleY = (y) => 20 + ((y - minY) / (maxY - minY || 1)) * (h - 40);

    let pathD = '';
    pts.forEach((p, i) => {
      const sx = scaleX(p.x);
      const sy = scaleY(p.y);
      if (i === 0) pathD += `M ${sx} ${sy} `;
      else pathD += `L ${sx} ${sy} `;
    });

    const startPt = pts[0];
    const endPt = pts[pts.length - 1];

    const svg = `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:100%; background: #0c1017; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
        <path d="${pathD}" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${scaleX(startPt.x)}" cy="${scaleY(startPt.y)}" r="5" fill="#38bdf8" />
        <text x="${scaleX(startPt.x) + 8}" y="${scaleY(startPt.y) + 4}" fill="#38bdf8" font-size="10">Start (0ms)</text>
        <circle cx="${scaleX(endPt.x)}" cy="${scaleY(endPt.y)}" r="5" fill="#f43f5e" />
        <text x="${scaleX(endPt.x) + 8}" y="${scaleY(endPt.y) + 4}" fill="#f43f5e" font-size="10">Click (${endPt.t}ms)</text>
      </svg>
    `;
    container.innerHTML = svg;
  }

  // =========================================================================
  // 9. CSV & JSON EXPORT (RFC 4180 COMPLIANT)
  // =========================================================================
  function exportCSV() {
    if (state.trialResults.length === 0) {
      alert('No experiment data available to download.');
      return;
    }

    const headers = [
      'participant_id',
      'session_timestamp',
      'block_number',
      'is_practice',
      'trial_in_block',
      'total_trial_number',
      'target_quadrant',
      'target_location',
      'target_row',
      'target_col',
      'target_orientation',
      'target_jitter_x',
      'target_jitter_y',
      'configuration_type',
      'configuration_id',
      'set_size',
      'sound_factor',
      'response_mode',
      'response',
      'is_correct',
      'reaction_time_ms',
      'mouse_trajectory'
    ];

    const rows = state.trialResults.map(t => {
      // Mouse trajectory formatting
      let trajString = '';
      if (t.responseMode === 'mouse_click' && t.mouseTrajectory && t.mouseTrajectory.length > 0) {
        // Formatted JSON string inside quotes for CSV compatibility
        trajString = JSON.stringify(t.mouseTrajectory);
      }

      return [
        escapeCSV(t.participantId),
        escapeCSV(t.sessionTimestamp),
        t.blockNumber,
        t.isPractice ? 1 : 0,
        t.trialInBlock,
        t.totalTrialNumber,
        t.targetQuadrant,
        escapeCSV(t.targetLocation),
        t.targetRow,
        t.targetCol,
        escapeCSV(t.targetOrientation),
        t.targetJitterX || 0,
        t.targetJitterY || 0,
        escapeCSV(t.configurationType),
        escapeCSV(t.configurationId),
        t.setSize,
        escapeCSV(t.soundFactor),
        escapeCSV(t.responseMode),
        escapeCSV(t.response),
        t.isCorrect,
        t.reactionTimeMs,
        escapeCSV(trajString) // Emitted empty string if keypress mode per requirements!
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `ks_visual_search_${state.config.participantId}_${formatDate(new Date())}.csv`;

    downloadBlob(blob, filename);
  }

  function exportRepeatedLayoutsCSV() {
    const configKeys = Object.keys(state.repeatedConfigurations);
    if (configKeys.length === 0) {
      alert('No repeated layout configurations recorded yet.');
      return;
    }

    // Sort by quadrant (1, 2, 3, 4), then set size, then sound
    configKeys.sort((a, b) => {
      const cfgA = state.repeatedConfigurations[a];
      const cfgB = state.repeatedConfigurations[b];
      if (cfgA.quadrant !== cfgB.quadrant) return cfgA.quadrant - cfgB.quadrant;
      if (cfgA.setSize !== cfgB.setSize) return cfgA.setSize - cfgB.setSize;
      return cfgA.soundFactor.localeCompare(cfgB.soundFactor);
    });

    const headers = [
      'participant_id',
      'target_quadrant',
      'configuration_id',
      'set_size',
      'sound_factor',
      'item_type',
      'item_index',
      'row',
      'col',
      'grid_location',
      'orientation_deg',
      'jitter_x',
      'jitter_y',
      'target_history_across_blocks'
    ];

    const rows = [];

    configKeys.forEach(key => {
      const cfg = state.repeatedConfigurations[key];
      const quad = cfg.quadrant;
      const historyStr = cfg.targetLocationsByBlock
        ? Object.entries(cfg.targetLocationsByBlock).map(([blk, loc]) => `Block${blk}:(${loc.row},${loc.col})`).join('; ')
        : '';

      // 1. Output the 4 candidate target locations for this quadrant
      const candidates = cfg.candidateLocations || QUADRANT_LOCATIONS[quad] || [];
      candidates.forEach((cand, idx) => {
        rows.push([
          escapeCSV(state.config.participantId),
          quad,
          escapeCSV(cfg.configId),
          cfg.setSize,
          escapeCSV(cfg.soundFactor),
          'target_candidate_cell',
          idx + 1,
          cand.row,
          cand.col,
          escapeCSV(`(${cand.row},${cand.col})`),
          'random_tilted_90',
          cand.jitterX || 0,
          cand.jitterY || 0,
          escapeCSV(historyStr)
        ].join(','));
      });

      // 2. Output all frozen distractor L's for this repeated configuration
      cfg.distractorLocations.forEach((dist, idx) => {
        rows.push([
          escapeCSV(state.config.participantId),
          quad,
          escapeCSV(cfg.configId),
          cfg.setSize,
          escapeCSV(cfg.soundFactor),
          'distractor_L',
          idx + 1,
          dist.row,
          dist.col,
          escapeCSV(`(${dist.row},${dist.col})`),
          dist.orientation,
          dist.jitterX || 0,
          dist.jitterY || 0,
          escapeCSV(historyStr)
        ].join(','));
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `ks_repeated_layouts_${state.config.participantId}_${formatDate(new Date())}.csv`;

    downloadBlob(blob, filename);
  }

  function exportJSON() {
    if (state.trialResults.length === 0) return;

    const dataObj = {
      experiment: 'KS Contextual Cueing Visual Search',
      config: state.config,
      totalTrials: state.trialResults.length,
      trials: state.trialResults
    };

    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json;charset=utf-8;' });
    const filename = `ks_visual_search_${state.config.participantId}_${formatDate(new Date())}.json`;
    downloadBlob(blob, filename);
  }

  function escapeCSV(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function formatDate(d) {
    return d.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  // =========================================================================
  // 10. INTERACTIVE 12x12 GRID PREVIEW
  // =========================================================================
  function renderGridPreview(highlightSample = false) {
    const container = DOM.gridPreview;
    container.innerHTML = '';

    // If highlighting sample display, pick a quadrant and sample distractors
    let sampleTarget = null;
    let sampleDistractors = [];
    if (highlightSample) {
      const q = [1, 2, 3, 4][Math.floor(Math.random() * 4)];
      const locs = QUADRANT_LOCATIONS[q];
      sampleTarget = locs[Math.floor(Math.random() * locs.length)];
      const sSize = parseInt(DOM.setSize1.value, 10) || 8;
      sampleDistractors = sampleDistractorsPreview(sSize - 1, q, sampleTarget);
    }

    const distractorMap = new Map();
    sampleDistractors.forEach(d => distractorMap.set(`${d.row},${d.col}`, d));

    for (let r = 1; r <= GRID_ROWS; r++) {
      for (let c = 1; c <= GRID_COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';

        // Check if this cell is a candidate target location in one of the 4 quadrants
        const candidate = ALL_CANDIDATE_TARGETS.find(item => item.row === r && item.col === c);
        if (candidate) {
          cell.classList.add(`quadrant-${candidate.quadrant}`);
          cell.textContent = `Q${candidate.quadrant}`;
          cell.title = `Quadrant ${candidate.quadrant} candidate (${r},${c})`;
        }

        // If rendering sample preview
        if (highlightSample) {
          if (sampleTarget && sampleTarget.row === r && sampleTarget.col === c) {
            cell.textContent = 'T';
            cell.style.background = '#f43f5e';
            cell.style.borderColor = '#fda4af';
            cell.style.color = '#fff';
            cell.title = `Target T (${r},${c})`;
          } else if (distractorMap.has(`${r},${c}`)) {
            cell.textContent = 'L';
            cell.style.background = 'rgba(255,255,255,0.2)';
            cell.style.color = '#fff';
            cell.title = `Distractor L (${r},${c})`;
          }
        }

        container.appendChild(cell);
      }
    }
  }

  function sampleDistractorsPreview(count, targetQuad, targetLoc) {
    const forbidden = new Set();
    QUADRANT_LOCATIONS[targetQuad].forEach(l => forbidden.add(`${l.row},${l.col}`));
    forbidden.add(`${targetLoc.row},${targetLoc.col}`);

    const avail = [];
    for (let r = 1; r <= GRID_ROWS; r++) {
      for (let c = 1; c <= GRID_COLS; c++) {
        if (!forbidden.has(`${r},${c}`)) avail.push({ row: r, col: c });
      }
    }
    shuffleArray(avail);
    return avail.slice(0, count);
  }

  // =========================================================================
  // 11. VIEW NAVIGATION & EVENT LISTENERS
  // =========================================================================
  function showView(viewName) {
    DOM.setupView.classList.remove('active');
    DOM.instructionsView.classList.remove('active');
    DOM.experimentView.classList.remove('active');
    DOM.breakView.classList.remove('active');
    DOM.debriefView.classList.remove('active');

    if (viewName === 'setup') {
      DOM.setupView.classList.add('active');
      DOM.appModeBadge.style.display = 'inline-flex';
      DOM.appModeText.textContent = 'Configuration Mode';
    } else if (viewName === 'instructions') {
      DOM.instructionsView.classList.add('active');
      DOM.appModeBadge.style.display = 'inline-flex';
      DOM.appModeText.textContent = 'Participant Instructions';
    } else if (viewName === 'experiment') {
      DOM.experimentView.classList.add('active');
      DOM.appModeBadge.style.display = 'none';
    } else if (viewName === 'break') {
      DOM.breakView.classList.add('active');
      DOM.appModeBadge.style.display = 'none';
    } else if (viewName === 'debrief') {
      DOM.debriefView.classList.add('active');
      DOM.appModeBadge.style.display = 'inline-flex';
      DOM.appModeText.textContent = 'Session Complete';
    }
  }

  function updateInstructionsText() {
    const mode = document.querySelector('input[name="responseMode"]:checked').value;
    if (mode === 'keypress') {
      const leftKey = DOM.keyTiltLeft.value.trim() || 'ArrowLeft';
      const rightKey = DOM.keyTiltRight.value.trim() || 'ArrowRight';
      DOM.instructionResponseTitle.textContent = 'Respond Using Keyboard';
      DOM.instructionResponseDesc.innerHTML = `
        Press the corresponding keyboard key as soon as you spot the target <strong>T</strong>:<br>
        <kbd style="background:#222; padding:3px 8px; border-radius:4px; border:1px solid #555; color:#38bdf8;">${leftKey}</kbd> for T tilted left (90&deg;), or 
        <kbd style="background:#222; padding:3px 8px; border-radius:4px; border:1px solid #555; color:#38bdf8;">${rightKey}</kbd> for T tilted right (90&deg;).
      `;
    } else {
      DOM.instructionResponseTitle.textContent = 'Respond by Clicking with the Mouse';
      DOM.instructionResponseDesc.innerHTML = `
        Search for the target <strong>T</strong> and <strong>click directly on its location</strong> in the grid as quickly and accurately as possible.
        Your mouse movement path is continuously measured.
      `;
    }
  }

  function setupEventListeners() {
    // Response mode radio card toggles
    DOM.radioCardKeypress.addEventListener('click', () => {
      document.querySelector('input[value="keypress"]').checked = true;
      DOM.radioCardKeypress.classList.add('selected');
      DOM.radioCardMouse.classList.remove('selected');
      DOM.keyConfigGroup.style.display = 'block';
      updateSummary();
    });

    DOM.radioCardMouse.addEventListener('click', () => {
      document.querySelector('input[value="mouse_click"]').checked = true;
      DOM.radioCardMouse.classList.add('selected');
      DOM.radioCardKeypress.classList.remove('selected');
      DOM.keyConfigGroup.style.display = 'none';
      updateSummary();
    });

    // Inputs change listeners
    DOM.blockCount.addEventListener('input', updateSummary);
    DOM.setSize1.addEventListener('input', updateSummary);
    DOM.setSize2.addEventListener('input', updateSummary);
    DOM.includePractice.addEventListener('change', updateSummary);

    function updateSummary() {
      const blocks = Math.max(1, Math.min(30, parseInt(DOM.blockCount.value, 10) || 2));
      const trials = blocks * TRIALS_PER_BLOCK;
      const s1 = DOM.setSize1.value || 8;
      const s2 = DOM.setSize2.value || 16;
      DOM.factorSetSizeLabel.textContent = `2 Levels (${s1} vs ${s2})`;
      const prac = DOM.includePractice.checked ? ' + Practice Block (8 trials)' : '';
      DOM.sessionSummaryText.textContent = `Ready to start: ${blocks} Block${blocks > 1 ? 's' : ''} • ${trials} Total Trials${prac}`;
    }

    // Audio test buttons
    DOM.btnTestSound1.addEventListener('click', () => playSound('Sound1'));
    DOM.btnTestSound2.addEventListener('click', () => playSound('Sound2'));

    // Grid preview generator
    DOM.btnGeneratePreview.addEventListener('click', () => {
      renderGridPreview(true);
      DOM.gridPreviewStatus.textContent = 'Sample trial preview generated: Target "T" shown in red, distractor "L"s in light boxes.';
    });

    // Navigation buttons
    DOM.btnProceedToInstructions.addEventListener('click', () => {
      updateInstructionsText();
      showView('instructions');
    });

    DOM.btnBackToConfig.addEventListener('click', () => {
      showView('setup');
    });

    DOM.btnStartExperimentNow.addEventListener('click', () => {
      // Ensure audio context is unlocked
      if (state.audio.ctx && state.audio.ctx.state === 'suspended') {
        state.audio.ctx.resume();
      }
      startExperimentSession();
    });

    DOM.btnResumeNextBlock.addEventListener('click', resumeNextBlock);

    // Debrief actions
    DOM.btnDownloadCSV.addEventListener('click', exportCSV);
    if (DOM.btnDownloadLayoutsCSV) DOM.btnDownloadLayoutsCSV.addEventListener('click', exportRepeatedLayoutsCSV);
    if (DOM.btnDownloadLayoutsCSV2) DOM.btnDownloadLayoutsCSV2.addEventListener('click', exportRepeatedLayoutsCSV);
    DOM.btnDownloadJSON.addEventListener('click', exportJSON);
    DOM.btnResetExperiment.addEventListener('click', () => {
      // Increment participant ID
      const currentId = DOM.participantId.value;
      const match = currentId.match(/(\d+)$/);
      if (match) {
        const nextNum = String(parseInt(match[1], 10) + 1).padStart(match[1].length, '0');
        DOM.participantId.value = currentId.replace(/(\d+)$/, nextNum);
      } else {
        DOM.participantId.value = 'SUBJ_' + Date.now().toString().slice(-4);
      }
      showView('setup');
      renderGridPreview(false);
    });

    // Modal controls
    DOM.btnCloseModal.addEventListener('click', () => DOM.trajectoryModal.classList.remove('active'));
    DOM.btnCloseModalBtn.addEventListener('click', () => DOM.trajectoryModal.classList.remove('active'));

    // Keyboard & Mouse Listeners
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('mousemove', handleMouseMove);
    DOM.searchCanvas.addEventListener('click', handleCanvasClick);

    // Fullscreen toggle
    DOM.fullscreenToggleBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });

    // Theme toggle
    DOM.themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      if (DOM.searchCanvas) setupCanvasDPI();
    });

    window.addEventListener('resize', () => {
      if (DOM.experimentView.classList.contains('active')) {
        setupCanvasDPI();
        const currentBlockObj = state.blocks[state.currentBlockIdx];
        if (currentBlockObj && state.trialActive) {
          const currentTrial = currentBlockObj.trials[state.currentTrialIdx];
          if (currentTrial) renderSearchDisplay(currentTrial);
        }
      }
    });
  }

  // =========================================================================
  // 12. INITIALIZATION ON PAGE LOAD
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    initAudio();
    renderGridPreview(false);
    setupEventListeners();
  });

})();
