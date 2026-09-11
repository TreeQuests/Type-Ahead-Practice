/**
 * URL of the dictionary used by the random-word paragraph generator.
 *
 * @type {string}
 */
const DICTIONARY_FILE =
    "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt";

/**
 * URL containing pre-written English paragraphs.
 *
 * Paragraphs are separated by blank lines.
 *
 * @type {string}
 */
const PARAGRAPHS_FILE =
    "https://raw.githubusercontent.com/0xaldric/video-extract-transcript/main/fv8zpYI9n6s.paragraphs.txt";

/**
 * Key used to store application settings in localStorage.
 *
 * @type {string}
 */
const SETTINGS_STORAGE_KEY = "type-ahead-practice-settings";

/**
 * Maximum number of words that the application will allow
 * in a generated paragraph.
 *
 * @type {number}
 */
const MAX_PARAGRAPH_WORDS = 5000;

/**
 * Punctuation that can appear inside a sentence.
 *
 * @type {string[]}
 */
const INTERNAL_PUNCTUATION = [",", ",", ",", ";", ":"];

/**
 * DOM element containing the rendered paragraph.
 *
 * @type {HTMLElement}
 */
const paragraphDisplay = document.getElementById("paragraphDisplay");

/**
 * Textarea containing the user's typed input.
 *
 * @type {HTMLTextAreaElement}
 */
const typingInput = document.getElementById("typingInput");

/**
 * Select controlling the paragraph source.
 *
 * @type {HTMLSelectElement}
 */
const paragraphSourceInput = document.getElementById("paragraphSourceInput");

/**
 * Checkbox controlling read-ahead mode.
 *
 * @type {HTMLInputElement}
 */
const readAheadToggle = document.getElementById("readAheadToggle");

/**
 * Input controlling how many words are hidden ahead
 * of the current word.
 *
 * @type {HTMLInputElement}
 */
const wordsAheadInput = document.getElementById("wordsAheadInput");

/**
 * Input controlling the minimum generated paragraph length.
 *
 * @type {HTMLInputElement}
 */
const minWordsInput = document.getElementById("minWordsInput");

/**
 * Input controlling the maximum generated paragraph length.
 *
 * @type {HTMLInputElement}
 */
const maxWordsInput = document.getElementById("maxWordsInput");

/**
 * Container holding the paragraph length controls.
 *
 * @type {HTMLElement}
 */
const paragraphLengthControl = document.querySelector(".paragraph-length");

/**
 * Button used to restart the current paragraph.
 *
 * @type {HTMLButtonElement}
 */
const restartButton = document.getElementById("restartButton");

/**
 * Button used to generate a new paragraph.
 *
 * @type {HTMLButtonElement}
 */
const newParagraphButton = document.getElementById("newParagraphButton");

/**
 * Element displaying the user's words-per-minute score.
 *
 * @type {HTMLElement}
 */
const wpmElement = document.getElementById("wpm");

/**
 * Element displaying the user's typing accuracy.
 *
 * @type {HTMLElement}
 */
const accuracyElement = document.getElementById("accuracy");

/**
 * Element displaying the user's typing progress.
 *
 * @type {HTMLElement}
 */
const progressElement = document.getElementById("progress");

/**
 * Element displaying the dictionary loading status.
 *
 * @type {HTMLElement}
 */
const dictionaryStatus = document.getElementById("dictionaryStatus");

/**
 * Overlay containing the completed-paragraph results popup.
 *
 * @type {HTMLElement}
 */
const resultsOverlay = document.getElementById("resultsOverlay");

/**
 * Element displaying the final WPM inside the results popup.
 *
 * @type {HTMLElement}
 */
const resultsWpm = document.getElementById("resultsWpm");

/**
 * Element displaying the final accuracy inside the results popup.
 *
 * @type {HTMLElement}
 */
const resultsAccuracy = document.getElementById("resultsAccuracy");

/**
 * Button inside the results popup that restarts the paragraph.
 *
 * @type {HTMLButtonElement}
 */
const resultsRestartButton = document.getElementById("resultsRestartButton");

/**
 * Button inside the results popup that generates a new paragraph.
 *
 * @type {HTMLButtonElement}
 */
const resultsNewParagraphButton = document.getElementById(
    "resultsNewParagraphButton",
);

/**
 * Words available for paragraph generation.
 *
 * @type {string[]}
 */
let dictionary = [];

