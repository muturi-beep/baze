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

export async function loginUser(identifier, code, channel) {
  const data = await api.verifyOtp(identifier, code, channel);
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
  return data.user;
}

export async function castVote(cycleId, trackId) {
  const idempotencyKey = crypto.randomUUID();
  const track = getTrack(trackId);
  const artistId = track ? track.artistId : null;

  try {
    const res = await api.castVote(cycleId, trackId, artistId, idempotencyKey);

    var board = state.leaderboard[cycleId] || [];
    var bumped = board.map((e) =>
      e.trackId === trackId
        ? Object.assign({}, e, {
            votes: e.votes + 1,
            votedByMe: true,
            previousRank: e.rank,
          })
        : e,
    );
    var nextBoard = assignRanks(bumped);
    var toRank = nextBoard.find((e) => e.trackId === trackId).rank;

    update({
      leaderboard: { ...state.leaderboard, [cycleId]: nextBoard },
      user: { ...state.user, votesRemaining: res.votesRemaining },
    });

    return { rank: toRank, budgetUsed: 10 - res.votesRemaining };
  } catch (err) {
    if (err.message.includes("already voted")) throw { code: "ALREADY_VOTED" };
    if (err.message.includes("own track"))
      throw { code: "CANNOT_VOTE_FOR_SELF" };
    if (err.message.includes("used all your votes"))
      throw { code: "NO_VOTES_LEFT" };
    throw { code: "UNKNOWN" };
  }
}

// --- GENRES & ALBUMS ---
export function getGenres() {
  return GENRES;
}
export function getGenre(genreId) {
  return GENRES.find((g) => g.id === genreId) || null;
}

export function getGenreBoard(cycleId, genreId) {
  var b = state.leaderboard[cycleId] || [];
  return b
    .filter((e) => {
      const t = getTrack(e.trackId);
      return t && t.genre === genreId;
    })
    .sort((a, c) => c.votes - a.votes)
    .map((e, i) =>
      Object.assign({}, e, { rank: i + 1, track: getTrack(e.trackId) }),
    );
}

export function getAlbums() {
  return catalog.albums;
}
export function getAlbum(id) {
  return catalog.albumById[id] || null;
}

export function getAlbumBoard(cycleId, genreId) {
  var board = state.leaderboard[cycleId] || [];
  var byAlbum = {};
  board.forEach((e) => {
    const t = getTrack(e.trackId);
    if (!t || !t.albumId) return;
    if (genreId && t.genre !== genreId) return;
    const aid = t.albumId;
    if (!byAlbum[aid]) byAlbum[aid] = { albumId: aid, votes: 0, trackCount: 0 };
    byAlbum[aid].votes += e.votes;
    byAlbum[aid].trackCount += 1;
  });
  return Object.keys(byAlbum)
    .map((k) => byAlbum[k])
    .sort((a, c) => c.votes - a.votes)
    .map((e, i) =>
      Object.assign({}, e, { rank: i + 1, album: getAlbum(e.albumId) }),
    );
}

export function getAlbumTracks(cycleId, albumId) {
  var board = state.leaderboard[cycleId] || [];
  return board
    .filter((e) => {
      const t = getTrack(e.trackId);
      return t && t.albumId === albumId;
    })
    .sort((a, b) => b.votes - a.votes)
    .map((e, i) =>
      Object.assign({}, e, { rank: i + 1, track: getTrack(e.trackId) }),
    );
}

// --- ARTISTS ---
export function getArtists() {
  return catalog.artists;
}
export function getArtist(id) {
  return catalog.artistById[id] || null;
}

export function getArtistTracks(cycleId, artistId) {
  var board = state.leaderboard[cycleId] || [];
  return board
    .filter((e) => {
      const t = getTrack(e.trackId);
      return t && t.artistId === artistId;
    })
    .sort((a, b) => b.votes - a.votes)
    .map((e, i) =>
      Object.assign({}, e, { rank: i + 1, track: getTrack(e.trackId) }),
    );
}

export function getArtistTotals(cycleId, artistId) {
  var tracks = getArtistTracks(cycleId, artistId);
  var totalVotes = tracks.reduce((s, e) => s + e.votes, 0);
  return { trackCount: tracks.length, totalVotes, tracks };
}

export function searchArtists(query) {
  var q = (query || "").toLowerCase();
  return catalog.artists.filter((a) => {
    if (!q) return true;
    return a.name.toLowerCase().indexOf(q) !== -1;
  });
}

// --- PRODUCERS (Stubs) ---
export function getProducers() {
  return [];
}
export function getProducer(id) {
  return null;
}
export function getProducerBoard(cycleId, genreId) {
  return [];
}
export function getProducerTracks(cycleId, producerId) {
  return [];
}

// --- AUTH & CLAIMS ---
export async function logoutUser() {
  try {
    await api.logout();
  } catch (err) {}
  update({
    user: {
      id: "usr_guest",
      name: "Guest",
      verified: false,
      votesRemaining: CYCLE.fanVoteBudget,
      roles: ["fan"],
    },
    claimedArtistId: null,
  });
  await syncLeaderboard();
}

export async function claimArtist(artistId, profile) {
  if (state.claimedArtistId) return null;
  var artist = getArtist(artistId);
  if (!artist) return null;

  try {
    const data = await api.claimArtist(artistId, artist.name);
    var profileData = {
      claimed: true,
      bio: profile.bio || "",
      links: profile.links || {},
      photoUrl: profile.photoUrl || "",
    };

    state.artistProfiles[artistId] = profileData;
    state.claimedArtistId = artistId;
    Object.assign(artist, profileData);

    update({
      user: {
        ...state.user,
        roles: data.user.roles,
        name: data.user.displayName,
        claimedArtistId: data.user.claimedArtistId,
      },
      artistProfiles: state.artistProfiles,
      claimedArtistId: state.claimedArtistId,
    });

    return artist;
  } catch (err) {
    throw err;
  }
}

export function getClaimedArtistId() {
  return state.claimedArtistId;
}
export function getClaimedArtist() {
  return state.claimedArtistId ? getArtist(state.claimedArtistId) : null;
}

export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  state.user = {
    id: "usr_guest",
    name: "Guest",
    verified: false,
    votesRemaining: CYCLE.fanVoteBudget,
  };
  state.claimedArtistId = null;
  state.artistProfiles = {};
  buildEmptyLeaderboard();
  persist();
  listeners.forEach((fn) => fn(state));
}
