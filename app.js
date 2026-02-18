/* ============================================
   DingDing 番茄钟 - 应用逻辑
   ============================================ */

(function () {
    'use strict';

    // --- State ---
    const state = {
        originalDuration: 0,   // 原始时长（秒）
        remainingSeconds: 0,   // 剩余时间（秒）
        elapsedSeconds: 0,     // 实际已过时间（秒）
        dingCount: 0,          // "顶"的次数
        weiCount: 0,           // "萎"的次数
        timerInterval: null,   // 计时器 interval ID
        isPaused: false,       // 弹窗时暂停
        checkpoints: {         // 检查点是否已触发
            third: false,
            half: false,
            twoThirds: false
        }
    };

    // --- DOM Elements ---
    const dom = {
        setupScreen: document.getElementById('setup-screen'),
        timerScreen: document.getElementById('timer-screen'),
        completionScreen: document.getElementById('completion-screen'),
        modal: document.getElementById('modal'),
        modalText: document.getElementById('modal-text'),
        timeDisplay: document.getElementById('time-display'),
        dingCount: document.getElementById('ding-count'),
        weiCount: document.getElementById('wei-count'),
        flower: document.getElementById('flower-svg'),
        dingBtn: document.getElementById('ding-btn'),
        weiBtn: document.getElementById('wei-btn'),
        resetBtn: document.getElementById('reset-btn'),
        restartBtn: document.getElementById('restart-btn'),
        finalDuration: document.getElementById('final-duration'),
        finalDing: document.getElementById('final-ding'),
        finalWei: document.getElementById('final-wei'),
        timeBtns: document.querySelectorAll('.time-btn')
    };

    // --- Initialization ---
    function init() {
        // Time selection buttons
        dom.timeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var minutes = parseInt(this.dataset.minutes, 10);
                startTimer(minutes);
            });
        });

        // Modal buttons
        dom.dingBtn.addEventListener('click', handleDing);
        dom.weiBtn.addEventListener('click', handleWei);

        // Reset / Restart buttons
        dom.resetBtn.addEventListener('click', resetToSetup);
        dom.restartBtn.addEventListener('click', resetToSetup);
    }

    // --- Start Timer ---
    function startTimer(minutes) {
        state.originalDuration = minutes * 60;
        state.remainingSeconds = state.originalDuration;
        state.elapsedSeconds = 0;
        state.dingCount = 0;
        state.weiCount = 0;
        state.isPaused = false;
        state.checkpoints = { third: false, half: false, twoThirds: false };

        // Switch screens
        showScreen('timer');

        // Update display
        updateDisplay();
        updateFlower();

        // Add running class for pulse animation
        dom.timeDisplay.classList.add('running');

        // Start interval
        state.timerInterval = setInterval(tick, 1000);
    }

    // --- Timer Tick ---
    function tick() {
        if (state.isPaused) return;

        state.elapsedSeconds++;
        state.remainingSeconds--;

        if (state.remainingSeconds <= 0) {
            state.remainingSeconds = 0;
            completeTimer();
            return;
        }

        updateDisplay();
        checkCheckpoints();
    }

    // --- Check Checkpoints ---
    function checkCheckpoints() {
        var orig = state.originalDuration;
        var elapsed = state.elapsedSeconds;

        var thirdMark = Math.floor(orig / 3);
        var halfMark = Math.floor(orig / 2);
        var twoThirdsMark = Math.floor(orig * 2 / 3);

        if (!state.checkpoints.third && elapsed >= thirdMark) {
            state.checkpoints.third = true;
            showCheckpointModal(elapsed);
        } else if (!state.checkpoints.half && elapsed >= halfMark) {
            state.checkpoints.half = true;
            showCheckpointModal(elapsed);
        } else if (!state.checkpoints.twoThirds && elapsed >= twoThirdsMark) {
            state.checkpoints.twoThirds = true;
            showCheckpointModal(elapsed);
        }
    }

    // --- Show Checkpoint Modal ---
    function showCheckpointModal(elapsedSeconds) {
        state.isPaused = true;
        var timeStr = formatElapsedTime(elapsedSeconds);
        dom.modalText.textContent = '你已经专注' + timeStr + '，还顶得住吗？！';
        dom.modal.classList.remove('hidden');
        playDingSound();
    }

    // --- Handle "顶！" ---
    function handleDing() {
        state.dingCount++;

        // 时钟往前走3分钟（剩余时间减少180秒）
        state.remainingSeconds -= 180;
        if (state.remainingSeconds <= 0) {
            state.remainingSeconds = 0;
            closeModal();
            updateDisplay();
            completeTimer();
            return;
        }

        closeModal();
        updateDisplay();
    }

    // --- Handle "萎..." ---
    function handleWei() {
        state.weiCount++;

        // 累积1次则时间不变，1次以上则每次加5分钟
        if (state.weiCount > 1) {
            state.remainingSeconds += 300; // 5 minutes
        }

        closeModal();
        updateDisplay();
        updateFlower();
    }

    // --- Close Modal ---
    function closeModal() {
        dom.modal.classList.add('hidden');
        state.isPaused = false;
    }

    // --- Complete Timer ---
    function completeTimer() {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        dom.timeDisplay.classList.remove('running');

        // Play completion sound
        playCompletionSound();

        // Show completion screen
        var totalMinutes = Math.round(state.elapsedSeconds / 60);
        dom.finalDuration.textContent = totalMinutes;
        dom.finalDing.textContent = state.dingCount;
        dom.finalWei.textContent = state.weiCount;

        showScreen('completion');
    }

    // --- Reset to Setup ---
    function resetToSetup() {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        dom.timeDisplay.classList.remove('running');
        dom.flower.classList.remove('wilted');
        showScreen('setup');
    }

    // --- Show Screen ---
    function showScreen(name) {
        dom.setupScreen.classList.add('hidden');
        dom.timerScreen.classList.add('hidden');
        dom.completionScreen.classList.add('hidden');
        dom.modal.classList.add('hidden');

        switch (name) {
            case 'setup':
                dom.setupScreen.classList.remove('hidden');
                break;
            case 'timer':
                dom.timerScreen.classList.remove('hidden');
                break;
            case 'completion':
                dom.completionScreen.classList.remove('hidden');
                break;
        }
    }

    // --- Update Display ---
    function updateDisplay() {
        dom.timeDisplay.textContent = formatMMSS(state.remainingSeconds);
        dom.dingCount.textContent = state.dingCount;
        dom.weiCount.textContent = state.weiCount;
    }

    // --- Update Flower ---
    function updateFlower() {
        if (state.weiCount > 1) {
            dom.flower.classList.add('wilted');
        } else {
            dom.flower.classList.remove('wilted');
        }
    }

    // --- Format MM:SS ---
    function formatMMSS(totalSeconds) {
        var mins = Math.floor(totalSeconds / 60);
        var secs = totalSeconds % 60;
        return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    // --- Format Elapsed Time (Chinese) ---
    function formatElapsedTime(totalSeconds) {
        var mins = Math.floor(totalSeconds / 60);
        var secs = totalSeconds % 60;
        if (mins === 0) return secs + '秒';
        if (secs === 0) return mins + '分钟';
        return mins + '分' + secs + '秒';
    }

    // --- Sound: Ding Ding ---
    function playDingSound() {
        try {
            var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // First ding
            var osc1 = audioCtx.createOscillator();
            var gain1 = audioCtx.createGain();
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.frequency.value = 880;
            osc1.type = 'sine';
            gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            osc1.start(audioCtx.currentTime);
            osc1.stop(audioCtx.currentTime + 0.4);

            // Second ding
            var osc2 = audioCtx.createOscillator();
            var gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.frequency.value = 1100;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.25);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.65);
            osc2.start(audioCtx.currentTime + 0.25);
            osc2.stop(audioCtx.currentTime + 0.65);

            // Cleanup
            setTimeout(function () { audioCtx.close(); }, 1000);
        } catch (e) {
            // Web Audio API not supported, silently ignore
        }
    }

    // --- Sound: Completion ---
    function playCompletionSound() {
        try {
            var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

            notes.forEach(function (freq, i) {
                var osc = audioCtx.createOscillator();
                var gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                var startTime = audioCtx.currentTime + i * 0.15;
                gain.gain.setValueAtTime(0.25, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
                osc.start(startTime);
                osc.stop(startTime + 0.5);
            });

            setTimeout(function () { audioCtx.close(); }, 2000);
        } catch (e) {
            // Web Audio API not supported, silently ignore
        }
    }

    // --- Boot ---
    init();
})();