/**
 * Pre-written paragraphs available for paragraph practice.
 *
 * @type {string[]}
 */
let builtInParagraphs = [];

/**
 * Words contained in the current target paragraph.
 *
 * @type {string[]}
 */
let words = [];

/**
 * Complete text of the current target paragraph.
 *
 * @type {string}
 */
let currentParagraph = "";

/**
 * Timestamp indicating when the current typing session started.
 *
 * A value of `null` means the session has not started.
 *
 * @type {number|null}
 */
let startTime = null;

/**
 * Timestamp indicating when the current typing session ended.
 *
 * A value of `null` means the session is still active.
 *
 * @type {number|null}
 */
let endTime = null;

/**
 * Indicates whether the current paragraph has been completed.
 *
 * @type {boolean}
 */
let paragraphCompleted = false;

/**
 * Indicates whether the external dictionary has loaded
 * successfully.
 *
 * @type {boolean}
 */
let dictionaryLoaded = false;

/**
 * Indicates whether the pre-written paragraphs have loaded
 * successfully.
 *
 * @type {boolean}
 */
let builtInParagraphsLoaded = false;

/**
 * Load saved application settings from localStorage.
 *
 * Invalid or missing settings are ignored and the HTML
 * defaults remain in place.
 *
 * @returns {void}
 */
function loadSettings() {
    try {
        const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

        if (!storedSettings) {
            updateParagraphSourceVisibility();

            return;
        }

        const settings = JSON.parse(storedSettings);

        if (
            settings.paragraphSource === "random" ||
            settings.paragraphSource === "built-in"
        ) {
            paragraphSourceInput.value = settings.paragraphSource;
        }

        if (typeof settings.readAhead === "boolean") {
            readAheadToggle.checked = settings.readAhead;
        }

        if (Number.isFinite(settings.wordsAhead) && settings.wordsAhead >= 0) {
            wordsAheadInput.value = Math.min(
                50,
                Math.max(0, Math.trunc(settings.wordsAhead)),
            );
        }

        if (Number.isFinite(settings.minWords)) {
            minWordsInput.value = Math.max(
                1,
                Math.min(MAX_PARAGRAPH_WORDS, Math.trunc(settings.minWords)),
            );
        }

        if (Number.isFinite(settings.maxWords)) {
            maxWordsInput.value = Math.max(
                1,
                Math.min(MAX_PARAGRAPH_WORDS, Math.trunc(settings.maxWords)),
            );
        }
    } catch (error) {
        console.error("Could not load saved settings.", error);
    }

    updateParagraphSourceVisibility();
}

/**
 * Save the current application settings to localStorage.
 *
 * @returns {void}
 */
function saveSettings() {
    const settings = {
        paragraphSource: paragraphSourceInput.value,
        readAhead: readAheadToggle.checked,
        wordsAhead: Number.parseInt(wordsAheadInput.value, 10) || 0,
        minWords: Number.parseInt(minWordsInput.value, 10) || 40,
        maxWords: Number.parseInt(maxWordsInput.value, 10) || 80,
    };

    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Could not save settings.", error);
    }
}

/**
 * Determine whether the current paragraph source is
 * the built-in paragraph collection.
 *
 * @returns {boolean} Whether built-in paragraphs are active.
 */
function isBuiltInParagraphMode() {
    return paragraphSourceInput.value === "built-in";
}

/**
 * Update the visibility of the paragraph length controls.
 *
 * The minimum and maximum word controls are only relevant
 * when generating random paragraphs.
 *
 * @returns {void}
 */
function updateParagraphSourceVisibility() {
    paragraphLengthControl.hidden = isBuiltInParagraphMode();
}

/**
 * Hide the completed-paragraph results popup.
 *
 * @returns {void}
 */
function hideResultsPopup() {
    resultsOverlay.hidden = true;
}

/**
 * Show the completed-paragraph results popup.
 *
 * The final WPM and accuracy are captured from the completed
 * typing session before the popup is displayed.
 *
 * @returns {void}
 */
function showResultsPopup() {
    const { correctCharacters, typedCharacters } = getCharacterStats();

    const accuracy =
        typedCharacters === 0
            ? 100
            : Math.round((correctCharacters / typedCharacters) * 100);

    let wpm = 0;

    if (startTime !== null && endTime !== null && typedCharacters > 0) {
        const elapsedMinutes = (endTime - startTime) / 60000;

        if (elapsedMinutes > 0) {
            wpm = Math.round(typedCharacters / 5 / elapsedMinutes);
        }
    }

    resultsWpm.textContent = wpm;

    resultsAccuracy.textContent = `${accuracy}%`;

    resultsOverlay.hidden = false;
}

