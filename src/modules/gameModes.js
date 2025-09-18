import { DATA } from './data.js';
import { sfx } from './sfx.js';

export class GameModes {
  constructor(state, updateScore) {
    this.state = state;
    this.updateScore = updateScore;
    this.currentMode = null;
    this.matchedPairs = new Set();
    this.flippedTiles = [];
    this.draggedElement = null;
  }

  // Initialize game mode
  startMode(mode) {
    this.currentMode = mode;
    this.hideAllModes();

    switch(mode) {
      case 'quiz':
        this.startQuizMode();
        break;
      case 'match':
        this.startMatchMode();
        break;
      case 'spin':
        this.startSpinMode();
        break;
      case 'drag':
        this.startDragMode();
        break;
    }
  }

  hideAllModes() {
    document.querySelectorAll('.game-mode').forEach(mode => mode.classList.add('hidden'));
    document.querySelector('.game-modes').classList.add('hidden');
  }

  // QUIZ MODE (existing functionality)
  startQuizMode() {
    document.getElementById('quizGame').classList.remove('hidden');
    this.nextQuizQuestion();
  }

  nextQuizQuestion() {
    // This uses the existing quiz logic from main.js
    return 'quiz';
  }

  // TILE MATCH MODE - Match ages to ranges
  startMatchMode() {
    document.getElementById('matchGame').classList.remove('hidden');
    this.matchedPairs.clear();
    this.flippedTiles = [];
    this.createMatchGrid();
  }

  createMatchGrid() {
    const grid = document.getElementById('matchGrid');
    grid.innerHTML = '';

    // Get pairs of ages and their corresponding values
    const pairs = this.getAgeValuePairs();

    // Create tiles array with both age and value tiles
    const tiles = [];
    pairs.forEach((pair, index) => {
      tiles.push({
        id: `pair-${index}`,
        type: 'age',
        display: pair.age,
        pairId: index
      });
      tiles.push({
        id: `pair-${index}`,
        type: 'value',
        display: pair.value,
        pairId: index
      });
    });

    // Shuffle tiles
    const shuffled = tiles.sort(() => Math.random() - 0.5);

    shuffled.forEach((tile, index) => {
      const tileElement = document.createElement('div');
      tileElement.className = 'match-tile';
      tileElement.dataset.pairId = tile.pairId;
      tileElement.dataset.type = tile.type;
      tileElement.dataset.id = index;

      const tileInner = document.createElement('div');
      tileInner.className = 'tile-inner';

      const tileFront = document.createElement('div');
      tileFront.className = 'tile-front';
      tileFront.innerHTML = tile.type === 'age' ? '👶' : '📊';

      const tileBack = document.createElement('div');
      tileBack.className = 'tile-back';

      // Style differently based on type
      if (tile.type === 'age') {
        tileBack.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        tileBack.innerHTML = `<div style="font-size: 0.9rem; font-weight: 600;">${tile.display}</div>`;
      } else {
        tileBack.style.background = 'linear-gradient(135deg, #00d4ff, #0284c7)';
        tileBack.innerHTML = `<div style="font-size: 1.1rem; font-weight: 700;">${tile.display}</div>`;
      }

      tileInner.appendChild(tileFront);
      tileInner.appendChild(tileBack);
      tileElement.appendChild(tileInner);

      tileElement.addEventListener('click', () => this.flipTile(tileElement));
      grid.appendChild(tileElement);
    });
  }

  flipTile(tile) {
    if (this.flippedTiles.length >= 2) return;
    if (tile.classList.contains('flipped') || tile.classList.contains('matched')) return;

    tile.classList.add('flipped');
    this.flippedTiles.push(tile);

    if (this.flippedTiles.length === 2) {
      this.checkMatch();
    }
  }

  checkMatch() {
    const [tile1, tile2] = this.flippedTiles;

    // Check if they're a matching pair (same pairId but different types)
    const match = tile1.dataset.pairId === tile2.dataset.pairId &&
                  tile1.dataset.type !== tile2.dataset.type;

    setTimeout(() => {
      if (match) {
        tile1.classList.add('matched');
        tile2.classList.add('matched');
        this.matchedPairs.add(tile1.dataset.pairId);
        this.state.score += 10;
        this.state.correct++;
        sfx.correct();

        // Check if all pairs are matched
        if (this.matchedPairs.size >= 8) {
          this.completeMode();
        }
      } else {
        tile1.classList.remove('flipped');
        tile2.classList.remove('flipped');
        sfx.wrong();
      }

      this.flippedTiles = [];
      this.state.total++;
      this.updateScore();
    }, 1000);
  }

