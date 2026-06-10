const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

exports.handler = async (event) => {
  const { action, query, showId, season } = event.queryStringParameters || {};

  if (!API_KEY) {
    return response(500, { error: "API key not configured" });
  }

  try {
    if (action === "search" && query) {
      const data = await tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}&page=1`);
      const results = data.results.slice(0, 6).map(show => ({
        id: show.id,
        name: show.name,
        year: show.first_air_date ? show.first_air_date.slice(0, 4) : "N/A",
        poster: show.poster_path ? `https://image.tmdb.org/t/p/w92${show.poster_path}` : null,
        overview: show.overview
      }));
      return response(200, { results });
    }

    if (action === "seasons" && showId) {
      const data = await tmdbFetch(`/tv/${showId}`);
      const seasons = data.seasons
        .filter(s => s.season_number > 0)
        .map(s => ({
          number: s.season_number,
          name: s.name,
          episodeCount: s.episode_count
        }));
      return response(200, { seasons, showName: data.name });
    }

    if (action === "episodes" && showId && season) {
      const data = await tmdbFetch(`/tv/${showId}/season/${season}`);
      const episodes = data.episodes.map(ep => ({
        number: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        airDate: ep.air_date
      }));
      return response(200, { episodes });
    }

    return response(400, { error: "Invalid request" });

  } catch (err) {
    return response(500, { error: err.message });
  }
};

async function tmdbFetch(path) {
  const url = `${TMDB_BASE}${path}&api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