/**
 * Load the external dictionary.
 *
 * The dictionary is fetched as a plain text file, with one
 * word per line. Only lowercase alphabetic words are kept.
 *
 * @async
 * @returns {Promise<void>}
 */
async function loadDictionary() {
    dictionaryStatus.textContent = "Loading dictionary...";

    try {
        const response = await fetch(DICTIONARY_FILE);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();

        dictionary = text
            .split(/\r?\n/)
            .map((word) => word.trim().toLowerCase())
            .filter((word) => /^[a-z]+$/.test(word));

        dictionary = [...new Set(dictionary)];

        if (dictionary.length === 0) {
            throw new Error("The dictionary contains no usable words.");
        }

        dictionaryLoaded = true;

        dictionaryStatus.textContent = `${dictionary.length.toLocaleString()} words loaded.`;

        dictionaryStatus.classList.add("ready");

        typingInput.disabled = false;

        restartButton.disabled = false;

        newParagraphButton.disabled = false;

        await loadBuiltInParagraphs();

        generateNewParagraph();
    } catch (error) {
        console.error(error);

        dictionaryStatus.textContent =
            "Could not load the external dictionary.";

        dictionaryStatus.classList.add("error");

        typingInput.disabled = true;

        restartButton.disabled = true;

        newParagraphButton.disabled = true;
    }
}

/**
 * Load the collection of pre-written paragraphs.
 *
 * Paragraphs are separated by one or more blank lines.
 * Empty paragraphs are discarded.
 *
 * @async
 * @returns {Promise<void>}
 */
async function loadBuiltInParagraphs() {
    try {
        const response = await fetch(PARAGRAPHS_FILE);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();

        builtInParagraphs = text
            .split(/\r?\n\s*\r?\n/)
            .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
            .filter((paragraph) => paragraph.length > 0);

        if (builtInParagraphs.length === 0) {
            throw new Error("No usable paragraphs were found.");
        }

        builtInParagraphsLoaded = true;
    } catch (error) {
        console.error(error);

        builtInParagraphs = [];

        builtInParagraphsLoaded = false;
    }
}

/**
 * Return a random item from an array.
 *
 * @template T
 * @param {T[]} array Array to select an item from.
 * @returns {T} Randomly selected item.
 */
function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Return a random integer between two inclusive bounds.
 *
 * @param {number} min Minimum possible value.
 * @param {number} max Maximum possible value.
 * @returns {number} Random integer between `min` and `max`.
 */
function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Return a random word from the loaded dictionary.
 *
 * @returns {string} Random dictionary word.
 */
function randomWord() {
    return randomItem(dictionary);
}

/**
 * Capitalize the first letter of a word.
 *
 * @param {string} word Word to capitalize.
 * @returns {string} Word with its first character capitalized.
 */