  // SPIN TILES MODE
  startSpinMode() {
    document.getElementById('spinGame').classList.remove('hidden');
    this.createSpinQuestion();
  }

  createSpinQuestion() {
    const data = this.getRandomData();
    const question = this.getQuestionForData(data);

    document.getElementById('spinQuestion').textContent = question.text;

    const tilesContainer = document.getElementById('spinTiles');
    tilesContainer.innerHTML = '';

    // Create tiles with ages and values
    const tiles = this.getSpinTiles(data);

    tiles.forEach(tile => {
      const tileElement = document.createElement('div');
      tileElement.className = 'spin-tile';
      tileElement.dataset.correct = tile.correct;

      tileElement.innerHTML = `
        <div style="font-size: 0.8rem; opacity: 0.8;">${tile.age}</div>
        <div style="font-size: 1.1rem; font-weight: 700;">${tile.value}</div>
      `;

      tileElement.addEventListener('click', () => this.spinAndCheck(tileElement, tile.correct));
      tilesContainer.appendChild(tileElement);
    });
  }

  spinAndCheck(tile, isCorrect) {
    tile.classList.add('spinning');

    setTimeout(() => {
      tile.classList.remove('spinning');

      if (isCorrect) {
        tile.classList.add('correct');
        this.state.score += 15;
        this.state.correct++;
        this.state.streak++;
        sfx.correct();

        setTimeout(() => this.createSpinQuestion(), 1500);
      } else {
        tile.classList.add('incorrect');
        this.state.streak = 0;
        sfx.wrong();

        setTimeout(() => {
          tile.classList.remove('incorrect');
        }, 1000);
      }

      this.state.total++;
      this.updateScore();
    }, 600);
  }

  // DRAG & DROP MODE
  startDragMode() {
    document.getElementById('dragGame').classList.remove('hidden');
    this.createDragGame();
  }

  createDragGame() {
    const sourceContainer = document.getElementById('dragSource');
    const targetsContainer = document.getElementById('dragTargets');

    sourceContainer.innerHTML = '';
    targetsContainer.innerHTML = '';

    // Get age-value pairs for drag and drop
    const pairs = this.getDragPairs();

    // Create value tiles (to be dragged)
    pairs.forEach((pair, index) => {
      const element = document.createElement('div');
      element.className = 'drag-tile';
      element.draggable = true;
      element.innerHTML = `
        <div style="font-size: 1.2rem; font-weight: 700;">${pair.value}</div>
      `;
      element.dataset.pairId = index;

      element.addEventListener('dragstart', (e) => this.handleDragStart(e));
      element.addEventListener('dragend', (e) => this.handleDragEnd(e));

      sourceContainer.appendChild(element);
    });

    // Create age drop zones
    pairs.forEach((pair, index) => {
      const dropZone = document.createElement('div');
      dropZone.className = 'drop-zone';
      dropZone.dataset.pairId = index;
      dropZone.innerHTML = `
        <div class="drop-label">${pair.age}</div>
        <div class="drop-placeholder">Drop range here</div>
      `;

      dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
      dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      dropZone.addEventListener('drop', (e) => this.handleDrop(e));

      targetsContainer.appendChild(dropZone);
    });
  }

