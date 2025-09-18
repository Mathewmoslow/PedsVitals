import './styles.css';
import { DATA } from './modules/data.js';
import { sfx, initAudio } from './modules/sfx.js';
import { createScene } from './modules/threeScene.js';
import { GameModes } from './modules/gameModes.js';

// Initialize 3D background
createScene(document.getElementById('bg3d'));
initAudio();

// State Management
const state = {
  currentTopic: null,
  currentMode: 'topic', // topic, study, practice, mastery
  currentGameMode: null,
  score: 0,
  streak: 0,
  correct: 0,
  total: 0,
  sound: true,
  topicProgress: JSON.parse(localStorage.getItem('peds_progress') || '{}'),
  currentQuestion: null,
  masteredAges: new Set()
};

// Initialize game modes
const gameModes = new GameModes(state, updateScoreDisplay);

// DOM helpers
const $ = id => document.getElementById(id);
const screens = {
  topic: $('topicScreen'),
  learn: $('learnScreen'),
  mastery: $('masteryScreen')
};

// Initialize
function init() {
  setupEventListeners();
  updateAllProgress();
  showScreen('topic');
}

// Screen Management
function showScreen(screen) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[screen].classList.remove('hidden');
  state.currentMode = screen;
}

// Event Listeners
function setupEventListeners() {
  // Sound toggle
  $('btnSound').addEventListener('click', () => {
    state.sound = !state.sound;
    sfx.toggle(state.sound);
    $('btnSound').textContent = state.sound ? '🔊' : '🔇';
  });

  // Topic selection
  document.querySelectorAll('.topic-card').forEach(card => {
    card.addEventListener('click', () => {
      const topic = card.dataset.topic;
      if (topic === 'combined') {
        if (isUnlocked()) startCombinedPractice();
        return;
      }
      startTopic(topic);
    });
  });

  // Back button
  $('backToTopics').addEventListener('click', () => {
    showScreen('topic');
    updateAllProgress();
  });

  // Study/Practice toggle
  $('startPractice').addEventListener('click', startPractice);
  $('backToStudy').addEventListener('click', backToStudy);
  $('backToModeSelect').addEventListener('click', () => {
    document.querySelectorAll('.game-mode').forEach(m => m.classList.add('hidden'));
    document.querySelector('.game-modes').classList.remove('hidden');
    $('backToModeSelect').classList.add('hidden');
  });
  $('nextQuestion').addEventListener('click', () => {
    if (state.currentGameMode === 'quiz') {
      nextQuestion();
    } else {
      gameModes.startMode(state.currentGameMode);
    }
  });

  // Game mode selection
  document.querySelectorAll('.mode-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      state.currentGameMode = mode;
      document.querySelector('.game-modes').classList.add('hidden');
      $('backToModeSelect').classList.remove('hidden');

      if (mode === 'quiz') {
        document.getElementById('quizGame').classList.remove('hidden');
        nextQuestion();
      } else {
        gameModes.startMode(mode);
      }
    });
  });

  // Continue from mastery
  $('continueBtn').addEventListener('click', () => {
    showScreen('topic');
    updateAllProgress();
  });
}

// Topic Management
function startTopic(topic) {
  state.currentTopic = topic;
  state.score = 0;
  state.streak = 0;
  state.correct = 0;
  state.total = 0;
  state.masteredAges.clear();

  const titles = {
    'hr-awake': 'Heart Rate (Awake)',
    'hr-sleep': 'Heart Rate (Sleep)',
    'rr': 'Respiratory Rate',
    'sbp': 'Blood Pressure',
    'temp': 'Temperature',
    'approach': 'Assessment Approach'
  };

  $('learnTitle').textContent = titles[topic];
  showScreen('learn');
  showStudyMode();
}

// Study Mode
function showStudyMode() {
  $('studyMode').classList.remove('hidden');
  $('practiceMode').classList.add('hidden');

  const studyCards = $('studyCards');
  studyCards.innerHTML = '';

  // Filter DATA based on topic
  let relevantData = DATA;
  if (state.currentTopic === 'hr-sleep') {
    relevantData = DATA.filter(d => d.hr.sleep);
  }

  relevantData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'study-card';

    let value = '';
    switch(state.currentTopic) {
      case 'hr-awake':
        value = `${item.hr.awake} bpm`;
        break;
      case 'hr-sleep':
        value = item.hr.sleep ? `${item.hr.sleep} bpm` : 'N/A';
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
        value = item.approach.split(',')[0]; // First part only
        break;
    }

    card.innerHTML = `
      <div class="age-label">${item.age}</div>
      <div class="value-display">${value}</div>
    `;
    studyCards.appendChild(card);
  });

  updateProgressIndicator();
}

// Practice Mode
function startPractice() {
  $('studyMode').classList.add('hidden');
  $('practiceMode').classList.remove('hidden');
  state.score = 0;
  state.streak = 0;
  state.correct = 0;
  state.total = 0;
  nextQuestion();
}

function backToStudy() {
  showStudyMode();
}

