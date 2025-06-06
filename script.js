const rubSound = new Audio('sounds/rub.mp3');
const feedSound = new Audio('sounds/feed.mp3');
const toySound = new Audio('sounds/toy.mp3');
const playSound = new Audio('sounds/play.mp3');
const sleepSound = new Audio('sounds/sleep.mp3');
const moodSound = new Audio('sounds/mood.mp3');
const bgMusic = new Audio('sounds/bg.mp3');
bgMusic.loop = true;

let hunger = 50;
let happiness = 50;
let energy = 50;
let lastMood = "happy";

function updateBars() {
  document.getElementById("hunger-bar").value = hunger;
  document.getElementById("happiness-bar").value = happiness;
  document.getElementById("energy-bar").value = energy;
}

function feedPet() {
  if (isGameOver) return;
  feedSound.play();
  hunger = Math.max(0, hunger - 30);
  happiness = Math.min(100, happiness + 10);
  energy = Math.max(0, energy - 5);
  updateBars();
  updatePetMood();
  checkGameOver();
}

function playWithPet() {
  if (isGameOver) return;
  playSound.play();
  hunger = Math.min(100, hunger + 10);
  happiness = Math.min(100, happiness + 20);
  energy = Math.max(0, energy - 20);
  updateBars();
  updatePetMood();
  checkGameOver();
}

function sleepPet() {
  if (isGameOver) return;
  sleepSound.play();
  energy = Math.min(100, energy + 40);
  happiness = Math.max(0, happiness - 10);
  updateBars();
  updatePetMood();
  checkGameOver();
}

// Decay function (called every 10 seconds)
setInterval(() => {
  hunger = Math.min(100, hunger + 5);        // Gets hungrier
  happiness = Math.max(0, happiness - 3);    // Gets less happy
  energy = Math.max(0, energy - 2);          // Loses energy

  updateBars();
  updatePetMood();
}, 10000); // every 10 seconds

function updatePetMood() {
  const img = document.getElementById("pet-image");
  let currentMood = "happy";

  if (hunger > 80 || happiness < 30 || energy < 20) {
    currentMood = "sad";
    img.src = "https://i.imgur.com/VP3IvQy.png";
  } else {
    img.src = "https://i.imgur.com/NkqUfsT.png";
  }

  // Only play mood sound if mood changed
  if (currentMood !== lastMood) {
    moodSound.play();
    lastMood = currentMood;
  }
}

let isGameOver = false;

function checkGameOver() {
  if (hunger >= 100 || happiness <= 0 || energy <= 0) {
    isGameOver = true;
    document.getElementById("pet-image").src = "https://i.imgur.com/pQxDfUQ.png"; // sick/sad pet
    alert("😢 Your pet is not doing well. Game Over!");
    disableButtons();
  }
}

function disableButtons() {
  const buttons = document.querySelectorAll("button");
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = 0.5;
    btn.style.cursor = "not-allowed";
  });
}

function useToy() {
  if (isGameOver) return;
  toySound.play();
  happiness = Math.min(100, happiness + 15);
  energy = Math.max(0, energy - 5);
  updateBars();
  updatePetMood();
  checkGameOver();

  const pet = document.getElementById("pet-image");
  pet.classList.add("shake");
  setTimeout(() => pet.classList.remove("shake"), 400);
}

function rubPet() {
  if (isGameOver) return;
  rubSound.play();
  happiness = Math.min(100, happiness + 5);
  energy = Math.min(100, energy + 5);
  updateBars();
  updatePetMood();
  checkGameOver();

  const pet = document.getElementById("pet-image");
  pet.classList.add("bounce");
  setTimeout(() => pet.classList.remove("bounce"), 400);
}

let rubbing = false;
let lastRubTime = 0;

function startRub() {
  rubbing = true;
}

function stopRub() {
  rubbing = false;
}

function handleRub() {
  if (!rubbing) return;

  const now = Date.now();

  // Only allow rub to trigger every 500ms to avoid spamming
  if (now - lastRubTime > 500) {
    rubPet();
    lastRubTime = now;
  }
}

function whistle() {
  if (isGameOver) return;
  const whistleSound = new Audio('sounds/whistle.mp3');
  whistleSound.play();
  energy = Math.min(100, energy + 5);

  if (Math.random() < 0.3) {
    happiness = Math.min(100, happiness + 10);
    alert("🎶 Your pet loved the whistle!");
  }

  updateBars();
  updatePetMood();
  checkGameOver();

  const pet = document.getElementById("pet-image");
  pet.classList.add("bounce");
  setTimeout(() => pet.classList.remove("bounce"), 400);
}

let musicPlaying = false;

function toggleMusic() {
  const btn = document.getElementById("music-btn");
  if (musicPlaying) {
    bgMusic.pause();
    btn.textContent = "🔈 Play Music";
  } else {
    bgMusic.play();
    btn.textContent = "🔇 Pause Music";
  }
  musicPlaying = !musicPlaying;
}

updateBars(); // initialize on load