  handleDragStart(e) {
    this.draggedElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.pairId);
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
  }

  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    const dropZone = e.currentTarget;
    dropZone.classList.remove('drag-over');

    if (!this.draggedElement) return;

    const draggedId = this.draggedElement.dataset.pairId;
    const dropId = dropZone.dataset.pairId;

    if (draggedId === dropId) {
      // Remove placeholder
      const placeholder = dropZone.querySelector('.drop-placeholder');
      if (placeholder) placeholder.remove();

      // Add the tile to the drop zone
      dropZone.appendChild(this.draggedElement);
      dropZone.classList.add('has-tile');
      this.draggedElement.draggable = false;
      this.draggedElement.classList.add('placed');

      this.state.score += 20;
      this.state.correct++;
      sfx.correct();

      // Check if all tiles placed
      if (document.querySelectorAll('.drag-source .drag-tile').length === 0) {
        this.completeMode();
      }
    } else {
      sfx.wrong();
      this.draggedElement.classList.add('incorrect');
      setTimeout(() => {
        this.draggedElement.classList.remove('incorrect');
      }, 500);
    }

    this.state.total++;
    this.updateScore();
    this.draggedElement = null;
  }

  // Helper methods
  getAgeValuePairs() {
    const pairs = [];
    const dataToUse = DATA.slice(0, 8);

    dataToUse.forEach(item => {
      let value = '';

      switch(this.state.currentTopic) {
        case 'hr-awake':
          value = `${item.hr.awake} bpm`;
          break;
        case 'hr-sleep':
          if (item.hr.sleep) {
            value = `${item.hr.sleep} bpm`;
          }
          break;
        case 'rr':
          value = `${item.rr} breaths/min`;
          break;
        case 'sbp':
          value = `${item.sbp} mmHg`;
          break;
        case 'temp':
          value = item.temp;
          break;
        case 'approach':
          value = item.approach.split(',')[0];
          break;
        default:
          value = `${item.hr.awake} bpm`;
      }

      if (value) {
        pairs.push({
          age: item.age,
          value: value
        });
      }
    });

    return pairs;
  }

  getRandomData() {
    return DATA[Math.floor(Math.random() * DATA.length)];
  }

  getQuestionForData(data) {
    let text = '';
    let correct = '';

    switch(this.state.currentTopic) {
      case 'hr-awake':
        text = `Which age group has an awake heart rate of`;
        correct = `${data.hr.awake} bpm`;
        break;
      case 'hr-sleep':
        text = `Which age group has a sleep heart rate of`;
        correct = `${data.hr.sleep} bpm`;
        break;
      case 'rr':
        text = `Which age group has a respiratory rate of`;
        correct = `${data.rr} breaths/min`;
        break;
      case 'sbp':
        text = `Which age group has a systolic BP of`;
        correct = `${data.sbp} mmHg`;
        break;
      default:
        text = `Which age group matches this value`;
        correct = data.age;
    }

    return { text: text + ' ' + correct + '?', correct: data.age, value: correct };
  }

  getSpinTiles(correctData) {
    const tiles = [];
    const allData = DATA.slice(0, 4);

    allData.forEach(data => {
      let value = '';

      switch(this.state.currentTopic) {
        case 'hr-awake':
          value = `${data.hr.awake} bpm`;
          break;
        case 'hr-sleep':
          value = `${data.hr.sleep} bpm`;
          break;
        case 'rr':
          value = `${data.rr}/min`;
          break;
        case 'sbp':
          value = `${data.sbp} mmHg`;
          break;
        default:
          value = `${data.hr.awake} bpm`;
      }

      tiles.push({
        age: data.age,
        value: value,
        correct: data.age === correctData.age
      });
    });

    return tiles;
  }

  getDragPairs() {
    const pairs = [];
    const dataToUse = DATA.slice(0, 4);

    dataToUse.forEach(item => {
      let value = '';

      switch(this.state.currentTopic) {
        case 'hr-awake':
          value = `${item.hr.awake} bpm`;
          break;
        case 'hr-sleep':
          if (item.hr.sleep) {
            value = `${item.hr.sleep} bpm`;
          }
          break;
        case 'rr':
          value = `${item.rr}/min`;
          break;
        case 'sbp':
          value = `${item.sbp} mmHg`;
          break;
        default:
          value = `${item.hr.awake} bpm`;
      }

      if (value) {
        pairs.push({
          age: item.age,
          value: value
        });
      }
    });

    // Shuffle the order of values but keep ages in order
    return pairs.sort(() => Math.random() - 0.5);
  }

  completeMode() {
    setTimeout(() => {
      alert(`Mode completed! Score: ${this.state.score}`);
      document.getElementById('nextQuestion').classList.remove('hidden');
    }, 1000);
  }
}