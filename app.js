/* ============================================
   DingDing 番茄钟 v4.0 - 应用逻辑
   ============================================ */

(function () {
    'use strict';

    // --- State ---
    var state = {
        taskName: '',              // 任务名称
        originalDuration: 0,       // 原始时长（秒）
        remainingSeconds: 0,       // 剩余时间（秒）
        elapsedSeconds: 0,         // 实际已过时间（秒）
        dingCount: 0,              // "顶"的次数
        weiCount: 0,               // "萎"的次数
        timerInterval: null,       // 计时器 interval ID
        isPaused: false,           // 弹窗时暂停
        recorded: false,           // 是否已记录
        checkpoints: {             // 检查点是否已触发
            third: false,
            half: false,
            twoThirds: false
        }
    };

    // --- DOM Elements ---
    var dom = {
        focusTab: document.getElementById('focus-tab'),
        notebookTab: document.getElementById('notebook-tab'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        setupScreen: document.getElementById('setup-screen'),
        timerScreen: document.getElementById('timer-screen'),
        completionScreen: document.getElementById('completion-screen'),
        modal: document.getElementById('modal'),
        modalText: document.getElementById('modal-text'),
        setupPhase1: document.getElementById('setup-phase1'),
        setupPhase2: document.getElementById('setup-phase2'),
        startFlowBtn: document.getElementById('start-flow-btn'),
        taskNameInput: document.getElementById('task-name-input'),
        timerTaskName: document.getElementById('timer-task-name'),
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
        timeBtns: document.querySelectorAll('.time-btn'),
        recordsList: document.getElementById('records-list'),
        emptyState: document.getElementById('empty-state'),
        notebookSubtitle: document.getElementById('notebook-subtitle'),
        clearRecordsBtn: document.getElementById('clear-records-btn')
    };

    // --- Initialization ---
    function init() {
        // "当个事儿办" button -> show phase 2
        dom.startFlowBtn.addEventListener('click', function () {
            dom.setupPhase1.style.display = 'none';
            dom.setupPhase2.classList.remove('hidden');
            dom.taskNameInput.value = '';
            dom.taskNameInput.focus();
        });

        // Time selection buttons
        dom.timeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                startTimer(parseInt(this.dataset.minutes, 10));
            });
        });

        // Checkpoint modal buttons
        dom.dingBtn.addEventListener('click', handleDing);
        dom.weiBtn.addEventListener('click', handleWei);

        // Reset / Restart buttons
        dom.resetBtn.addEventListener('click', function () {
            resetToSetup(false);
        });
        dom.restartBtn.addEventListener('click', function () {
            resetToSetup(true);
        });

        // Tab switching
        dom.tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab(this.dataset.tab);
            });
        });

        // Clear records
        dom.clearRecordsBtn.addEventListener('click', function () {
            if (confirm('确定要清空所有记录吗？')) {
                localStorage.removeItem('dingding-records');
                renderNotebook();
            }
        });

        // Enter key in name input
        dom.taskNameInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                dom.timeBtns[0].focus();
            }
        });
    }

    // --- Tab Switching ---
    function switchTab(tab) {
        dom.tabBtns.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        if (tab === 'focus') {
            dom.focusTab.style.display = '';
            dom.notebookTab.classList.add('hidden');
        } else {
            dom.focusTab.style.display = 'none';
            dom.notebookTab.classList.remove('hidden');
            renderNotebook();
        }
    }

    // --- Start Timer ---
    function startTimer(minutes) {
        var nameVal = dom.taskNameInput.value.trim();
        state.taskName = nameVal || '专注';
        state.originalDuration = minutes * 60;
        state.remainingSeconds = state.originalDuration;
        state.elapsedSeconds = 0;
        state.dingCount = 0;
        state.weiCount = 0;
        state.isPaused = false;
        state.recorded = false;
        state.checkpoints = { third: false, half: false, twoThirds: false };

        // Show task name on timer screen
        dom.timerTaskName.textContent = state.taskName;

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

        // Save record
        if (!state.recorded) {
            saveRecord(true);
            state.recorded = true;
        }

        // Show completion screen
        var totalMinutes = Math.round(state.elapsedSeconds / 60);
        dom.finalDuration.textContent = totalMinutes;
        dom.finalDing.textContent = state.dingCount;
        dom.finalWei.textContent = state.weiCount;

        showScreen('completion');
    }

    // --- Reset to Setup ---
    function resetToSetup(fromCompletion) {
        // Save incomplete record if timer was running
        if (!fromCompletion && state.timerInterval && state.elapsedSeconds > 10 && !state.recorded) {
            saveRecord(false);
            state.recorded = true;
        }

        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        dom.timeDisplay.classList.remove('running');
        dom.flower.classList.remove('wilted');

        // Reset setup to phase 1
        dom.setupPhase1.style.display = '';
        dom.setupPhase2.classList.add('hidden');

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

    // --- Records / localStorage ---
    function saveRecord(completed) {
        var records = JSON.parse(localStorage.getItem('dingding-records') || '[]');
        var now = new Date();
        var dateStr = String(now.getFullYear()).slice(2) + '-' +
                      String(now.getMonth() + 1).padStart(2, '0') + '-' +
                      String(now.getDate()).padStart(2, '0');

        records.push({
            date: dateStr,
            name: state.taskName,
            ding: state.dingCount,
            wei: state.weiCount,
            completed: completed
        });

        localStorage.setItem('dingding-records', JSON.stringify(records));
    }

    function getQualityText(record) {
        if (!record.completed) return '拉完了';
        var diff = record.ding - record.wei;
        if (diff > 0) return '夯得一批';
        if (diff === 0) return '平庸的';
        return '拉完了';
    }

    function getQualityClass(record) {
        if (!record.completed) return 'quality-low';
        var diff = record.ding - record.wei;
        if (diff > 0) return 'quality-high';
        if (diff === 0) return 'quality-mid';
        return 'quality-low';
    }

    function renderNotebook() {
        var records = JSON.parse(localStorage.getItem('dingding-records') || '[]');

        if (records.length === 0) {
            dom.recordsList.innerHTML = '';
            dom.emptyState.classList.remove('hidden');
            dom.clearRecordsBtn.classList.add('hidden');
            dom.notebookSubtitle.textContent = '';
            return;
        }

        dom.emptyState.classList.add('hidden');
        dom.clearRecordsBtn.classList.remove('hidden');
        dom.notebookSubtitle.textContent = '共 ' + records.length + ' 条记录';

        // Render in reverse order (newest first)
        dom.recordsList.innerHTML = records.slice().reverse().map(function (record) {
            var qt = getQualityText(record);
            var qc = getQualityClass(record);
            return '<div class="record-entry glass-card">' +
                '<p class="record-text">' +
                '你于"' + record.date + '"把"「' + record.name + '」"当了个事儿办，' +
                '中间你顶了' + record.ding + '次，萎了' + record.wei + '次，' +
                '你进入了<span class="' + qc + '">' + qt + '</span>的心流' +
                '</p>' +
                '</div>';
        }).join('');
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
