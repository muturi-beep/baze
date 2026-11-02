import { CYCLE, GENRES } from "./data.js";
import { api } from "./api.js";

var STORAGE_KEY = "baze.state.v1";

var catalog = {
  tracks: [],
  artists: [],
  albums: [],
  trackById: {},
  artistById: {},
  albumById: {},
};

function assignRanks(entries) {
  return entries
    .slice()
    .sort((a, b) => b.votes - a.votes)
    .map((e, i) => Object.assign({}, e, { rank: i + 1 }));
}

var state = {
  user: {
    id: "usr_demo",
    name: "Demo Fan",
    verified: false,
    votesRemaining: CYCLE.fanVoteBudget,
  },
  cycle: Object.assign({}, CYCLE),
  leaderboard: {},
  claimedArtistId: null,
  artistProfiles: {},
};

try {
  var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved) {
    if (saved.user) state.user = Object.assign({}, state.user, saved.user);
    if (saved.claimedArtistId) state.claimedArtistId = saved.claimedArtistId;
    if (saved.artistProfiles) state.artistProfiles = saved.artistProfiles;
  }
} catch (e) {}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: state.user,
        claimedArtistId: state.claimedArtistId,
        artistProfiles: state.artistProfiles,
        cycleId: state.cycle.id,
      }),
    );
  } catch (e) {}
}

var listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getState() {
  return state;
}
function update(patch) {
  Object.assign(state, patch);
  persist();
  listeners.forEach((fn) => fn(state));
}

export async function syncCatalog() {
  try {
    const data = await api.getCatalog();
    catalog.tracks = data.tracks || [];
    catalog.artists = data.artists || [];
    catalog.albums = data.albums || [];

    catalog.trackById = {};
    catalog.artistById = {};
    catalog.albumById = {};

    catalog.tracks.forEach((t) => (catalog.trackById[t._id] = t));
    catalog.artists.forEach((a) => (catalog.artistById[a._id] = a));
    catalog.albums.forEach((al) => (catalog.albumById[al._id] = al));

    buildEmptyLeaderboard();
    console.log("✅ Catalog loaded:", catalog.tracks.length, "tracks");
  } catch (err) {
    console.error("❌ Failed to load catalog", err);
  }
}

function buildEmptyLeaderboard() {
  const board = catalog.tracks.map((t) => ({
    trackId: t._id,
    votes: 0,
    previousRank: null,
    rank: 0,
    votedByMe: false,
  }));
  state.leaderboard[CYCLE.id] = assignRanks(board);
  update({ leaderboard: state.leaderboard });
}

export function getTrack(id) {
  const t = catalog.trackById[id];
  if (!t) return null;

  // Safely map Mongoose populated objects
  return Object.assign({}, t, {
    id: t._id,
    artistId: t.artistId ? t.artistId._id || t.artistId : null,
    artist: t.artistId || { name: "Unknown" },
    albumId: t.albumId ? t.albumId._id || t.albumId : null,
    album: t.albumId || null,
  });
}

export function getBoard(cycleId) {
  var b = state.leaderboard[cycleId] || [];
  return b
    .map((e) => {
      const t = getTrack(e.trackId);
      return Object.assign({}, e, { track: t });
    })
    .filter((e) => e.track !== null);
}

export async function syncLeaderboard() {
  try {
    if (catalog.tracks.length === 0) await syncCatalog();
    if (
      !state.leaderboard[CYCLE.id] ||
      state.leaderboard[CYCLE.id].length === 0
    )
      buildEmptyLeaderboard();

    let data = { counts: {}, myVotes: [], votesRemaining: 10 };
    try {
      data = await api.getLeaderboard();
    } catch (err) {
      console.error("⚠️ Vote count failed, showing tracks with 0 votes", err);
    }

    var board = state.leaderboard[CYCLE.id] || [];
    var merged = board.map((e) => {
      var dbVotes = (data.counts && data.counts[e.trackId]) || 0;
      return Object.assign({}, e, {
        votes: dbVotes,
        votedByMe: data.myVotes ? data.myVotes.includes(e.trackId) : false,
        previousRank: null,
      });
    });

    update({
      leaderboard: { ...state.leaderboard, [CYCLE.id]: assignRanks(merged) },
      user: { ...state.user, votesRemaining: data.votesRemaining || 10 },
    });
  } catch (err) {
    console.error("❌ Fatal leaderboard sync error", err);
  }
}

export async function checkAuth() {
  try {
    const data = await api.getMe();
    update({
      user: {
        ...state.user,
        id: data.user._id,
        name: data.user.displayName,
        verified: true,
        roles: data.user.roles,
        votesRemaining: data.user.votesRemaining,
      },
    });
  } catch (err) {
    console.log("Guest mode");
  } finally {
    await syncLeaderboard();
  }
}

// ... (Rest of your store.js functions remain exactly the same: castVote, loginUser, getGenres, etc.)
// Paste the rest of store.js here (castVote, loginUser, getGenres, getGenre, getAlbumBoard, etc.)
