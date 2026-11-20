
const DATA_URL = "./thai.json";

const state = {
  words: [],
  category: "All",
  query: "",
  favoritesOnly: false,
  favorites: new Set(
    JSON.parse(localStorage.getItem("thaiNotesFavorites") || "[]")
  )
};

const $ = (id) => document.getElementById(id);

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));

async function init() {
  try {
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error("Could not load thai.json");
    }

    const data = await response.json();

    state.words = data.words || [];

    $("wordCount").textContent =
      data.uniqueWords ?? state.words.length;

    $("sentenceCount").textContent =
      data.examplePairs ??
      state.words.reduce(
        (n, w) => n + (w.examples || []).length,
        0
      );

    renderCategories(data.categories || []);
    renderWords();

    $("searchInput").addEventListener("input", e => {
      state.query = e.target.value.trim().toLocaleLowerCase();
      renderWords();
    });

    $("favoritesBtn").addEventListener("click", () => {
      state.favoritesOnly = !state.favoritesOnly;

      $("favoritesBtn").classList.toggle(
        "active",
        state.favoritesOnly
      );

      $("favoritesBtn").textContent =
        state.favoritesOnly ? "♥ Saved only" : "♡ Saved";

      renderWords();
    });

  } catch (error) {
    $("wordGrid").innerHTML = `
      <div class="empty">
        Unable to load the vocabulary data.<br>
        Make sure <b>index.html</b>, <b>script.js</b>
        and <b>thai.json</b> are in the same folder
        and open the site through a local server.
      </div>
    `;

    console.error(error);
  }
}

function renderCategories(categories) {
  const all = ["All", ...categories];

  $("categoryBar").innerHTML = all.map(cat => `
    <button
      class="chip ${cat === state.category ? "active" : ""}"
      data-category="${escapeHTML(cat)}"
    >
      ${cat === "All" ? "All topics" : escapeHTML(cat)}
    </button>
  `).join("");

  $("categoryBar").addEventListener("click", e => {
    const button = e.target.closest("[data-category]");

    if (!button) return;

    state.category = button.dataset.category;

    document.querySelectorAll(".chip").forEach(chip => {
      chip.classList.toggle("active", chip === button);
    });

    renderWords();
  });
}

function matches(word) {
  if (
    state.category !== "All" &&
    word.category !== state.category
  ) {
    return false;
  }

  if (
    state.favoritesOnly &&
    !state.favorites.has(word.id)
  ) {
    return false;
  }

  if (!state.query) return true;

  const examples = (word.examples || [])
    .map(x => `${x.thai} ${x.english}`)
    .join(" ");

  return `
    ${word.word}
    ${word.meaning}
    ${word.category}
    ${examples}
  `.toLocaleLowerCase().includes(state.query);
}

function renderWords() {
  const filtered = state.words.filter(matches);

  $("sectionTitle").textContent =
    state.favoritesOnly
      ? "Saved vocabulary"
      : state.category === "All"
        ? "All vocabulary"
        : state.category;

  $("resultCount").textContent =
    `${filtered.length} ${
      filtered.length === 1 ? "entry" : "entries"
    }`;

  if (!filtered.length) {
    $("wordGrid").innerHTML = `
      <div class="empty">
        No matching words found.<br>
        Try another search or category.
      </div>
    `;
    return;
  }

  $("wordGrid").innerHTML = filtered.map(word => {
    const saved = state.favorites.has(word.id);

    const examples = (word.examples || [])
      .map(ex => `
        <div class="example">
          <div class="thaisentence">
            ${escapeHTML(ex.thai)}
          </div>
          <div class="engsentence">
            ${escapeHTML(ex.english)}
          </div>
        </div>
      `).join("");

    return `
      <article class="wordcard" data-id="${escapeHTML(word.id)}">

        <div class="cardtop">
          <div>
            <div class="thai">
              ${escapeHTML(word.word)}
            </div>

            <div class="meaning">
              ${escapeHTML(word.meaning)}
            </div>
          </div>

          <span class="category">
            ${escapeHTML(word.category)}
          </span>
        </div>

        <div class="cardactions">
          <button class="smallbtn reveal" type="button">
            ${(word.examples || []).length} examples · Show
          </button>

          <button
            class="smallbtn save ${saved ? "fav" : ""}"
            type="button"
            aria-label="${saved ? "Remove from saved" : "Save word"}"
          >
            ${saved ? "♥ Saved" : "♡ Save"}
          </button>
        </div>

        <div class="examples">
          ${
            examples ||
            '<div class="engsentence">No example sentences in the source document.</div>'
          }
        </div>

      </article>
    `;
  }).join("");

  // Show and hide example sentences
  $("wordGrid").querySelectorAll(".reveal").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".wordcard");

      card.classList.toggle("expanded");

      btn.textContent =
        card.classList.contains("expanded")
          ? "Hide examples"
          : `${card.querySelectorAll(".example").length} examples · Show`;
    });
  });

  // Save and remove vocabulary
  $("wordGrid").querySelectorAll(".save").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".wordcard").dataset.id;

      if (state.favorites.has(id)) {
        state.favorites.delete(id);
      } else {
        state.favorites.add(id);
      }

      localStorage.setItem(
        "thaiNotesFavorites",
        JSON.stringify([...state.favorites])
      );

      renderWords();
    });
  });
}

init();
