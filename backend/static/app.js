const TONES = {
    green: "C4",
    red: "E4",
    blue: "G4",
    yellow: "C5"
};

let synth;
let toneStarted = false;

async function initAudio() {
    if (!toneStarted) {
        await Tone.start();
        synth = new Tone.Synth().toDestination();
        toneStarted = true;
    }
}

function playTone(color) {
    if (synth && TONES[color]) {
        synth.triggerAttackRelease(TONES[color], "8n");
    }
}

function playErrorBuzz() {
    if (synth) {
        // Low dissonant tone to signal a wrong move
        synth.triggerAttackRelease("C2", "4n");
    }
}

const API_BASE = '/api/game';
let sessionId = null;
let currentRound = 1;
let score = 0;
let isPlayerTurn = false;
let playerInputSequence = [];
let currentSequenceLength = 0;
let currentSequence = [];

const buttons = {
    green: document.querySelector('.green'),
    red: document.querySelector('.red'),
    blue: document.querySelector('.blue'),
    yellow: document.querySelector('.yellow')
};
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const statusMsg = document.getElementById('status-message');
const roundDisplay = document.getElementById('round');
const scoreDisplay = document.getElementById('score');
const simonGrid = document.querySelector('.simon-grid');
const overlay = document.getElementById('game-over-overlay');
const overlayContent = document.querySelector('.overlay-content');
const finalScoreDisplay = document.getElementById('final-score');
const finalRoundDisplay = document.getElementById('final-round');
const correctCountDisplay = document.getElementById('correct-count');
const totalCountDisplay = document.getElementById('total-count');
const sequenceStripEl = document.getElementById('sequence-strip');
const screenFlash = document.getElementById('screen-flash');

simonGrid.classList.add('disabled');

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
        throw new Error('API Error');
    }
    return response.json();
}

async function startGame() {
    await initAudio();
    try {
        const data = await apiCall('/start', 'POST');
        sessionId = data.session_id;
        currentRound = 1;
        score = 0;
        updateStats();
        statusMsg.textContent = "Computer's turn...";
        startBtn.disabled = true;
        
        currentSequence = data.sequence;
        currentSequenceLength = data.sequence.length;
        
        setTimeout(() => {
            playNewColor(data.new_cell);
        }, 800);
        
    } catch (e) {
        console.error(e);
        statusMsg.textContent = "Error starting game!";
    }
}

async function nextRound() {
    try {
        const data = await apiCall('/next', 'POST', { session_id: sessionId });
        currentRound = data.round_number;
        currentSequence = data.sequence;
        currentSequenceLength = data.sequence.length;
        updateStats();
        statusMsg.textContent = "Computer's turn...";
        
        setTimeout(() => {
            playNewColor(data.new_cell);
        }, 800);
        
    } catch (e) {
        console.error(e);
    }
}

async function validateSequence(sequence) {
    try {
        const data = await apiCall('/validate', 'POST', {
            session_id: sessionId,
            sequence: sequence
        });
        
        if (data.correct) {
            score = data.score;
            updateStats();
            playerInputSequence = [];
            statusMsg.textContent = "Correct! Get ready...";
            nextRound();
        } else {
            // Trigger the full animated game-over flow
            const missedIndex = playerInputSequence.length - 1;
            playGameOverSequence(data.score, currentRound, missedIndex);
        }
    } catch (e) {
        console.error(e);
    }
}


// Helper for sleeping
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function clearAllHighlights() {
    Object.values(buttons).forEach(btn => {
        btn.classList.remove('active', 'flashing', 'wrong', 'missed-highlight');
    });
}

async function flashButtonAsync(color, isMissed = false) {
    const btn = buttons[color];
    if (!btn) return;

    if (isMissed) {
        btn.classList.add('missed-highlight');
        playTone(color);
        await sleep(600);
        btn.classList.remove('missed-highlight');
    } else {
        btn.classList.add('flashing');
        playTone(color);
        await sleep(400);
        btn.classList.remove('flashing');
    }
}

async function playNewColor(color) {
    await sleep(300);
    clearAllHighlights();
    await flashButtonAsync(color);
    startPlayerTurn();
}

