
const DATA_URL = "chinese.json";

const state = {
  entries: [],
  activeLetter: "ALL",
  query: "",
  sort: "az",
  sentencesOnly: false,
  expanded: new Set() 
};

const $ = (id) => document.getElementById(id);

function plainPinyin(value = "") {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function getLetter(entry) {
  const first = plainPinyin(entry.pinyin)
    .replace(/[^a-z]/g, "")
    .charAt(0);

  return first ? first.toUpperCase() : "#";
}

function sortedEntries(entries) {
  const copy = [...entries];

  if (state.sort === "za") {
    copy.sort((a, b) =>
      plainPinyin(b.pinyin).localeCompare(plainPinyin(a.pinyin)) ||
      b.word.localeCompare(a.word)
    );
  } else if (state.sort === "hanzi") {
    copy.sort((a, b) =>
      a.word.localeCompare(b.word, "zh-Hans")
    );
  } else {
    copy.sort((a, b) =>
      plainPinyin(a.pinyin).localeCompare(plainPinyin(b.pinyin)) ||
      a.word.localeCompare(b.word)
    );
  }

  return copy;
}

function makeAlphabet() {
  const letters = [
    ...new Set(state.entries.map(getLetter))
  ].sort();

  const counts = Object.fromEntries(
    letters.map(letter => [
      letter,
      state.entries.filter(entry =>
        getLetter(entry) === letter
      ).length
    ])
  );

  const all = [
    {
      letter: "ALL",
      label: "All",
      count: state.entries.length
    },
    ...letters.map(letter => ({
      letter,
      label: letter,
      count: counts[letter]
    }))
  ];

  $("alphabet").innerHTML = all.map(item => `
    <button
      class="letter-btn ${
        state.activeLetter === item.letter ? "active" : ""
      }"
      data-letter="${item.letter}"
      type="button"
      title="${item.count} words"
    >
      ${item.label}
      <small>${item.count}</small>
    </button>
  `).join("");

  $("alphabet")
    .querySelectorAll("[data-letter]")
    .forEach(button => {
      button.addEventListener("click", () => {
        state.activeLetter = button.dataset.letter;
        render();
      });
    });

  $("letterCount").textContent = letters.length;
}

function matches(entry, query) {
  if (!query) return true;

  const haystack = [
    entry.word,
    entry.pinyin,
    plainPinyin(entry.pinyin),
    entry.meaning,
    ...entry.sentences.flatMap(sentence => [
      sentence.zh,
      sentence.en
    ])
  ].join(" ").toLowerCase();

  return (
    haystack.includes(query.toLowerCase()) ||
    plainPinyin(haystack).includes(plainPinyin(query))
  );
}

function renderEntry(entry, index) {
  const isOpen = state.expanded.has(entry.word);

  const examples = entry.sentences.length
    ? entry.sentences.map((sentence, n) => `
      <div class="example">
        <div class="example-label">
          EXAMPLE ${n + 1}
        </div>

        <p class="sentence-zh" lang="zh">
          ${escapeHTML(sentence.zh)}
        </p>

        <p class="sentence-en">
          ${escapeHTML(sentence.en)}
        </p>
      </div>
    `).join("")
    : `
      <p class="no-example">
        No example sentence recorded for this word.
      </p>
    `;

  return `
    <article class="word-card ${isOpen ? "open" : ""}">

      <button
        class="word-head"
        type="button"
        data-word="${escapeHTML(entry.word)}"
        aria-expanded="${isOpen}"
      >

        <span class="word-number">
          ${String(index + 1).padStart(3, "0")}
        </span>

        <span class="word-main">
          <span class="hanzi" lang="zh">
            ${escapeHTML(entry.word)}
          </span>

          <span class="pinyin">
            ${escapeHTML(entry.pinyin)}
          </span>
        </span>

        <span class="meaning">
          ${escapeHTML(entry.meaning)}
        </span>

        <span class="example-count">
          ${entry.sentences.length}
          ${entry.sentences.length === 1 ? "example" : "examples"}
        </span>

        <span class="chevron">
          ${isOpen ? "−" : "+"}
        </span>

      </button>

      <div class="word-details" ${isOpen ? "" : "hidden"}>
        ${examples}
      </div>

    </article>
  `;
}

function render() {
  const filtered = sortedEntries(state.entries).filter(entry => {
    const letterMatch =
      state.activeLetter === "ALL" ||
      getLetter(entry) === state.activeLetter;

    const queryMatch = matches(entry, state.query);

    const sentenceMatch =
      !state.sentencesOnly ||
      entry.sentences.length > 0;

    return letterMatch && queryMatch && sentenceMatch;
  });

  $("sectionTitle").textContent =
    state.activeLetter === "ALL"
      ? "All vocabulary"
      : `Letter ${state.activeLetter}`;

  $("resultSummary").textContent =
    `${filtered.length} of ${state.entries.length} words`;

  $("wordList").innerHTML = filtered
    .map(renderEntry)
    .join("");

  $("emptyState").classList.toggle(
    "hidden",
    filtered.length !== 0
  );

  $("wordList")
    .querySelectorAll("[data-word]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const word = button.dataset.word;

        if (state.expanded.has(word)) {
          state.expanded.delete(word);
        } else {
          state.expanded.add(word);
        }

        render();
      });
    });

  $("expandAll").textContent =
    filtered.length &&
    filtered.every(entry =>
      state.expanded.has(entry.word)
    )
      ? "Collapse all"
      : "Expand all";

  $("alphabet")
    .querySelectorAll("[data-letter]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.letter === state.activeLetter
      );
    });
}