function capitalize(word) {
    if (!word) {
        return word;
    }

    return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Read the requested paragraph length from the UI.
 *
 * The minimum and maximum values are clamped to the allowed
 * range. If the minimum exceeds the maximum, the values are
 * swapped.
 *
 * @returns {number} Random paragraph length within the requested range.
 */
function getParagraphLength() {
    let min = Number.parseInt(minWordsInput.value, 10);

    let max = Number.parseInt(maxWordsInput.value, 10);

    if (!Number.isFinite(min)) {
        min = 40;
    }

    if (!Number.isFinite(max)) {
        max = 80;
    }

    min = Math.max(1, Math.min(MAX_PARAGRAPH_WORDS, min));

    max = Math.max(1, Math.min(MAX_PARAGRAPH_WORDS, max));

    if (min > max) {
        [min, max] = [max, min];
    }

    minWordsInput.value = min;

    maxWordsInput.value = max;

    saveSettings();

    return randomInteger(min, max);
}

/**
 * Determine whether the current word should end a sentence.
 *
 * @param {number} currentWordIndex Index of the current word.
 * @param {number} targetWordCount Total number of words requested.
 * @param {number} wordsSinceSentenceStart Number of words in the current sentence.
 * @returns {boolean} Whether the current word should end the sentence.
 */
function shouldEndSentence(
    currentWordIndex,
    targetWordCount,
    wordsSinceSentenceStart,
) {
    if (wordsSinceSentenceStart < 5) {
        return false;
    }

    if (currentWordIndex === targetWordCount - 1) {
        return true;
    }

    if (wordsSinceSentenceStart >= 20) {
        return Math.random() < 0.75;
    }

    return Math.random() < 0.14;
}

/**
 * Determine whether internal punctuation should appear
 * after the current word.
 *
 * @param {number} wordIndex Index of the current word.
 * @param {number} wordsSinceSentenceStart Number of words in the current sentence.
 * @param {number} targetWordCount Total number of words requested.
 * @returns {boolean} Whether internal punctuation should be added.
 */
function shouldUseInternalPunctuation(
    wordIndex,
    wordsSinceSentenceStart,
    targetWordCount,
) {
    if (wordIndex >= targetWordCount - 1) {
        return false;
    }

    if (wordsSinceSentenceStart < 3) {
        return false;
    }

    return Math.random() < 0.055;
}

/**
 * Generate one random paragraph.
 *
 * Words are randomly selected from the dictionary and
 * punctuation is added according to the paragraph-generation
 * rules.
 *
 * @returns {string} Generated paragraph.
 */
function generateParagraph() {
    const targetWordCount = getParagraphLength();

    const generatedWords = [];

    let sentenceStarts = true;

    let wordsSinceSentenceStart = 0;

    for (let index = 0; index < targetWordCount; index++) {
        let word = randomWord();

        if (sentenceStarts) {
            word = capitalize(word);

            sentenceStarts = false;
        }

        wordsSinceSentenceStart++;

        const endsSentence = shouldEndSentence(
            index,
            targetWordCount,
            wordsSinceSentenceStart,
        );

        if (endsSentence) {
            const random = Math.random();

            let punctuation = ".";

            if (random < 0.05) {
                punctuation = "!";
            } else if (random < 0.1) {
                punctuation = "?";
            }

            word += punctuation;

            sentenceStarts = true;

            wordsSinceSentenceStart = 0;
        } else if (
            shouldUseInternalPunctuation(
                index,
                wordsSinceSentenceStart,
                targetWordCount,
            )
        ) {
            word += randomItem(INTERNAL_PUNCTUATION);
        }

        generatedWords.push(word);
    }

    return generatedWords.join(" ");
}

/**
 * Return a random pre-written paragraph.
 *
 * @returns {string} Random built-in paragraph.
 */
function getBuiltInParagraph() {
    return randomItem(builtInParagraphs);
}

/**
 * Generate and start a completely new paragraph.
 *
 * The current typing state and timer are reset.
 *
 * The active paragraph source determines whether a generated
 * random paragraph or a pre-written paragraph is selected.
 *
 * @returns {void}
 */
function generateNewParagraph() {
    if (!dictionaryLoaded) {
        return;
    }

    hideResultsPopup();

    if (isBuiltInParagraphMode()) {
        if (!builtInParagraphsLoaded) {
            dictionaryStatus.textContent =
                "Could not load the built-in paragraphs.";

            dictionaryStatus.classList.remove("ready");

            dictionaryStatus.classList.add("error");

            return;
        }

        currentParagraph = getBuiltInParagraph();
    } else {
        currentParagraph = generateParagraph();
    }

    words = currentParagraph.split(" ");

    startTime = null;

    endTime = null;

    paragraphCompleted = false;

    typingInput.value = "";

    typingInput.disabled = false;

    renderParagraph();

    updateStats();

    typingInput.focus();
}

/**
 * Restart the current paragraph without generating
 * a different paragraph.
 *
 * @returns {void}
 */
function restartParagraph() {
    if (!currentParagraph) {
        return;
    }

    hideResultsPopup();

    startTime = null;

    endTime = null;

    paragraphCompleted = false;

    typingInput.value = "";

    typingInput.disabled = false;

    renderParagraph();

    updateStats();

    typingInput.focus();
}

/**
 * Find the first target word that has not been
 * completed exactly.
 *
 * The complete paragraph is treated as one continuous
 * character stream. Spaces therefore participate in
 * determining whether a word has been completed.
 *
 * @returns {number} Index of the first incomplete word.
 */
function getCurrentWordIndex() {
    const input = typingInput.value;

    let targetPosition = 0;

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        const targetWord = words[wordIndex];

        for (
            let characterIndex = 0;
            characterIndex < targetWord.length;
            characterIndex++
        ) {
            if (targetPosition >= input.length) {
                return wordIndex;
            }

            if (input[targetPosition] !== targetWord[characterIndex]) {
                return wordIndex;
            }

            targetPosition++;
        }

        if (wordIndex < words.length - 1) {
            if (targetPosition >= input.length) {
                return wordIndex;
            }

            if (input[targetPosition] !== " ") {
                return wordIndex;
            }

            targetPosition++;
        }
    }

    return words.length;
}