// Question Generation
function nextQuestion() {
  // Check if mastered
  if (state.masteredAges.size >= 8 || (state.currentTopic === 'hr-sleep' && state.masteredAges.size >= 6)) {
    showMastery();
    return;
  }

  // Hide feedback
  $('feedback').textContent = '';
  $('feedback').className = 'feedback';
  $('nextQuestion').classList.add('hidden');

  // Generate question
  let relevantData = DATA;
  if (state.currentTopic === 'hr-sleep') {
    relevantData = DATA.filter(d => d.hr.sleep);
  }

  // Pick random age group not yet mastered
  const unmasteredData = relevantData.filter(d => !state.masteredAges.has(d.age));
  const targetData = unmasteredData.length > 0 ?
    unmasteredData[Math.floor(Math.random() * unmasteredData.length)] :
    relevantData[Math.floor(Math.random() * relevantData.length)];

  let question = '';
  let correctAnswer = '';

  switch(state.currentTopic) {
    case 'hr-awake':
      question = `What is the awake heart rate for ${targetData.age}?`;
      correctAnswer = `${targetData.hr.awake} bpm`;
      break;
    case 'hr-sleep':
      question = `What is the sleep heart rate for ${targetData.age}?`;
      correctAnswer = `${targetData.hr.sleep} bpm`;
      break;
    case 'rr':
      question = `What is the respiratory rate for ${targetData.age}?`;
      correctAnswer = `${targetData.rr} breaths/min`;
      break;
    case 'sbp':
      question = `What is the systolic BP for ${targetData.age}?`;
      correctAnswer = `${targetData.sbp} mmHg`;
      break;
    case 'temp':
      question = `What is the temperature guidance for ${targetData.age}?`;
      correctAnswer = targetData.temp;
      break;
    case 'approach':
      question = `What is the assessment approach for ${targetData.age}?`;
      correctAnswer = targetData.approach;
      break;
  }

  // Generate distractors
  let allAnswers = relevantData.map(d => {
    switch(state.currentTopic) {
      case 'hr-awake': return `${d.hr.awake} bpm`;
      case 'hr-sleep': return d.hr.sleep ? `${d.hr.sleep} bpm` : null;
      case 'rr': return `${d.rr} breaths/min`;
      case 'sbp': return `${d.sbp} mmHg`;
      case 'temp': return d.temp;
      case 'approach': return d.approach;
    }
  }).filter(a => a && a !== correctAnswer);

  // Get 3 unique distractors
  const distractors = [];
  while (distractors.length < 3 && allAnswers.length > 0) {
    const idx = Math.floor(Math.random() * allAnswers.length);
    distractors.push(allAnswers.splice(idx, 1)[0]);
  }

  // Combine and shuffle
  const choices = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

  state.currentQuestion = {
    age: targetData.age,
    question,
    correctAnswer,
    choices
  };

  // Display question
  $('questionText').innerHTML = question;
  const choicesContainer = $('answerChoices');
  choicesContainer.innerHTML = '';

  choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice;
    btn.addEventListener('click', () => checkAnswer(choice, btn));
    choicesContainer.appendChild(btn);
  });
}

// Answer Checking
function checkAnswer(answer, btn) {
  state.total++;
  const correct = answer === state.currentQuestion.correctAnswer;

  // Disable all buttons
  document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);

  if (correct) {
    state.correct++;
    state.streak++;
    state.score += 10 * Math.min(state.streak, 5); // Bonus for streaks
    btn.classList.add('correct');
    $('feedback').textContent = '✓ Correct!';
    $('feedback').className = 'feedback correct';
    sfx.correct();

    // Mark age as mastered after 2 correct in a row for this age
    if (!state.masteredAges.has(state.currentQuestion.age)) {
      state.masteredAges.add(state.currentQuestion.age);
    }
  } else {
    state.streak = 0;
    btn.classList.add('incorrect');
    // Find and highlight correct answer
    document.querySelectorAll('.choice-btn').forEach(b => {
      if (b.textContent === state.currentQuestion.correctAnswer) {
        b.classList.add('correct');
      }
    });
    $('feedback').textContent = '✗ Try again';
    $('feedback').className = 'feedback incorrect';
    sfx.wrong();
  }

  // Update displays
  $('currentScore').textContent = `Score: ${state.score}`;
  $('streak').textContent = `Streak: ${state.streak}`;
  updateProgressIndicator();

  // Show next button
  $('nextQuestion').classList.remove('hidden');
}

// Progress Management
function updateProgressIndicator() {
  const total = state.currentTopic === 'hr-sleep' ? 6 : 8;
  $('progressText').textContent = `${state.masteredAges.size}/${total} mastered`;
}

function updateAllProgress() {
  // Update progress bars
  Object.keys(state.topicProgress).forEach(topic => {
    const progress = state.topicProgress[topic] || 0;
    const fill = document.querySelector(`.progress-fill[data-topic="${topic}"]`);
    if (fill) {
      fill.style.width = `${progress}%`;
    }
  });

  // Check if combined is unlocked
  const topics = ['hr-awake', 'hr-sleep', 'rr', 'sbp', 'temp', 'approach'];
  const allMastered = topics.every(t => (state.topicProgress[t] || 0) >= 80);
  const combinedCard = document.querySelector('.topic-card[data-topic="combined"]');
  if (allMastered && combinedCard) {
    combinedCard.classList.remove('locked');
  }
}

function isUnlocked() {
  const topics = ['hr-awake', 'hr-sleep', 'rr', 'sbp', 'temp', 'approach'];
  return topics.every(t => (state.topicProgress[t] || 0) >= 80);
}

// Mastery Screen
function showMastery() {
  const accuracy = Math.round((state.correct / state.total) * 100);

  // Save progress
  state.topicProgress[state.currentTopic] = Math.max(
    state.topicProgress[state.currentTopic] || 0,
    accuracy
  );
  localStorage.setItem('peds_progress', JSON.stringify(state.topicProgress));

  // Display mastery screen
  $('masteredTopic').textContent = $('learnTitle').textContent;
  $('finalScore').textContent = state.score;
  $('accuracy').textContent = `${accuracy}%`;

  showScreen('mastery');
  sfx.ui();
}

// Combined Practice
function startCombinedPractice() {
  state.currentTopic = 'combined';
  startTopic('combined');
}

// Helper function for score display
function updateScoreDisplay() {
  $('currentScore').textContent = `Score: ${state.score}`;
  $('streak').textContent = `Streak: ${state.streak}`;
}

// Initialize app
init();