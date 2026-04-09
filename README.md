# Sequence Recall

A classic, Simon-style memory game built with a modern, glassmorphism web UI, browser-synthesized audio, and a FastAPI Python backend.

## Game Logic
- **The Board:** A circular board featuring four colored quadrants: Green, Red, Blue, and Yellow. Each color has a distinct musical tone associated with it.
- **The Flow:**
  - Round 1 starts with the computer choosing a random color and flashing it (accompanied by its tone).
  - It is then your turn. You must tap the exact same color.
  - If you succeed, the round advances. The computer will randomly add *one new color* to the end of the sequence.
  - Crucially, during the computer's turn, it will playback the **entire sequence** from the very beginning up to the newly added color.
  - You must then correctly reproduce the **entire sequence** from memory.
- **Game Over:** If you tap the wrong color at any point during your sequence reproduction, the game ends immediately.

## Scoring Logic
Your score is calculated based on the cumulative sequence length of the rounds you fully complete. 
- You earn **20 points** multiplied by the length of the sequence you successfully entered. 
- Example: If the round requires you to memorize a sequence of 5 colors, successfully completing that round guarantees your score is `5 * 20 = 100` points.
- If you fail on Round 5 (meaning your last fully successful sequence was Round 4), your final registered score will lock in at `4 * 20 = 80` points.

## Tech Stack
- **Frontend:** Vanilla HTML, CSS, JavaScript (Mobile-responsive UI layout)
- **Audio:** [Tone.js](https://tonejs.github.io/) (Synthesized directly in-browser runtime, zero audio assets required)
- **Backend:** Python + FastAPI (Hosts the validation and logic API as well as static assets)
- **Infra:** Docker + Docker Compose

## Running the App
You can quickly run this application anywhere using Docker. Ensure Docker Desktop is installed and running, then execute:

```bash
docker compose up --build -d
```

Navigate to [http://localhost:8000](http://localhost:8000) in your web browser to play.
