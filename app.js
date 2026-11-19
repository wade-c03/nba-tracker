// app.js — gets NBA data from ESPN with fetch and shows it on the page.
// innerHTML turns a template literal into real HTML (tables, cards).

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const ESPN_STATS = "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba";

const teamSelect = document.getElementById("team");
const teamContent = document.getElementById("teamContent");
const playerBox = document.getElementById("player");

let roster = [];       // players on the team you picked
let pickedGame = null; // the game you clicked "Rate" on

// ESPN sends a score as text, as an object, or not at all before a game starts
function scoreOf(team) {
  if (!team.score) return "";
  if (team.score.displayValue) return team.score.displayValue;
  return team.score;
}

// "2026-11-10T00:30Z" -> "Mon, Nov 9" (in your time zone)
function niceDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ---------- Roster ----------
function showRoster() {
  document.getElementById("teamName").textContent = teamSelect.options[teamSelect.selectedIndex].text;
  playerBox.innerHTML = "";
  teamContent.innerHTML = `<p class="muted">Loading...</p>`;

  fetch(`${ESPN}/teams/${teamSelect.value}/roster`)
    .then((response) => response.json())
    .then((data) => {
      roster = data.athletes;
      let rows = "";
      roster.forEach((player, i) => {
        rows += `
          <tr onclick="showPlayer(${i})">
            <td>${player.jersey || "-"}</td>
            <td class="name">${player.displayName}</td>
            <td>${player.position.abbreviation}</td>
            <td>${player.displayHeight || "-"}</td>
            <td>${player.age || "-"}</td>
          </tr>`;
      });
      teamContent.innerHTML = `
        <table>
          <tr><th>#</th><th>Player</th><th>Pos</th><th>Height</th><th>Age</th></tr>
          ${rows}
        </table>
        <p class="muted">Click a player to see their stats.</p>`;
    })
    .catch(() => {
      teamContent.innerHTML = `<p class="muted">Could not load the roster.</p>`;
    });
}

// ---------- Schedule ----------
function showSchedule() {
  playerBox.innerHTML = "";
  teamContent.innerHTML = `<p class="muted">Loading...</p>`;

  fetch(`${ESPN}/teams/${teamSelect.value}/schedule`)
    .then((response) => response.json())
    .then((data) => {
      let rows = "";
      data.events.forEach((event) => {
        const game = event.competitions[0];
        const home = game.competitors[0];
        const away = game.competitors[1];
        rows += `
          <tr>
            <td>${niceDate(event.date)}</td>
            <td>${away.team.abbreviation} @ ${home.team.abbreviation}</td>
            <td>${scoreOf(away)} - ${scoreOf(home)}</td>
            <td class="muted">${game.status.type.shortDetail}</td>
          </tr>`;
      });
      teamContent.innerHTML = `
        <table>
          <tr><th>Date</th><th>Game</th><th>Score</th><th>Status</th></tr>
          ${rows}
        </table>`;
    })
    .catch(() => {
      teamContent.innerHTML = `<p class="muted">Could not load the schedule.</p>`;
    });
}

// ---------- Player stats ----------
function showPlayer(i) {
  const player = roster[i];
  playerBox.innerHTML = `<p class="muted">Loading ${player.displayName}...</p>`;
  playerBox.scrollIntoView({ behavior: "smooth" });

  fetch(`${ESPN_STATS}/athletes/${player.id}/stats`)
    .then((response) => response.json())
    .then((data) => {
      // Find the per-game averages
      let averages;
      data.categories.forEach((category) => {
        if (category.name === "averages") averages = category;
      });
      const latest = averages.statistics[averages.statistics.length - 1]; // the newest season

      // One tile per stat, like "27.5 PTS"
      let tiles = "";
      averages.labels.forEach((label, j) => {
        tiles += `<div class="tile"><strong>${latest.stats[j]}</strong><span>${label}</span></div>`;
      });

      playerBox.innerHTML = `
        <h2>${player.displayName}</h2>
        <p class="muted">#${player.jersey || "-"} · ${player.position.displayName} · ${latest.season.displayName} averages</p>
        <div class="tiles">${tiles}</div>`;
    })
    .catch(() => {
      playerBox.innerHTML = `<p class="muted">No stats yet for ${player.displayName}.</p>`;
    });
}

// ---------- Scores ----------
function showGames() {
  const date = document.getElementById("date").value; // empty = today
  const gamesBox = document.getElementById("games");
  let url = `${ESPN}/scoreboard`;
  if (date) url += "?dates=" + date.replaceAll("-", "");

  gamesBox.innerHTML = `<p class="muted">Loading...</p>`;
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      let cards = "";
      data.events.forEach((event) => {
        const game = event.competitions[0];
        const home = game.competitors[0];
        const away = game.competitors[1];
        const label = `${away.team.abbreviation} @ ${home.team.abbreviation}, ${niceDate(event.date)}`;
        cards += `
          <div class="card game">
            <p class="status">${game.status.type.shortDetail}</p>
            <p><span>${away.team.displayName}</span><strong>${scoreOf(away)}</strong></p>
            <p><span>${home.team.displayName}</span><strong>${scoreOf(home)}</strong></p>
            <button class="outline" onclick="pickGame('${label}')">Rate this game</button>
          </div>`;
      });
      gamesBox.innerHTML = cards || `<p class="muted">No games that day.</p>`;
    })
    .catch(() => {
      gamesBox.innerHTML = `<p class="muted">Could not load games.</p>`;
    });
}

// ---------- My Ratings (saved in this browser) ----------
function pickGame(label) {
  pickedGame = label;
  document.getElementById("pickedGame").textContent = `Rating: ${label}`;
  document.getElementById("ratings").scrollIntoView({ behavior: "smooth" });
}

function loadRatings() {
  return JSON.parse(localStorage.getItem("ratings") || "[]");
}

function showRatings() {
  let cards = "";
  loadRatings().forEach((rating, i) => {
    cards += `
      <div class="card rating">
        <div>
          <strong>${rating.game}</strong>
          <span class="stars">${"★".repeat(rating.stars)}${"☆".repeat(5 - rating.stars)}</span>
          <p class="muted">${rating.review}</p>
        </div>
        <button class="outline" onclick="deleteRating(${i})">Delete</button>
      </div>`;
  });
  document.getElementById("ratingsList").innerHTML = cards || `<p class="muted">No ratings yet.</p>`;
}

function saveRating() {
  if (!pickedGame) {
    document.getElementById("pickedGame").textContent = "Click \"Rate this game\" on a game first.";
    return;
  }
  const ratings = loadRatings();
  ratings.push({
    game: pickedGame,
    stars: Number(document.getElementById("stars").value),
    review: document.getElementById("review").value,
  });
  localStorage.setItem("ratings", JSON.stringify(ratings));
  document.getElementById("review").value = "";
  showRatings();
}

function deleteRating(i) {
  const ratings = loadRatings();
  ratings.splice(i, 1);
  localStorage.setItem("ratings", JSON.stringify(ratings));
  showRatings();
}

// ---------- Buttons ----------
teamSelect.addEventListener("change", showRoster);
document.getElementById("rosterButton").addEventListener("click", showRoster);
document.getElementById("scheduleButton").addEventListener("click", showSchedule);
document.getElementById("gamesButton").addEventListener("click", showGames);
document.getElementById("rateButton").addEventListener("click", saveRating);

// ---------- When the page opens ----------
showRoster();
showGames();
showRatings();
