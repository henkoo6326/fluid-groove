// script.js (최종 통합 코드 - 모든 악기 로직 포함)

// ------------------------------------------------------------------
// 0. 전역 변수 정의
// ------------------------------------------------------------------

// 🎧 오디오 객체를 관리하는 맵 (모든 페이지 공통)
const audioCache = {};

// ⭐ E. Guitar / Bass 스트럼(드래그) 상태 관리 변수
let isDragging = false;

// ------------------------------------------------------------------
// 1. 핵심 오디오 및 활성화 제어 함수
// ------------------------------------------------------------------

/**
 * 페이지 내에서 활성화 상태가 될 수 있는 모든 요소들을 선택합니다.
 * @returns {NodeList} 모든 인터랙티브 요소 리스트
 */
function getAllInteractiveElements() {
    // Fav 버튼, 드럼, E.Guitar, Bass의 단일 선택 요소만 포함 (키보드 건반 제외)
    return document.querySelectorAll(
        ".fav-button-wrap h1, .circle, .bottom .radius, .e-guitar .string-wrap, .bass .string-wrap"
    );
}

/**
 * 특정 요소를 제외하고 현재 활성화된 모든 요소의 상태를 초기화(비활성화)하고 오디오를 중지합니다.
 * ⭐ 단일 선택 규칙을 보장하며, 비활성화 시 기타 줄의 진동도 멈춥니다. ⭐
 * @param {HTMLElement} [exceptElement=null] - 초기화에서 제외할 요소 (현재 클릭된 요소)
 */
function resetAllButtonsAndAudio(exceptElement = null) {
    const allElements = getAllInteractiveElements();

    allElements.forEach((element) => {
        // 제외 요소가 아니며, 현재 활성화 상태인 경우에만 처리
        if (element !== exceptElement && element.classList.contains("active")) {
            const soundPath = element.dataset.sound;

            // 1. 오디오 정지 및 초기화
            if (soundPath && audioCache[soundPath]) {
                audioCache[soundPath].pause();
                audioCache[soundPath].currentTime = 0;
            }

            // 2. 활성화 클래스 제거
            element.classList.remove("active");

            // 3. 기타/베이스 줄 진동 및 내부 .string 활성화 클래스 제거
            if (element.classList.contains("string-wrap")) {
                const string = element.querySelector(".string");
                if (string) string.classList.remove("vibrating", "active");
            }
        }
    });
}

/**
 * 오디오를 재생하고 버튼의 활성화/비활성화 상태를 토글하며, 단일 선택을 보장합니다.
 * 기타/베이스 줄 클릭 시: ff007f 색상 유지 및 진동은 1초 후 멈춤 (클릭 모드)
 * @param {HTMLElement} element - 클릭된 요소 (Fav, Drum, E.Guitar-Click, Bass-Click)
 * @param {string} soundPath - 재생할 오디오 파일 경로
 */
function toggleAudio(element, soundPath) {
    if (!soundPath) return;

    // 1. 오디오 객체 관리 및 캐싱
    if (!audioCache[soundPath]) {
        const audio = new Audio(soundPath);
        audioCache[soundPath] = audio;
    }
    const audio = audioCache[soundPath];
    const isGuitarString = element.classList.contains("string-wrap");
    const stringElement = isGuitarString
        ? element.querySelector(".string")
        : null;

    // 재생 종료 시 상태 초기화 함수 (클릭 모드)
    const onAudioEnded = () => {
        // 오디오 종료 시에 .active 제거 (기본 동작 유지)
        element.classList.remove("active");
        if (stringElement) {
            stringElement.classList.remove("vibrating", "active");
        }
    };
    audio.onended = onAudioEnded;

    if (isGuitarString) {
        audio.volume = 0.3; // E. 기타 및 베이스 소리를 50%로 줄임
    } else {
        audio.volume = 1.0; // 기본값 유지 (FAV, 드럼 등)
    }

    if (element.classList.contains("active")) {
        // 이미 활성화 상태라면: 자기 자신만 비활성화 (토글)
        audio.pause();
        audio.currentTime = 0;
        onAudioEnded(); // 즉시 상태 초기화
    } else {
        // 비활성화 상태라면:
        // 1. 다른 모든 요소 비활성화 (핵심: 단일 선택 보장)
        resetAllButtonsAndAudio(element);

        // 2. 현재 요소 활성화 및 재생
        audio.play().catch((error) => {
            console.error("Audio playback failed:", error);
        });
        element.classList.add("active");

        // 기타/베이스 줄: 내부 .string에 'active'와 'vibrating'을 추가해야 스타일 적용
        if (stringElement) {
            stringElement.classList.add("vibrating", "active");

            // ⭐ 진동은 1초(1000ms) 후에 멈추도록 설정 (클릭/토글 모드) ⭐
            setTimeout(() => {
                stringElement.classList.remove("vibrating");
            }, 1000);
        }
    }
}