function startPlayerTurn() {
    isPlayerTurn = true;
    playerInputSequence = [];
    simonGrid.classList.remove('disabled');
    statusMsg.textContent = `Your turn! Enter all ${currentSequenceLength} color(s) from memory.`;
}

function stopPlayerTurn() {
    isPlayerTurn = false;
    simonGrid.classList.add('disabled');
}

function triggerScreenFlash() {
    screenFlash.classList.remove('active');
    // Force reflow so re-adding the class restarts the animation
    void screenFlash.offsetWidth;
    screenFlash.classList.add('active');
}

function triggerWrongButton(color) {
    const btn = buttons[color];
    if (!btn) return;
    btn.classList.remove('wrong');
    void btn.offsetWidth; // reflow
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 500);
}

function triggerGridError() {
    simonGrid.classList.remove('grid-error');
    void simonGrid.offsetWidth; // reflow
    simonGrid.classList.add('grid-error');
    setTimeout(() => simonGrid.classList.remove('grid-error'), 750);
}

function buildSequenceStrip(sequence, missedIndex) {
    sequenceStripEl.innerHTML = '';
    sequence.forEach((color, i) => {
        const dot = document.createElement('div');
        dot.className = `seq-dot dot-${color}`;
        if (i === missedIndex) {
            dot.classList.add('missed');
        }
        sequenceStripEl.appendChild(dot);
    });
}

async function playGameOverSequence(finalScore, round, missedIndex) {
    stopPlayerTurn();

    // --- Phase 1: Wrong move feedback ---
    const wrongColor = playerInputSequence[missedIndex];
    playErrorBuzz();
    triggerScreenFlash();
    triggerWrongButton(wrongColor);
    triggerGridError();
    statusMsg.textContent = "Wrong move!";

    await sleep(1000);

    // --- Phase 2: Replay the correct sequence ---
    statusMsg.textContent = "Here's what you missed...";
    await sleep(600);

    clearAllHighlights();
    for (let i = 0; i < currentSequence.length; i++) {
        const color = currentSequence[i];
        const isMissed = (i === missedIndex);
        await flashButtonAsync(color, isMissed);
        await sleep(isMissed ? 150 : 100); // small pause between flashes
    }

    await sleep(500);

    // --- Phase 3: Show the Game Over modal ---
    clearAllHighlights();
    finalScoreDisplay.textContent = finalScore;
    finalRoundDisplay.textContent = round;

    const correctSoFar = missedIndex; // player was correct for all indices before missedIndex
    correctCountDisplay.textContent = correctSoFar;
    totalCountDisplay.textContent = currentSequence.length;

    buildSequenceStrip(currentSequence, missedIndex);

    // Trigger bounce-in animation on the overlay content
    overlayContent.classList.remove('animate-in');
    void overlayContent.offsetWidth;
    overlayContent.classList.add('animate-in');

    overlay.classList.remove('hidden');
}

function handleCellClick(e) {
    if (!isPlayerTurn) return;
    
    const color = e.currentTarget.dataset.color;
    if (!color) return;
    
    const btn = e.currentTarget;
    initAudio();
    playTone(color);
    btn.classList.add('active');
    setTimeout(() => {
        btn.classList.remove('active');
    }, 200);

    playerInputSequence.push(color);

    // Immediately check against the current expected sequence index
    const currentIndex = playerInputSequence.length - 1;

    if (playerInputSequence[currentIndex] !== currentSequence[currentIndex]) {
        btn.classList.remove('active');
        stopPlayerTurn();
        validateSequence(playerInputSequence);
        return;
    }
    
    if (playerInputSequence.length === currentSequenceLength) {
        stopPlayerTurn();
        statusMsg.textContent = "Validating...";
        validateSequence(playerInputSequence);
    }
}

function updateStats() {
    roundDisplay.textContent = currentRound;
    scoreDisplay.textContent = score;
}

function resetGame() {
    overlay.classList.add('hidden');
    overlayContent.classList.remove('animate-in');
    startGame();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

Object.values(buttons).forEach(btn => {
    btn.addEventListener('click', handleCellClick);
});
