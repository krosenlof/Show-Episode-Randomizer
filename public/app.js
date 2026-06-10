const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const showCard = document.getElementById("showCard");
const showPoster = document.getElementById("showPoster");
const showName = document.getElementById("showName");
const showOverview = document.getElementById("showOverview");
const controls = document.getElementById("controls");
const seasonSelect = document.getElementById("seasonSelect");
const randomBtn = document.getElementById("randomBtn");
const resultCard = document.getElementById("resultCard");
const resultSeason = document.getElementById("resultSeason");
const resultTitle = document.getElementById("resultTitle");
const resultOverview = document.getElementById("resultOverview");
const resultAirdate = document.getElementById("resultAirdate");
const rerollBtn = document.getElementById("rerollBtn");

let selectedShow = null;
let allSeasons = [];
let debounceTimer = null;

// ── Search ──────────────────────────────────────────────

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const query = searchInput.value.trim();

  if (query.length < 2) {
    hideResults();
    return;
  }

  debounceTimer = setTimeout(() => fetchSearch(query), 350);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) hideResults();
});

async function fetchSearch(query) {
  searchResults.innerHTML = `<div class="loading">Searching...</div>`;
  searchResults.classList.remove("hidden");

  try {
    const res = await fetch(`/api/tmdb?action=search&query=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      searchResults.innerHTML = `<div class="loading">No shows found.</div>`;
      return;
    }

    searchResults.innerHTML = data.results.map(show => `
      <div class="search-result-item" data-id="${show.id}" data-name="${escapeAttr(show.name)}" data-overview="${escapeAttr(show.overview)}" data-poster="${show.poster || ""}">
        ${show.poster
          ? `<img src="${show.poster}" alt="${escapeAttr(show.name)}" />`
          : `<img src="" alt="" style="background:#2e2e3e;" />`}
        <div class="result-info">
          <div class="name">${escapeHtml(show.name)}</div>
          <div class="year">${show.year}</div>
        </div>
      </div>
    `).join("");

    searchResults.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => selectShow(item));
    });

  } catch (err) {
    searchResults.innerHTML = `<div class="loading">Something went wrong. Try again.</div>`;
  }
}

// ── Select Show ─────────────────────────────────────────

async function selectShow(item) {
  const id = item.dataset.id;
  const name = item.dataset.name;
  const overview = item.dataset.overview;
  const poster = item.dataset.poster;

  searchInput.value = name;
  hideResults();
  resetResult();

  showPoster.src = poster || "";
  showPoster.style.display = poster ? "block" : "none";
  showName.textContent = name;
  showOverview.textContent = overview || "No description available.";
  showCard.classList.remove("hidden");

  controls.classList.add("hidden");
  seasonSelect.innerHTML = `<option value="">Any Season</option>`;

  try {
    const res = await fetch(`/api/tmdb?action=seasons&showId=${id}`);
    const data = await res.json();

    allSeasons = data.seasons || [];
    selectedShow = { id, name };

    allSeasons.forEach(season => {
      const opt = document.createElement("option");
      opt.value = season.number;
      opt.textContent = `${season.name} (${season.episodeCount} episodes)`;
      seasonSelect.appendChild(opt);
    });

    controls.classList.remove("hidden");

  } catch (err) {
    showOverview.textContent = "Could not load season data. Try again.";
  }
}

// ── Random Pick ─────────────────────────────────────────

randomBtn.addEventListener("click", pickRandom);
rerollBtn.addEventListener("click", pickRandom);

async function pickRandom() {
  if (!selectedShow) return;

  const selectedSeason = seasonSelect.value;
  let seasonNumber;

  if (selectedSeason) {
    seasonNumber = parseInt(selectedSeason);
  } else {
    // Pick a random season weighted by episode count
    const total = allSeasons.reduce((sum, s) => sum + s.episodeCount, 0);
    let rand = Math.floor(Math.random() * total);
    for (const season of allSeasons) {
      rand -= season.episodeCount;
      if (rand < 0) {
        seasonNumber =