/**
 * 스트럼(드래그) 시 사용: 단일 선택 규칙을 무시하고 오디오를 즉시 재생하고 진동을 적용합니다.
 * 기타/베이스 줄 드래그 시: 짧은 진동만 적용 (스트럼 모드)
 */
function playAudioForStrum(wrapElement, soundPath) {
    if (!soundPath) return;
    const stringElement = wrapElement.querySelector(".string");

    // 스트럼 시에는 새로운 Audio 객체를 생성하여 동시 재생 허용
    const audio = new Audio(soundPath);

    audio.volume = 0.4;

    audio.currentTime = 0;
    audio.play().catch((error) => console.error("Strum audio failed:", error));

    // 진동 적용 (일회성 타격)
    stringElement.classList.add("vibrating");

    // ⭐ 진동은 짧게 300ms 후에 멈추도록 설정 (스트럼 모드) ⭐
    setTimeout(() => {
        stringElement.classList.remove("vibrating");
    }, 300);

    // 스트럼 시에는 .active 클래스를 유지할 필요 없음.
}

/**
 * 기타/베이스 줄에 대한 클릭 및 스트럼 상호작용을 설정합니다.
 * @param {NodeList} strings - .string-wrap 요소 리스트
 * @param {Array} dataArray - 해당 악기의 줄 데이터 배열 (soundPath 포함)
 */
function setupGuitarInteraction(strings, dataArray) {
    strings.forEach((wrap) => {
        const stringElement = wrap.querySelector(".string");
        const note = stringElement.dataset.note;
        const data = dataArray.find((d) => d.note === note);

        if (data) {
            wrap.dataset.sound = data.sound;
            const soundPath = data.sound;

            // 클릭 이벤트: 단일 선택 (toggleAudio 사용)
            wrap.addEventListener("click", () => {
                if (!isDragging) {
                    toggleAudio(wrap, soundPath);
                }
            });

            // 마우스 호버 시 스트럼 이벤트: 동시 재생 (playAudioForStrum 사용)
            wrap.addEventListener("mouseenter", () => {
                if (isDragging) {
                    playAudioForStrum(wrap, soundPath);
                }
            });
        }
    });
}

