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
const finalScoreDisplay = document.getElementById('final-score');
const finalRoundDisplay = document.getElementById('final-round');

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
            gameOver(data.score, currentRound);
        }
    } catch (e) {
        console.error(e);
    }
}


// Helper for sleeping
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function clearAllHighlights() {
    Object.values(buttons).forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('flashing');
    });
}

async function flashButtonAsync(color) {
    const btn = buttons[color];
    if (!btn) return;
    
    btn.classList.add('flashing');
    playTone(color);
    
    await sleep(400); // 400ms flash duration
    btn.classList.remove('flashing');
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
        // Force the active state off quickly indicating a failure
        btn.classList.remove('active');
        stopPlayerTurn();
        statusMsg.textContent = "Wrong move...";
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

function gameOver(finalScore, round) {
    stopPlayerTurn();
    statusMsg.textContent = "Game Over!";
    finalScoreDisplay.textContent = finalScore;
    finalRoundDisplay.textContent = round;
    overlay.classList.remove('hidden');
}

function resetGame() {
    overlay.classList.add('hidden');
    startGame();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

Object.values(buttons).forEach(btn => {
    btn.addEventListener('click', handleCellClick);
});