/**
 * Get the character position where a target word begins
 * inside the complete paragraph.
 *
 * @param {number} wordIndex Index of the target word.
 * @returns {number} Character offset of the word.
 */
function getWordStartPosition(wordIndex) {
    let position = 0;

    for (let index = 0; index < wordIndex; index++) {
        position += words[index].length + 1;
    }

    return position;
}

/**
 * Determine whether the current word has been entered
 * exactly and can therefore advance to its separator.
 *
 * @param {number} wordIndex Index of the current word.
 * @returns {boolean} Whether the word is exactly correct.
 */
function isCurrentWordCorrect(wordIndex) {
    const startPosition = getWordStartPosition(wordIndex);

    const targetWord = words[wordIndex];

    const typedWord = typingInput.value.slice(
        startPosition,
        startPosition + targetWord.length,
    );

    return typedWord === targetWord;
}

/**
 * Limit the user's input to the maximum number of characters
 * allowed for the current word.
 *
 * If the current word is already exactly correct, one
 * additional character is allowed so the user can enter
 * the required separating space.
 *
 * @returns {void}
 */
function enforceCurrentWordLimit() {
    const currentWordIndex = getCurrentWordIndex();

    if (currentWordIndex >= words.length) {
        return;
    }

    const wordStartPosition = getWordStartPosition(currentWordIndex);

    const currentWord = words[currentWordIndex];

    let maximumLength = wordStartPosition + currentWord.length;

    if (
        isCurrentWordCorrect(currentWordIndex) &&
        currentWordIndex < words.length - 1
    ) {
        maximumLength++;
    }

    if (typingInput.value.length > maximumLength) {
        typingInput.value = typingInput.value.slice(0, maximumLength);
    }
}

/**
 * Determine whether a typed character matches
 * the corresponding target character.
 *
 * @param {string} targetWord Target word.
 * @param {string} typedWord Word entered by the user.
 * @param {number} index Character index to compare.
 * @returns {boolean} Whether the characters match.
 */
function isCharacterCorrect(targetWord, typedWord, index) {
    return typedWord[index] === targetWord[index];
}

/**
 * Create one character element.
 *
 * @param {string} character Character to display.
 * @param {string} [className=""] Optional CSS class.
 * @returns {HTMLSpanElement} Created character element.
 */
function createCharacterElement(character, className = "") {
    const element = document.createElement("span");

    element.classList.add("character");

    if (className) {
        element.classList.add(className);
    }

    element.textContent = character;

    return element;
}

/**
 * Render one target word character-by-character.
 *
 * Correct characters are hidden by read-ahead mode while the
 * word has no error. Once an error occurs, the entire target
 * word is revealed so the user can see the complete word while
 * correcting it.
 *
 * When an error occurs inside a blacked-out word, the target
 * character is shown in red instead of the character the user
 * actually typed.
 *
 * @param {string} targetWord Target word.
 * @param {string} typedWord Characters typed for the word.
 * @param {number} wordIndex Index of the word in the paragraph.
 * @param {number} currentWordIndex Index of the current word.
 * @param {boolean} readAheadEnabled Whether read-ahead mode is active.
 * @returns {HTMLSpanElement} Rendered word element.
 */