// ------------------------------------------------------------------
// 2. DOMContentLoaded: 페이지 로딩 완료 후 이벤트 리스너 설정
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // 1. 커서를 기본값으로 되돌림 (로딩 완료 알림)
    document.body.style.cursor = "default";

    // -----------------------------------------------------------
    // A. 인덱스 페이지 (메인 메뉴 버튼) 로직 설정
    // -----------------------------------------------------------

    const buttons = document.querySelectorAll(".al-button-wrap h1");
    const poster = document.getElementById("poster-image");
    const drumButton = document.getElementById("drum-btn");

    // DRUM 버튼 활성화 및 초기 이미지 설정
    if (drumButton) {
        drumButton.classList.add("active");
        const initialImageSrc = drumButton.dataset.image;
        if (initialImageSrc && poster) {
            poster.style.backgroundImage = `url(${initialImageSrc})`;
        }
    }

    // 메인 버튼 클릭 이벤트 (이미지 변경 및 활성화)
    buttons.forEach((button) => {
        button.addEventListener("click", function () {
            const newImageSrc = this.dataset.image;

            if (newImageSrc && poster) {
                poster.style.backgroundImage = `url(${newImageSrc})`;
                buttons.forEach((btn) => btn.classList.remove("active"));
                this.classList.add("active");
            }
        });
    });

    // -----------------------------------------------------------
    // B. 악기별 데이터 정의 및 이벤트 리스너 설정
    // -----------------------------------------------------------

    // 🥁 드럼 킷 데이터 정의
    const drumKitData = [
        {
            selector: ".top .wrap:nth-child(1) .circle:nth-child(1)",
            name: "CRASH SYMBOL",
            sound: "assets/drum/crash.m4a", // ⭐ 경로 수정
        },
        {
            selector: ".top .wrap:nth-child(1) .circle:nth-child(2)",
            name: "RIDE SYMBOL",
            sound: "assets/drum/ride.m4a", // ⭐ 경로 수정
        },
        {
            selector: ".top .wrap:nth-child(2) .circle:nth-child(1)",
            name: "HIGH TOM",
            sound: "assets/drum/hightom.m4a", // ⭐ 경로 수정
        },
        {
            selector: ".top .wrap:nth-child(2) .circle:nth-child(2)",
            name: "MIDDLE TOM",
            sound: "assets/drum/midtom.m4a", // ⭐ 경로 수정
        },
        {
            selector: ".top .wrap:nth-child(3) .circle:nth-child(1)",
            name: "SNARE",
            sound: "assets/drum/snare.m4a", // ⭐ 경로 수정
        },
        {
            selector: ".top .wrap:nth-child(3) .circle:nth-child(2)",
            name: "HI-HAT",
            sound: "assets/drum/hihat.m4a", // ⭐ 경로 수정
        },
        {
            selector: ".top .wrap:nth-child(3) .circle:nth-child(3)",
            name: "LOW TOM",
            sound: "assets/drum/lowtom.m4a", // ⭐ 경로 수정
        },
        {
            selector: ".bottom .radius:nth-child(1)",
            name: "HI-HAT CTRL",
            sound: "assets/drum/hihatctrl.m4a", // ⭐ 경로 수정
        },
        {
            selector: ".bottom .radius:nth-child(2)",
            name: "BASS DRUM",
            sound: "assets/drum/bassdrum.m4a", // ⭐ 경로 수정
        },
    ];

    // 🎸 E. Guitar 줄 데이터 정의
    const eGuitarStringData = [
        { note: "E", sound: "assets/Eguitar/E6.m4a" }, // ⭐ 폴더 이름 수정
        { note: "A", sound: "assets/Eguitar/A5.m4a" }, // ⭐ 폴더 이름 수정
        { note: "D", sound: "assets/Eguitar/D4.m4a" }, // ⭐ 폴더 이름 수정
        { note: "G", sound: "assets/Eguitar/G3.m4a" }, // ⭐ 폴더 이름 수정
        { note: "B", sound: "assets/Eguitar/B2.m4a" }, // ⭐ 폴더 이름 수정
        { note: "e", sound: "assets/Eguitar/E1.m4a" }, // ⭐ 폴더 이름 수정
    ];

    // 🎸 Bass Guitar 줄 데이터 정의
    const bassStringData = [
        { note: "E", sound: "assets/bass/E.m4a" }, // .m4a로 변경
        { note: "A", sound: "assets/bass/A.m4a" }, // .m4a로 변경
        { note: "D", sound: "assets/bass/D.m4a" }, // .m4a로 변경
        { note: "G", sound: "assets/bass/G.m4a" }, // .m4a로 변경
    ];

    // 1. Fav Button 이벤트 리스너 설정 (toggleAudio 사용)
    const favButtons = document.querySelectorAll(".fav-button-wrap h1");
    favButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const soundPath = button.dataset.sound;
            toggleAudio(button, soundPath);
        });
    });

    // 2. Drum Kit (Circle/Radius) 이벤트 리스너 설정 (toggleAudio 사용)
    drumKitData.forEach((item) => {
        const element = document.querySelector(item.selector);
        if (element) {
            element.innerHTML = `<p class="key-w white circle-text">${item.name}</p>`;
            element.dataset.sound = item.sound;
            element.addEventListener("click", () => {
                toggleAudio(element, item.sound);
            });
        }
    });

    // 3. E. Guitar (String) 이벤트 리스너 설정
    const eGuitarStrings = document.querySelectorAll(".e-guitar .string-wrap");
    if (eGuitarStrings.length > 0) {
        setupGuitarInteraction(eGuitarStrings, eGuitarStringData);
    }

    // 4. BASS Guitar (String) 이벤트 리스너 설정
    const bassStrings = document.querySelectorAll(".bass .string-wrap");
    if (bassStrings.length > 0) {
        setupGuitarInteraction(bassStrings, bassStringData);
    }

    // ⭐ 5. KEYBOARD (Piano) 이벤트 리스너 설정 (수정됨) ⭐
    const piano = document.getElementById("piano");
    if (piano) {
        const whiteKeysContainer = document.getElementById("white");
        const blackKeysContainer = document.getElementById("black");

        // 흑건반 매핑 데이터 (10개)
        const whiteNotes = ["C", "D", "E", "F", "G", "A", "B"];
        const allBlackNotes = [
            "C#",
            "D#",
            "F#",
            "G#",
            "A#",
            "C#",
            "D#",
            "F#",
            "G#",
            "A#",
        ];

        // 1. 흰건반 생성 및 초기화 (14개)
        if (whiteKeysContainer) whiteKeysContainer.innerHTML = "";
        for (let i = 0; i < 14; i++) {
            const note = whiteNotes[i % 7];
            const w = document.createElement("div");
            w.dataset.note = note;
            w.addEventListener("click", () => playPianoNote(note));
            whiteKeysContainer.appendChild(w);
        }

        // 2. 흑건반 생성 및 초기화 (10개)
        if (blackKeysContainer) blackKeysContainer.innerHTML = "";
        for (let i = 0; i < 10; i++) {
            const note = allBlackNotes[i];
            const b = document.createElement("div");
            b.dataset.note = note;
            b.addEventListener("click", () => playPianoNote(note));
            blackKeysContainer.appendChild(b);
        }

        /**
         * 🎹 피아노 음 재생 함수 (동시 재생 허용)
         * HTML에 정의된 <audio> 태그를 사용하며, 단일 선택 로직을 따르지 않습니다.
         * @param {string} noteId - HTML audio 요소의 ID (예: "C", "C#")
         */
        function playPianoNote(noteId) {
            const soundElement = document.getElementById(noteId);
            if (soundElement) {
                // 오디오 정지 및 초기화 (빠르게 재연주 가능)
                soundElement.currentTime = 0;
                soundElement.play().catch((error) => {
                    console.error(`Error playing ${noteId}:`, error);
                });
            }
        }
    }

    // -----------------------------------------------------------
    // C. 공통 드래그 상태 관리 (기타/베이스용)
    // -----------------------------------------------------------

    // 5. 전역 드래그 상태 관리 (마우스 이벤트)
    // 이 코드는 E.Guitar와 BASS 모두에게 적용됩니다.
    if (eGuitarStrings.length > 0 || bassStrings.length > 0) {
        document.addEventListener("mousedown", (event) => {
            if (event.button === 0) {
                isDragging = true;
            }
        });
        document.addEventListener("mouseup", () => {
            isDragging = false;
        });
        document.addEventListener("mouseleave", () => {
            isDragging = false;
        });
    }
});
