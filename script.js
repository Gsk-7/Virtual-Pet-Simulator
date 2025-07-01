document.addEventListener('DOMContentLoaded', () => {

    // --- 1. STATE MANAGEMENT & GAME ENGINE ---
    let state = {};
    const appContainer = document.getElementById('app-container');

    // --- 2. GAME CONSTANTS & CONFIGURATION ---
    const config = {
        STAT_DECAY_INTERVAL: 5000,
        GAME_HOUR_INTERVAL: 7000,
        GRACE_PERIOD_DURATION: 3000,
        HUNGER_DECAY: 0.07,
        ENERGY_DECAY: 0.05,
        AFFECTION_DECAY: 0.04,
        FEED_BOOST: 0.4,
        PLAY_AFFECTION_BOOST: 0.25,
        PLAY_ENERGY_COST: 0.2,
        SLEEP_DURATION: 10000,
        ENERGY_TOO_LOW_THRESHOLD: 0.25,
        HUNGER_FULL_THRESHOLD: 0.9,
        AFFECTION_LOW_THRESHOLD: 0.5,
        HUNGER_LOW_THRESHOLD: 0.4,
    };

    const petOptions = [
      { type: 'cat', emoji: '🐱', name: 'Cat', color: 'from-orange-400 to-red-400' },
      { type: 'dog', emoji: '🐶', name: 'Dog', color: 'from-yellow-400 to-orange-400' },
      { type: 'rabbit', emoji: '🐰', name: 'Rabbit', color: 'from-pink-300 to-pink-400' },
      { type: 'bird', emoji: '🐦', name: 'Bird', color: 'from-blue-400 to-indigo-400' },
    ];
    
    // --- 3. RENDER ENGINE ---
    function render() {
        let currentHTML = '';
        switch (state.screen) {
            case 'home': currentHTML = getHomeScreenHTML(); break;
            case 'select': currentHTML = getSelectScreenHTML(); break;
            case 'name': currentHTML = getNameScreenHTML(); break;
            case 'game': currentHTML = getGameScreenHTML(); break;
        }
        appContainer.innerHTML = currentHTML;
        attachEventListeners();
    }

    // --- 4. EVENT HANDLING ---
    function attachEventListeners() {
        const clickableElements = appContainer.querySelectorAll('[data-action]');
        clickableElements.forEach(elem => {
            if (!elem.hasClickListener) {
                elem.addEventListener('click', handleActionClick);
                elem.hasClickListener = true;
            }
        });

        const petNameInput = document.getElementById('pet-name-input');
        if (petNameInput) {
            if (!petNameInput.hasInputListener) {
                petNameInput.addEventListener('input', handleNameInput);
                petNameInput.hasInputListener = true;
            }
            petNameInput.focus();
        }
    }

    function handleActionClick(e) {
        const action = e.currentTarget.dataset.action;
        if (!action) return;

        switch(action) {
            case 'start': setState({ screen: 'select' }); break;
            case 'back-home': resetState(); break;
            case 'select-pet': setState({ screen: 'name', petType: e.currentTarget.dataset.petType }); break;
            case 'back-select': setState({ screen: 'select', petType: null, petName: '' }); break;
            case 'create-pet': handleCreatePet(); break;
            case 'feed': feed(); break;
            case 'play': play(); break;
            case 'sleep': sleep(); break;
            case 'pet-click': petClick(); break;
        }
    }

    function handleNameInput(e) {
        const createBtn = document.getElementById('create-pet-button');
        if (createBtn) {
            const trimmedValue = e.target.value.trim();
            createBtn.disabled = !trimmedValue;
            setState({ petName: e.target.value }, false);
        }
    }

    function handleCreatePet() {
        const name = state.petName.trim();
        if (name) {
            setState({
                screen: 'game',
                pet: createInitialPet(name, state.petType),
                isGameActive: false,
                dayNight: 'day',
                gameTime: 8,
                achievements: [],
                interactionCounts: { feed: 0, play: 0, pet: 0 }
            });
            startGameLoops();
        }
    }

    // --- 5. GAME LOGIC & STATE UPDATES ---
    
    let gameIntervals = { decay: null, time: null };

    function startGameLoops() {
        clearInterval(gameIntervals.decay);
        clearInterval(gameIntervals.time);

        setTimeout(() => {
            setState({ isGameActive: true });
            showMessageForDuration(`Time to take care of ${state.pet.name}!`, 3000);
            gameIntervals.decay = setInterval(updatePetStats, config.STAT_DECAY_INTERVAL);
            gameIntervals.time = setInterval(updateGameTime, config.GAME_HOUR_INTERVAL);
        }, config.GRACE_PERIOD_DURATION);
    }
    
    function updatePetStats() {
        if (!state.isGameActive || !state.pet || state.pet.isSleeping) return;
        setState({
            pet: {
                ...state.pet,
                hunger: Math.max(0, state.pet.hunger - config.HUNGER_DECAY),
                energy: Math.max(0, state.pet.energy - config.ENERGY_DECAY),
                affection: Math.max(0, state.pet.affection - config.AFFECTION_DECAY),
            }
        }, false);
        updateThoughtAndMessage();
    }

    function updateGameTime() {
        if (!state.isGameActive) return;
        const newTime = (state.gameTime + 1) % 24;
        const newDayNight = (newTime >= 20 || newTime < 6) ? 'night' : 'day';
        setState({ gameTime: newTime, dayNight: newDayNight });
    }

    function updateThoughtAndMessage() {
        const pet = state.pet;
        let newThought = null;
        let newMessage = '';

        if (pet.energy < config.ENERGY_TOO_LOW_THRESHOLD && !pet.isSleeping) {
            newThought = 'sleepy';
            newMessage = "I'm too tired... Bedtime!";
        } else if (pet.affection < config.AFFECTION_LOW_THRESHOLD) {
            newThought = 'lonely';
            newMessage = "I'm lonely... let's play!";
        } else if (pet.hunger < config.HUNGER_LOW_THRESHOLD) {
            newThought = 'hungry';
            newMessage = "I'm hungry!";
        }

        if (state.thought !== newThought || state.message !== newMessage) {
            setState({ thought: newThought, message: newMessage });
        }
    }

    function checkAchievements() {
        if (state.interactionCounts.feed >= 5 && !state.achievements.includes('Gourmet Chef')) {
            const newAchievements = [...state.achievements, 'Gourmet Chef'];
            setState({ achievements: newAchievements });
            showMessageForDuration('Achievement: Gourmet Chef! 🏆', 3000);
        }
        if (state.interactionCounts.pet >= 10 && !state.achievements.includes('Best Friend')) {
            const newAchievements = [...state.achievements, 'Best Friend'];
            setState({ achievements: newAchievements });
            showMessageForDuration('Achievement: Best Friend! ❤️', 3000);
        }
    }
    
    let messageTimer;
    function showMessageForDuration(text, duration) {
        clearTimeout(messageTimer);
        setState({ message: text });
        messageTimer = setTimeout(() => {
            updateThoughtAndMessage();
        }, duration);
    }
    
    // --- 6. ACTION FUNCTIONS ---
    function feed() {
        if (state.pet.energy < config.ENERGY_TOO_LOW_THRESHOLD) return showMessageForDuration("I'm too tired to eat...", 2000);
        if (state.pet.hunger > config.HUNGER_FULL_THRESHOLD) return showMessageForDuration("I'm too full! 🤢", 2000);
        if (state.pet.isFeeding || state.pet.isSleeping) return;

        setState({
            interactionCounts: { ...state.interactionCounts, feed: state.interactionCounts.feed + 1 },
            pet: { ...state.pet, isFeeding: true, hunger: Math.min(1, state.pet.hunger + config.FEED_BOOST) }
        });
        showMessageForDuration('Yummy! 😋', 2000);
        setTimeout(() => setState({ pet: { ...state.pet, isFeeding: false } }), 2000);
        checkAchievements();
    }
    
    function play() {
        if (state.pet.isPlaying || state.pet.isSleeping || state.pet.energy < config.ENERGY_TOO_LOW_THRESHOLD) return;
        setState({
            interactionCounts: { ...state.interactionCounts, play: state.interactionCounts.play + 1 },
            pet: {
                ...state.pet,
                isPlaying: true,
                affection: Math.min(1, state.pet.affection + config.PLAY_AFFECTION_BOOST),
                energy: Math.max(0, state.pet.energy - config.PLAY_ENERGY_COST),
            }
        });
        showMessageForDuration('Wheee! 🎉', 3000);
        setTimeout(() => setState({ pet: { ...state.pet, isPlaying: false } }), 3000);
        checkAchievements();
    }
    
    function sleep() {
        if (state.pet.isSleeping) return;
        setState({ pet: { ...state.pet, isSleeping: true } });
        showMessageForDuration('Zzz...', config.SLEEP_DURATION);
        setTimeout(() => setState({ pet: { ...state.pet, isSleeping: false, energy: 1 } }), config.SLEEP_DURATION);
    }

    function petClick() {
        if (state.pet.energy < config.ENERGY_TOO_LOW_THRESHOLD) return showMessageForDuration("...too tired...", 1500);
        if (state.pet.isSleeping) return;
        setState({
            interactionCounts: { ...state.interactionCounts, pet: state.interactionCounts.pet + 1 },
            pet: { ...state.pet, isHappy: true, affection: Math.min(1, state.pet.affection + 0.05) }
        });
        showMessageForDuration('💖', 1500);
        setTimeout(() => setState({ pet: { ...state.pet, isHappy: false } }), 1500);
        checkAchievements();
    }

    // --- 7. INITIALIZATION & HELPERS ---
    function init() { resetState(); }

    function resetState() {
        clearInterval(gameIntervals.decay);
        clearInterval(gameIntervals.time);
        setState({
            screen: 'home', pet: null, petType: null, petName: '',
            dayNight: 'day', gameTime: 8, message: '', thought: null,
            achievements: [], interactionCounts: { feed: 0, play: 0, pet: 0 },
            isGameActive: false
        });
    }

    function setState(newState, shouldRender = true) {
        Object.assign(state, newState);
        if (shouldRender) {
            render();
        }
    }

    function createInitialPet(name, type) {
        return {
            name: name, type: type,
            hunger: 1, affection: 1, energy: 1,
            isSleeping: false, isFeeding: false, isPlaying: false, isHappy: false,
        };
    }
    
    // --- 8. HTML & SVG TEMPLATE FUNCTIONS (THE "COMPONENTS") ---

    function getHomeScreenHTML() { /* ... unchanged ... */ return `<div class="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex items-center justify-center p-4"><div class="text-center"><h1 class="text-6xl font-bold text-white mb-4 animate-pulse">🐾 Pet Paws</h1><p class="text-xl text-white mb-8">Your Virtual Pet Adventure</p><button data-action="start" class="bg-white text-purple-600 px-8 py-4 rounded-full text-xl font-bold hover:bg-purple-100 transform hover:scale-105 transition-all duration-300 shadow-lg">Start Playing</button></div></div>`; }
    function getSelectScreenHTML() { /* ... unchanged ... */ return `<div class="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-8"><div class="max-w-4xl mx-auto"><button data-action="back-home" class="mb-6 bg-white text-gray-700 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors">Back to Home</button><h2 class="text-4xl font-bold text-white text-center mb-8">Choose Your Pet</h2><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">${petOptions.map(pet => `<div data-action="select-pet" data-pet-type="${pet.type}" class="bg-gradient-to-br ${pet.color} p-8 rounded-3xl cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"><div class="text-center"><div class="text-6xl mb-4">${pet.emoji}</div><h3 class="text-2xl font-bold text-white">${pet.name}</h3></div></div>`).join('')}</div></div></div>`; }
    function getNameScreenHTML() { /* ... unchanged ... */ const petInfo = petOptions.find(p => p.type === state.petType) || {}; return `<div class="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center p-8"><div class="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full"><button data-action="back-select" class="mb-6 text-gray-600 hover:text-gray-800 transition-colors">Back to Selection</button><div class="text-center mb-8"><div class="text-6xl mb-4">${petInfo.emoji}</div><h2 class="text-3xl font-bold text-gray-800 mb-2">Name Your ${petInfo.name}</h2><p class="text-gray-600">Choose a special name!</p></div><div class="space-y-6"><input id="pet-name-input" type="text" placeholder="Enter pet name..." class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none text-lg text-center font-semibold shadow-inner" maxlength="15" value="${state.petName}"><button id="create-pet-button" data-action="create-pet" class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg" ${!state.petName.trim() ? 'disabled' : ''}>Create Pet</button></div></div></div>`; }
    function getGameScreenHTML() { /* ... unchanged ... */ const { pet, dayNight, message, thought, achievements } = state; if (!pet) return ''; const petInfo = petOptions.find(p => p.type === pet.type); const foodEmojis = { cat: '🐟', dog: '🦴', rabbit: '🥕', bird: '🐛' }; const backgroundClass = dayNight === 'day' ? 'from-sky-400 to-sky-200' : 'from-slate-900 to-indigo-800'; const isTired = pet.energy < config.ENERGY_TOO_LOW_THRESHOLD; const isFeedDisabled = pet.isFeeding || pet.isSleeping || pet.hunger > config.HUNGER_FULL_THRESHOLD || isTired; const isPlayDisabled = pet.isPlaying || pet.isSleeping || isTired; const isSleepDisabled = pet.isSleeping; return `<div class="min-h-screen relative overflow-hidden transition-colors duration-1000 bg-gradient-to-b ${backgroundClass}">${getEnvironmentHTML(dayNight)}<div class="relative z-10 p-4 sm:p-6 md:p-8 flex flex-col h-screen"><div class="max-w-3xl mx-auto w-full"><header class="flex justify-between items-center mb-6"><button data-action="back-home" class="bg-white/80 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-full hover:bg-white transition-colors shadow-md">Home</button><h1 class="text-2xl sm:text-3xl font-bold text-gray-800 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">${pet.name}</h1><div class="text-3xl sm:text-4xl bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md">${petInfo.emoji}</div></header><div class="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">${getStatBarHTML('Hunger', pet.hunger, 'bg-orange-500')}${getStatBarHTML('Love', pet.affection, 'bg-pink-500')}${getStatBarHTML('Energy', pet.energy, 'bg-blue-500')}</div></div><div class="flex-grow flex items-center justify-center relative">${message ? `<div class="absolute top-1/4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg text-lg font-semibold animate-pulse z-20">${message}</div>` : ''}<div data-action="pet-click" class="relative ${isTired || pet.isSleeping ? 'cursor-not-allowed' : 'cursor-pointer'}">${thought ? `<div class="absolute -top-16 left-1/2 -translate-x-1/2 bg-white p-2 rounded-full shadow-lg animate-bounce">${getThoughtIcon(thought)}</div>` : ''}<div class="transform scale-125 sm:scale-150">${getPetSVG(pet)}</div></div></div><div class="max-w-3xl mx-auto w-full mt-4"><div class="text-center mb-2 h-6">${achievements.length > 0 ? `<span class="text-white bg-yellow-500/80 px-3 py-1 rounded-full text-sm font-bold">🏆 Achievements: ${achievements.join(', ')}</span>` : ''}</div><div class="grid grid-cols-3 gap-2 sm:gap-4"><button data-action="feed" class="text-white py-4 px-2 sm:px-6 rounded-2xl font-bold text-sm sm:text-lg flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg bg-gradient-to-r from-orange-400 to-red-400" ${isFeedDisabled ? 'disabled' : ''}>Feed ${foodEmojis[pet.type]}</button><button data-action="play" class="text-white py-4 px-2 sm:px-6 rounded-2xl font-bold text-sm sm:text-lg flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg bg-gradient-to-r from-green-400 to-emerald-400" ${isPlayDisabled ? 'disabled' : ''}>Play 🎾</button><button data-action="sleep" class="text-white py-4 px-2 sm:px-6 rounded-2xl font-bold text-sm sm:text-lg flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg bg-gradient-to-r from-blue-400 to-indigo-400" ${isSleepDisabled ? 'disabled' : ''}>Sleep 🛏️</button></div></div></div></div>`; }
    function getStatBarHTML(label, value, color) { /* ... unchanged ... */ return `<div class="bg-white/80 backdrop-blur-sm rounded-2xl p-2 sm:p-4 shadow-lg"><div class="flex items-center mb-2"><span class="font-semibold text-xs sm:text-base">${label}</span></div><div class="w-full bg-gray-200 rounded-full h-3"><div class="${color} h-3 rounded-full transition-all duration-500 ease-out" style="width: ${Math.max(0, value * 100)}%"></div></div></div>`; }
    function getThoughtIcon(thought) { /* ... unchanged ... */ const icons = { hungry: '🦴', sleepy: '💤', lonely: '❤️' }; return `<div class="text-4xl">${icons[thought] || ''}</div>`; }
    function getEnvironmentHTML(dayNight) { /* ... unchanged ... */ const stars = dayNight === 'night' ? `<div class="w-4 h-4 absolute top-1/4 left-1/4 animate-fade-in-out bg-white rounded-full"></div><div class="w-3 h-3 absolute top-1/3 right-1/4 animate-fade-in-out bg-white rounded-full [animation-delay:1s]"></div>` : ''; const sun = dayNight === 'day' ? `<div class="absolute top-10 left-10 w-16 h-16 bg-yellow-300 rounded-full animate-pulse"></div>` : ''; const moon = dayNight === 'night' ? `<div class="absolute top-10 right-10 w-16 h-16 bg-slate-300 rounded-full"></div>` : ''; return stars + sun + moon + `<div class="absolute bottom-0 w-full h-1/3 bg-gradient-to-t ${dayNight === 'day' ? 'from-green-500 to-green-400' : 'from-green-800 to-green-700'}"></div>`; }
    function getPetMood(pet) { if (pet.isSleeping) return 'sleeping'; if (pet.isHappy || pet.affection > 0.85) return 'happy'; if (pet.energy < config.ENERGY_TOO_LOW_THRESHOLD || pet.hunger < config.HUNGER_LOW_THRESHOLD) return 'sad'; return 'neutral'; }
    function getPetSVG(pet) { switch (pet.type) { case 'dog': return getDogSVG(pet); case 'cat': return getCatSVG(pet); case 'rabbit': return getRabbitSVG(pet); case 'bird': return getBirdSVG(pet); } return ''; }
    function getDogSVG(pet) { const mood = getPetMood(pet); const animationClass = pet.isPlaying ? 'animate-bounce' : 'animate-breathing'; const headTransform = pet.isFeeding ? 'translateY(15px) rotate(15deg)' : (mood === 'sad' ? 'rotate(-5deg)' : 'rotate(0deg)'); const tailClass = (mood === 'happy' || pet.isPlaying) ? 'animate-wiggle' : 'rotate-12'; const earTransform = mood === 'sad' ? 'translateY(10px)' : 'translateY(0)'; const eyeHTML = mood === 'sleeping' ? `<path d="M60,55 Q65,58 70,55" stroke="#1e293b" stroke-width="2" fill="none" /><path d="M80,55 Q85,58 90,55" stroke="#1e293b" stroke-width="2" fill="none" />` : `<circle cx="65" cy="55" r="5" fill="#1e293b"><circle cx="64" cy="53" r="1.5" fill="white" /></circle><circle cx="85" cy="55" r="5" fill="#1e293b"><circle cx="84" cy="53" r="1.5" fill="white" /></circle>`; const mouthHTML = mood === 'happy' ? `<path d="M68,70 Q75,78 82,70" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round" />` : (mood === 'sad' ? `<path d="M68,72 Q75,66 82,72" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round" />` : ''); return `<div class="relative transition-transform duration-300 ${animationClass}"><svg width="150" height="130" viewBox="0 0 150 130" class="drop-shadow-lg"><ellipse cx="75" cy="125" rx="50" ry="5" fill="rgba(0,0,0,0.1)" /><path d="M125,70 Q145,50 150,60" fill="none" stroke="#a16207" stroke-width="12" stroke-linecap="round" class="origin-center transition-transform duration-500 ${tailClass}" /><rect x="95" y="95" width="20" height="30" fill="#c27803" rx="10" /><rect x="35" y="95" width="20" height="30" fill="#c27803" rx="10" /><ellipse cx="75" cy="90" rx="50" ry="35" fill="#ca8a04" /><rect x="75" y="95" width="20" height="30" fill="#d97706" rx="10" /><rect x="55" y="95" width="20" height="30" fill="#d97706" rx="10" /><g class="transition-transform duration-300" style="transform-origin: 75px 80px; transform: ${headTransform};"><ellipse cx="75" cy="55" rx="35" ry="30" fill="#eab308" /><path d="M45,40 Q30,30 35,60" fill="#a16207" class="transition-transform duration-300" style="transform: ${earTransform};" /><path d="M105,40 Q120,30 115,60" fill="#a16207" class="transition-transform duration-300" style="transform: ${earTransform};" /><ellipse cx="75" cy="68" rx="18" ry="12" fill="#fde047" /><ellipse cx="75" cy="65" rx="6" ry="4" fill="#1e293b" /><g>${eyeHTML}</g><g>${mouthHTML}</g></g></svg>${mood === 'sleeping' ? `<div class="absolute -top-4 -right-4 text-4xl animate-pulse">💤</div>` : ''}</div>`;}

    function getCatSVG(pet) {
        const mood = getPetMood(pet);
        const animationClass = pet.isPlaying ? 'animate-bounce' : (pet.isFeeding ? '' : 'animate-breathing');
        const headTransform = pet.isFeeding ? 'translateY(10px) rotate(10deg)' : (mood === 'sad' ? 'rotate(-5deg)' : 'rotate(5deg)');
        const tailClass = (mood === 'happy' || pet.isPlaying) ? 'animate-wiggle' : 'rotate-12';
        const whiskerPath1 = mood === 'sad' ? 'Q65,82 60,80' : 'Q65,76 60,74';
        const whiskerPath2 = mood === 'sad' ? 'Q85,82 90,80' : 'Q85,76 90,74';
        const eyeHTML = mood === 'sleeping' ? `<path d="M60,65 Q65,68 70,65" stroke="#1e293b" stroke-width="2" fill="none" /><path d="M80,65 Q85,68 90,65" stroke="#1e293b" stroke-width="2" fill="none" />` : `<ellipse cx="65" cy="65" rx="5" ry="7" fill="#16a34a" /><circle cx="64" cy="63" r="1.5" fill="white" /><ellipse cx="85" cy="65" rx="5" ry="7" fill="#16a34a" /><circle cx="84" cy="63" r="1.5" fill="white" />`;
        return `<div class="relative transition-transform duration-300 ${animationClass}"><svg width="150" height="130" viewBox="0 0 150 130" class="drop-shadow-lg"><ellipse cx="75" cy="125" rx="45" ry="5" fill="rgba(0,0,0,0.1)" /><path d="M115,80 Q140,70 135,100" fill="none" stroke="#f97316" stroke-width="10" stroke-linecap="round" class="origin-center transition-transform duration-500 ${tailClass}" /><ellipse cx="45" cy="105" rx="15" ry="18" fill="#fb923c" /><ellipse cx="105" cy="105" rx="15" ry="18" fill="#fb923c" /><ellipse cx="75" cy="100" rx="45" ry="30" fill="#fdba74" /><path d="M60,85 Q70,90 65,110" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round" /><path d="M90,85 Q80,90 85,110" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round" /><ellipse cx="55" cy="112" rx="12" ry="8" fill="#f97316" /><ellipse cx="95" cy="112" rx="12" ry="8" fill="#f97316" /><g class="transition-transform duration-300" style="transform-origin: 75px 80px; transform: ${headTransform};"><ellipse cx="75" cy="65" rx="30" ry="28" fill="#fed7aa" /><path d="M50,45 L55,30 L70,45 Z" fill="#fb923c" /><path d="M100,45 L95,30 L80,45 Z" fill="#fb923c" /><path d="M55,45 L58,35 L67,45 Z" fill="#fecaca" /><path d="M95,45 L92,35 L83,45 Z" fill="#fecaca" />${eyeHTML}<ellipse cx="75" cy="72" rx="3" ry="2" fill="#f472b6" /><path d="M75,74 L75,78" stroke="#f472b6" stroke-width="1" /><path d="M72,78 ${whiskerPath1}" stroke="#444" stroke-width="1" fill="none" stroke-linecap="round" /><path d="M78,78 ${whiskerPath2}" stroke="#444" stroke-width="1" fill="none" stroke-linecap="round" /></g></svg>${mood === 'sleeping' ? `<div class="absolute -top-4 -right-4 text-4xl animate-pulse">💤</div>` : ''}</div>`;
    }
    
    function getRabbitSVG(pet) {
        const mood = getPetMood(pet);
        const animationClass = pet.isPlaying ? 'animate-bounce' : 'animate-breathing';
        const headTransform = pet.isFeeding ? 'translateY(10px) rotate(15deg)' : (mood === 'sad' ? 'translateY(5px) rotate(-3deg)' : 'none');
        const earTransform = mood === 'sad' ? 'translateY(15px)' : 'none';
        const eyeHTML = mood === 'sleeping' ? `<path d="M60,70 Q65,67 70,70" stroke="#1e293b" stroke-width="2" fill="none" /><path d="M80,70 Q85,67 90,70" stroke="#1e293b" stroke-width="2" fill="none" />` : `<circle cx="65" cy="70" r="5" fill="#1e293b"><circle cx="64" cy="68" r="1.5" fill="white" /></circle><circle cx="85" cy="70" r="5" fill="#1e293b"><circle cx="84" cy="68" r="1.5" fill="white" /></circle>`;
        return `<div class="relative transition-transform duration-300 ${animationClass}"><svg width="150" height="130" viewBox="0 0 150 130" class="drop-shadow-lg"><ellipse cx="75" cy="125" rx="40" ry="5" fill="rgba(0,0,0,0.1)" /><circle cx="115" cy="100" r="15" fill="#f1f5f9" /><circle cx="120" cy="105" r="10" fill="#f8fafc" /><ellipse cx="75" cy="100" rx="40" ry="30" fill="#e2e8f0" /><ellipse cx="50" cy="115" rx="10" ry="8" fill="#f1f5f9" /><ellipse cx="100" cy="115" rx="10" ry="8" fill="#f1f5f9" /><g class="transition-transform duration-300" style="transform-origin: 75px 80px; transform: ${headTransform};"><ellipse cx="75" cy="70" rx="30" ry="25" fill="#f1f5f9" /><g class="transition-transform duration-300" style="transform: ${earTransform};"><path d="M60,50 C50,10 65,10 70,50" fill="#e2e8f0" /><path d="M61,48 C55,15 63,15 68,48" fill="#fecaca" /></g><g class="transition-transform duration-300" style="transform: ${earTransform};"><path d="M90,50 C100,10 85,10 80,50" fill="#e2e8f0" /><path d="M89,48 C95,15 87,15 82,48" fill="#fecaca" /></g>${eyeHTML}<ellipse cx="75" cy="80" rx="4" ry="3" fill="#fda4af" /><path d="M75,83 L75,86" stroke="#444" stroke-width="1" /><path d="M75,86 Q70,90 68,86" stroke="#444" stroke-width="1" fill="none" stroke-linecap="round" /><path d="M75,86 Q80,90 82,86" stroke="#444" stroke-width="1" fill="none" stroke-linecap="round" /></g></svg>${mood === 'sleeping' ? `<div class="absolute -top-12 -right-4 text-4xl animate-pulse">💤</div>` : ''}</div>`;
    }
    
    function getBirdSVG(pet) {
        const mood = getPetMood(pet);
        const animationClass = pet.isPlaying ? 'animate-bounce' : 'animate-breathing';
        const headTransform = pet.isFeeding ? 'rotate(25deg)' : (mood === 'sad' ? 'rotate(-15deg) translateY(5px)' : 'none');
        const wingTransform = pet.isPlaying ? 'rotate(-20deg)' : 'rotate(0)';
        const eyeHTML = mood === 'sleeping' ? `<path d="M80,55 Q85,52 90,55" stroke="#1e293b" stroke-width="2" fill="none" />` : `<circle cx="85" cy="55" r="4" fill="#1e293b"><circle cx="84" cy="54" r="1" fill="white" /></circle>`;
        return `<div class="relative transition-transform duration-300 ${animationClass}"><svg width="150" height="130" viewBox="0 0 150 130" class="drop-shadow-lg"><ellipse cx="75" cy="125" rx="30" ry="5" fill="rgba(0,0,0,0.1)" /><rect x="65" y="110" width="3" height="15" fill="#fb923c" /><rect x="82" y="110" width="3" height="15" fill="#fb923c" /><path d="M100,90 L120,80 L125,100 Z" fill="#60a5fa" /><ellipse cx="75" cy="90" rx="35" ry="30" fill="#3b82f6" /><path d="M60,95 Q80,70 95,95" fill="#60a5fa" class="transition-transform duration-300" style="transform-origin: 75px 95px; transform: ${wingTransform};" /><g class="transition-transform duration-300" style="transform-origin: 75px 70px; transform: ${headTransform};"><circle cx="75" cy="60" r="25" fill="#93c5fd" /><path d="M95,65 L110,60 L95,55 Z" fill="#f97316" />${eyeHTML}</g></svg>${mood === 'sleeping' ? `<div class="absolute -top-8 -right-4 text-4xl animate-pulse">💤</div>` : ''}</div>`;
    }

    init();
});