function renderWord(
    targetWord,
    typedWord,
    wordIndex,
    currentWordIndex,
    readAheadEnabled,
) {
    const wordElement = document.createElement("span");

    wordElement.classList.add("word");

    if (wordIndex === currentWordIndex) {
        wordElement.classList.add("current");
    }

    /**
     * Number of words hidden ahead of the current word.
     *
     * @type {number}
     */
    const wordsAhead = Math.max(
        0,
        Math.min(50, Number.parseInt(wordsAheadInput.value, 10) || 0),
    );

    const isBlackedOut =
        readAheadEnabled &&
        wordsAhead > 0 &&
        currentWordIndex >= wordsAhead &&
        wordIndex >= currentWordIndex &&
        wordIndex < currentWordIndex + wordsAhead;

    /**
     * Indicates whether the word contains a typing error.
     *
     * @type {boolean}
     */
    let hasError = false;

    for (
        let characterIndex = 0;
        characterIndex < typedWord.length;
        characterIndex++
    ) {
        if (
            characterIndex >= targetWord.length ||
            typedWord[characterIndex] !== targetWord[characterIndex]
        ) {
            hasError = true;

            break;
        }
    }

    const shouldBlackOutWord = isBlackedOut && !hasError;

    if (shouldBlackOutWord) {
        wordElement.classList.add("blacked-out");
    }

    for (
        let characterIndex = 0;
        characterIndex < targetWord.length;
        characterIndex++
    ) {
        const targetCharacter = targetWord[characterIndex];

        if (characterIndex >= typedWord.length) {
            wordElement.appendChild(createCharacterElement(targetCharacter));

            continue;
        }

        const correct = isCharacterCorrect(
            targetWord,
            typedWord,
            characterIndex,
        );

        if (correct) {
            wordElement.appendChild(
                createCharacterElement(
                    targetCharacter,
                    shouldBlackOutWord ? "" : "correct",
                ),
            );
        } else {
            const displayedCharacter =
                isBlackedOut && hasError
                    ? targetCharacter
                    : typedWord[characterIndex];

            wordElement.appendChild(
                createCharacterElement(
                    displayedCharacter,
                    "incorrect-character",
                ),
            );
        }
    }

    for (
        let characterIndex = targetWord.length;
        characterIndex < typedWord.length;
        characterIndex++
    ) {
        wordElement.appendChild(
            createCharacterElement(
                typedWord[characterIndex],
                "incorrect-character",
            ),
        );
    }

    return wordElement;
}

/**
 * Render the entire target paragraph.
 *
 * @returns {void}
 */
function renderParagraph() {
    const currentWordIndex = getCurrentWordIndex();

    const readAheadEnabled = readAheadToggle.checked;

    const input = typingInput.value;

    paragraphDisplay.replaceChildren();

    let targetPosition = 0;

    words.forEach((word, wordIndex) => {
        let typedWord = "";

        if (wordIndex < currentWordIndex) {
            typedWord = word;
        } else if (wordIndex === currentWordIndex) {
            typedWord = input.slice(
                targetPosition,
                targetPosition + word.length,
            );
        }

        const wordElement = renderWord(
            word,
            typedWord,
            wordIndex,
            currentWordIndex,
            readAheadEnabled,
        );

        paragraphDisplay.appendChild(wordElement);

        targetPosition += word.length;

        if (wordIndex < words.length - 1) {
            const separatorPosition = targetPosition;

            let separatorClass = "";

            let separatorCharacter = " ";

            if (separatorPosition < input.length) {
                const typedSeparator = input[separatorPosition];

                if (typedSeparator === " ") {
                    separatorCharacter = " ";
                    separatorClass = "correct";
                } else {
                    separatorCharacter = typedSeparator;
                    separatorClass = "incorrect-character";
                }
            }

            if (
                wordIndex < currentWordIndex ||
                (wordIndex === currentWordIndex &&
                    isCurrentWordCorrect(wordIndex) &&
                    separatorPosition < input.length)
            ) {
                paragraphDisplay.appendChild(
                    createCharacterElement(separatorCharacter, separatorClass),
                );
            } else {
                paragraphDisplay.appendChild(createCharacterElement(" "));
            }

            targetPosition++;
        }
    });
}

/**
 * Calculate character-based typing statistics.
 *
 * @returns {{
 *     correctCharacters: number,
 *     typedCharacters: number
 * }} Character statistics.
 */
function getCharacterStats() {
    const input = typingInput.value;

    const targetText = currentParagraph;

    let correctCharacters = 0;

    const typedCharacters = input.length;

    const comparisonLength = Math.min(input.length, targetText.length);

    for (let index = 0; index < comparisonLength; index++) {
        if (input[index] === targetText[index]) {
            correctCharacters++;
        }
    }

    return {
        correctCharacters,
        typedCharacters,
    };
}

