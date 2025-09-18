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

  // TILE MATCH MODE
  startMatchMode() {
    document.getElementById('matchGame').classList.remove('hidden');
    this.matchedPairs.clear();
    this.flippedTiles = [];
    this.createMatchGrid();
  }

  createMatchGrid() {
    const grid = document.getElementById('matchGrid');
    grid.innerHTML = '';

    // Get relevant data based on current topic
    let pairs = this.getTopicPairs();

    // Duplicate for pairs and shuffle
    const tiles = [...pairs, ...pairs].sort(() => Math.random() - 0.5);

    tiles.forEach((content, index) => {
      const tile = document.createElement('div');
      tile.className = 'match-tile';
      tile.dataset.content = content.value;
      tile.dataset.id = index;

      tile.innerHTML = `
        <div class="tile-front">?</div>
        <div class="tile-back">${content.display}</div>
      `;

      tile.addEventListener('click', () => this.flipTile(tile));
      grid.appendChild(tile);
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
    const match = tile1.dataset.content === tile2.dataset.content;

    setTimeout(() => {
      if (match) {
        tile1.classList.add('matched');
        tile2.classList.add('matched');
        this.matchedPairs.add(tile1.dataset.content);
        this.state.score += 10;
        this.state.correct++;
        sfx.correct();

        if (this.matchedPairs.size === 8) {
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

    // Create answer tiles
    const answers = this.getSpinAnswers(question.correct);
    answers.forEach(answer => {
      const tile = document.createElement('div');
      tile.className = 'spin-tile';
      tile.textContent = answer;
      tile.dataset.answer = answer;

      tile.addEventListener('click', () => this.spinAndCheck(tile, question.correct));
      tilesContainer.appendChild(tile);
    });
  }

  spinAndCheck(tile, correctAnswer) {
    tile.classList.add('spinning');

    setTimeout(() => {
      tile.classList.remove('spinning');

      if (tile.dataset.answer === correctAnswer) {
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

    // Create draggable tiles
    const tiles = this.getDragTiles();
    tiles.forEach(tile => {
      const element = document.createElement('div');
      element.className = 'drag-tile';
      element.draggable = true;
      element.textContent = tile.display;
      element.dataset.value = tile.value;
      element.dataset.age = tile.age;

      element.addEventListener('dragstart', (e) => this.handleDragStart(e));
      element.addEventListener('dragend', (e) => this.handleDragEnd(e));

      sourceContainer.appendChild(element);
    });

    // Create drop zones
    const zones = this.getDropZones();
    zones.forEach(zone => {
      const dropZone = document.createElement('div');
      dropZone.className = 'drop-zone';
      dropZone.dataset.age = zone.age;
      dropZone.innerHTML = `<div class="drop-label">${zone.label}</div>`;

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

    const correct = this.draggedElement.dataset.age === dropZone.dataset.age;

    if (correct) {
      dropZone.appendChild(this.draggedElement);
      dropZone.classList.add('has-tile');
      this.draggedElement.draggable = false;
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
  getTopicPairs() {
    const pairs = [];
    const data = DATA.slice(0, 8);

    data.forEach(item => {
      let value, display;

      switch(this.state.currentTopic) {
        case 'hr-awake':
          value = `${item.hr.awake}`;
          display = `${item.age}: ${item.hr.awake}`;
          break;
        case 'hr-sleep':
          if (item.hr.sleep) {
            value = `${item.hr.sleep}`;
            display = `${item.age}: ${item.hr.sleep}`;
          }
          break;
        case 'rr':
          value = `${item.rr}`;
          display = `${item.age}: ${item.rr}`;
          break;
        case 'sbp':
          value = `${item.sbp}`;
          display = `${item.age}: ${item.sbp}`;
          break;
        default:
          value = item.age;
          display = item.age;
      }

      if (value) {
        pairs.push({ value, display });
      }
    });

    return pairs.slice(0, 8);
  }

  getRandomData() {
    return DATA[Math.floor(Math.random() * DATA.length)];
  }

  getQuestionForData(data) {
    let text = '';
    let correct = '';

    switch(this.state.currentTopic) {
      case 'hr-awake':
        text = `Select the awake heart rate for ${data.age}`;
        correct = `${data.hr.awake} bpm`;
        break;
      case 'hr-sleep':
        text = `Select the sleep heart rate for ${data.age}`;
        correct = `${data.hr.sleep} bpm`;
        break;
      case 'rr':
        text = `Select the respiratory rate for ${data.age}`;
        correct = `${data.rr} breaths/min`;
        break;
      case 'sbp':
        text = `Select the systolic BP for ${data.age}`;
        correct = `${data.sbp} mmHg`;
        break;
      default:
        text = `Select the correct value for ${data.age}`;
        correct = data.age;
    }

    return { text, correct };
  }

  getSpinAnswers(correct) {
    const answers = [correct];
    const allValues = this.getAllValuesForTopic();

    while (answers.length < 4) {
      const random = allValues[Math.floor(Math.random() * allValues.length)];
      if (!answers.includes(random)) {
        answers.push(random);
      }
    }

    return answers.sort(() => Math.random() - 0.5);
  }

  getAllValuesForTopic() {
    switch(this.state.currentTopic) {
      case 'hr-awake':
        return DATA.map(d => `${d.hr.awake} bpm`);
      case 'hr-sleep':
        return DATA.filter(d => d.hr.sleep).map(d => `${d.hr.sleep} bpm`);
      case 'rr':
        return DATA.map(d => `${d.rr} breaths/min`);
      case 'sbp':
        return DATA.map(d => `${d.sbp} mmHg`);
      default:
        return DATA.map(d => d.age);
    }
  }

  getDragTiles() {
    const tiles = [];
    DATA.slice(0, 4).forEach(item => {
      let value, display;

      switch(this.state.currentTopic) {
        case 'hr-awake':
          value = `${item.hr.awake}`;
          display = `${item.hr.awake} bpm`;
          break;
        case 'rr':
          value = `${item.rr}`;
          display = `${item.rr} breaths/min`;
          break;
        case 'sbp':
          value = `${item.sbp}`;
          display = `${item.sbp} mmHg`;
          break;
        default:
          value = item.age;
          display = item.age;
      }

      tiles.push({ value, display, age: item.age });
    });

    return tiles.sort(() => Math.random() - 0.5);
  }

  getDropZones() {
    return DATA.slice(0, 4).map(item => ({
      age: item.age,
      label: item.age
    }));
  }

  completeMode() {
    setTimeout(() => {
      alert(`Mode completed! Score: ${this.state.score}`);
      document.getElementById('nextQuestion').classList.remove('hidden');
    }, 1000);
  }
}