async function init() {
  try {
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error("Could not load chinese.json");
    }

    const data = await response.json();

    state.entries = data.entries || [];

    $("wordCount").textContent =
      data.totalWords ?? state.entries.length;

    $("sentenceCount").textContent =
      data.totalSentences ??
      state.entries.reduce(
        (sum, entry) => sum + entry.sentences.length,
        0
      );

    makeAlphabet();
    render();

  } catch (error) {
    $("wordList").innerHTML = `
      <div class="error">
        Unable to load chinese.json.
        Make sure all three files are in the same folder
        and open the website using a local server.
      </div>
    `;

    $("resultSummary").textContent =
      "Data file could not be loaded.";

    console.error(error);
  }
}

// SEARCH
$("searchInput").addEventListener("input", event => {
  state.query = event.target.value.trim();

  $("clearSearch").classList.toggle(
    "visible",
    Boolean(state.query)
  );

  render();
});

// CLEAR SEARCH
$("clearSearch").addEventListener("click", () => {
  $("searchInput").value = "";
  state.query = "";

  $("clearSearch").classList.remove("visible");

  render();
});

// SORTING
$("sortSelect").addEventListener("change", event => {
  state.sort = event.target.value;
  render();
});

// SENTENCES FILTER
$("sentencesOnly").addEventListener("change", event => {
  state.sentencesOnly = event.target.checked;
  render();
});

// EXPAND / COLLAPSE ALL
$("expandAll").addEventListener("click", () => {
  const visible = sortedEntries(state.entries).filter(entry =>
    (
      state.activeLetter === "ALL" ||
      getLetter(entry) === state.activeLetter
    ) &&
    matches(entry, state.query) &&
    (
      !state.sentencesOnly ||
      entry.sentences.length > 0
    )
  );

  const allExpanded =
    visible.length &&
    visible.every(entry =>
      state.expanded.has(entry.word)
    );

  if (allExpanded) {
    visible.forEach(entry =>
      state.expanded.delete(entry.word)
    );
  } else {
    visible.forEach(entry =>
      state.expanded.add(entry.word)
    );
  }

  render();
});

// RESET FILTERS
$("resetFilters").addEventListener("click", () => {
  state.activeLetter = "ALL";
  state.query = "";
  state.sentencesOnly = false;

  $("searchInput").value = "";
  $("sentencesOnly").checked = false;

  $("clearSearch").classList.remove("visible");

  render();
});

// START WEBSITE
init();