/**
 * Calculate and display WPM, accuracy, and progress.
 *
 * The WPM uses the active session timer. Once the paragraph
 * is completed, the stored end time is used so the displayed
 * result never changes afterward.
 *
 * @returns {void}
 */
function updateStats() {
    const { correctCharacters, typedCharacters } = getCharacterStats();

    const accuracy =
        typedCharacters === 0
            ? 100
            : Math.round((correctCharacters / typedCharacters) * 100);

    let progress = 0;

    if (currentParagraph.length > 0) {
        progress = Math.min(
            100,
            Math.round(
                (typingInput.value.length / currentParagraph.length) * 100,
            ),
        );
    }

    let wpm = 0;

    if (startTime !== null && typedCharacters > 0) {
        const timerEnd = endTime ?? Date.now();

        const elapsedMinutes = (timerEnd - startTime) / 60000;

        if (elapsedMinutes > 0) {
            const standardWords = typedCharacters / 5;

            wpm = Math.round(standardWords / elapsedMinutes);
        }
    }

    wpmElement.textContent = wpm;

    accuracyElement.textContent = `${accuracy}%`;

    progressElement.textContent = `${progress}%`;
}

/**
 * Finish the current typing session.
 *
 * The timer is stopped permanently and the final results
 * popup is displayed.
 *
 * @returns {void}
 */
function completeParagraph() {
    if (paragraphCompleted) {
        return;
    }

    paragraphCompleted = true;

    endTime = Date.now();

    typingInput.disabled = true;

    updateStats();

    showResultsPopup();
}

/**
 * Handle changes to the paragraph source selector.
 *
 * The paragraph-length controls are only relevant to the
 * random-word generator, so they are hidden when using
 * pre-written paragraphs.
 *
 * @returns {void}
 */
function updateParagraphSource() {
    updateParagraphSourceVisibility();

    saveSettings();

    generateNewParagraph();
}

/**
 * Handle user typing input.
 *
 * The timer starts with the first typed character and stops
 * permanently when the entire paragraph is completed.
 *
 * @returns {void}
 */
typingInput.addEventListener("input", () => {
    if (paragraphCompleted) {
        return;
    }

    if (startTime === null && typingInput.value.length > 0) {
        startTime = Date.now();
    }

    enforceCurrentWordLimit();

    renderParagraph();

    updateStats();

    if (typingInput.value === currentParagraph) {
        completeParagraph();
    }
});

/**
 * Re-render the paragraph when read-ahead mode
 * is toggled and save the new setting.
 *
 * @returns {void}
 */
readAheadToggle.addEventListener("change", () => {
    saveSettings();

    renderParagraph();
});

/**
 * Re-render the paragraph when the number of
 * hidden words changes and save the new setting.
 *
 * @returns {void}
 */
wordsAheadInput.addEventListener("input", () => {
    saveSettings();

    renderParagraph();
});

/**
 * Normalize and save the minimum paragraph length
 * when the input changes.
 *
 * @returns {void}
 */
minWordsInput.addEventListener("change", () => {
    getParagraphLength();

    saveSettings();
});

/**
 * Normalize and save the maximum paragraph length
 * when the input changes.
 *
 * @returns {void}
 */
maxWordsInput.addEventListener("change", () => {
    getParagraphLength();

    saveSettings();
});

/**
 * Change between generated and pre-written paragraphs.
 *
 * @returns {void}
 */
paragraphSourceInput.addEventListener("change", () => {
    updateParagraphSource();
});

/**
 * Restart the current paragraph when the restart button
 * is clicked.
 *
 * @returns {void}
 */
restartButton.addEventListener("click", () => {
    restartParagraph();
});

/**
 * Generate a new paragraph when the new paragraph button
 * is clicked.
 *
 * @returns {void}
 */
newParagraphButton.addEventListener("click", () => {
    generateNewParagraph();
});

/**
 * Restart the current paragraph from the results popup.
 *
 * @returns {void}
 */
resultsRestartButton.addEventListener("click", () => {
    restartParagraph();
});

/**
 * Generate a new paragraph from the results popup.
 *
 * @returns {void}
 */
resultsNewParagraphButton.addEventListener("click", () => {
    generateNewParagraph();
});

/*
 * Load saved settings before loading external data.
 *
 * This ensures that the correct controls are visible
 * immediately, including after a page refresh.
 */
loadSettings();

/**
 * Start the application by loading the dictionary.
 *
 * @returns {void}
 */
loadDictionary();
