import {
  CYCLE,
  TRACKS,
  SEED_VOTES,
  SEED_PREV,
  GENRES,
  ARTISTS,
  PRODUCERS,
  ALBUMS,
  artistById,
  producerById,
  albumById,
  trackById,
} from "./data.js";

import { api } from "./api.js";

var STORAGE_KEY = "baze.state.v1";

var originalClaimed = {};
ARTISTS.forEach(function (a) {
  originalClaimed[a.id] = a.claimed;
});

function assignRanks(entries) {
  return entries
    .slice()
    .sort(function (a, b) {
      return b.votes - a.votes;
    })
    .map(function (e, i) {
      return Object.assign({}, e, { rank: i + 1 });
    });
}

function buildInitialBoard() {
  return assignRanks(
    TRACKS.map(function (t) {
      return {
        trackId: t.id,
        votes: SEED_VOTES[t.id] || 0,
        previousRank: SEED_PREV[t.id] || null,
        rank: 0,
        votedByMe: false,
      };
    }),
  );
}

function loadPersisted() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
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
state.leaderboard[CYCLE.id] = buildInitialBoard();

// rehydrate
var saved = loadPersisted();
if (saved) {
  if (saved.user) state.user = Object.assign({}, state.user, saved.user);
  if (saved.leaderboard && saved.leaderboard[CYCLE.id]) {
    state.leaderboard[CYCLE.id] = saved.leaderboard[CYCLE.id];
  }
  if (saved.claimedArtistId) state.claimedArtistId = saved.claimedArtistId;
  if (saved.artistProfiles) state.artistProfiles = saved.artistProfiles;
  Object.keys(state.artistProfiles).forEach(function (id) {
    if (artistById[id] && state.artistProfiles[id]) {
      Object.assign(artistById[id], state.artistProfiles[id]);
    }
  });
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: state.user,
        leaderboard: state.leaderboard,
        claimedArtistId: state.claimedArtistId,
        artistProfiles: state.artistProfiles,
        cycleId: state.cycle.id,
        savedAt: Date.now(),
      }),
    );
  } catch (e) {}
}

var listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return function () {
    listeners.delete(fn);
  };
}

export function getState() {
  return state;
}

function update(patch) {
  Object.assign(state, patch);
  persist();
  listeners.forEach(function (fn) {
    fn(state);
  });
}

export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  state.user = {
    id: "usr_demo",
    name: "Demo Fan",
    verified: false,
    votesRemaining: CYCLE.fanVoteBudget,
  };
  state.cycle = Object.assign({}, CYCLE);
  state.leaderboard = {};
  state.leaderboard[CYCLE.id] = buildInitialBoard();
  state.claimedArtistId = null;
  state.artistProfiles = {};
  Object.keys(originalClaimed).forEach(function (id) {
    if (!artistById[id]) return;
    artistById[id].claimed = originalClaimed[id];
    delete artistById[id].bio;
    delete artistById[id].links;
    delete artistById[id].photoUrl;
  });
  persist();
  listeners.forEach(function (fn) {
    fn(state);
  });
}

export function getTrack(id) {
  return trackById[id] || null;
}

export function getBoard(cycleId) {
  var b = state.leaderboard[cycleId] || [];
  return b.map(function (e) {
    return Object.assign({}, e, { track: trackById[e.trackId] });
  });
}

export async function syncLeaderboard() {
  try {
    const data = await api.getLeaderboard();
    const cycleId = CYCLE.id;
    var board = state.leaderboard[cycleId] || [];

    // Merge real DB counts with static seed votes
    var merged = board.map(function (e) {
      var dbVotes = data.counts[e.trackId] || 0;
      var seedVotes = SEED_VOTES[e.trackId] || 0;

      return Object.assign({}, e, {
        // DB votes added on top of seed votes
        votes: seedVotes + dbVotes,
        votedByMe: data.myVotes.includes(e.trackId),
        previousRank: null, // Reset previous rank on load
      });
    });

    var nextBoard = assignRanks(merged);
    var lb = Object.assign({}, state.leaderboard);
    lb[cycleId] = nextBoard;

    update({
      leaderboard: lb,
      user: Object.assign({}, state.user, {
        votesRemaining: data.votesRemaining,
      }),
    });
  } catch (err) {
    console.error("Failed to sync leaderboard", err);
  }
}

export async function loginUser(identifier, code, channel) {
  const data = await api.verifyOtp(identifier, code, channel);

  // Update the local state with the real user from MongoDB
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
    console.log("No active session, loading as guest");
  } finally {
    // ALWAYS sync the leaderboard, logged in or not
    await syncLeaderboard();
  }
}

export async function castVote(cycleId, trackId) {
  const idempotencyKey = crypto.randomUUID();
  const track = trackById[trackId]; // Get the track to find the artist
  const artistId = track ? track.artistId : null;

  try {
    // Pass artistId to the API
    const res = await api.castVote(cycleId, trackId, artistId, idempotencyKey);

    // ... rest of the function stays exactly the same
  } catch (err) {
    if (err.message.includes("already voted")) {
      throw { code: "ALREADY_VOTED" };
    }
    if (err.message.includes("own track")) {
      throw { code: "CANNOT_VOTE_FOR_SELF" };
    }
    if (err.message.includes("used all your votes")) {
      throw { code: "NO_VOTES_LEFT" };
    }
    throw { code: "UNKNOWN" };
  }
}

// ---- genres ----
export function getGenres() {
  return GENRES;
}

export function getGenre(genreId) {
  return (
    GENRES.find(function (g) {
      return g.id === genreId;
    }) || null
  );
}

export function getGenreBoard(cycleId, genreId) {
  var b = state.leaderboard[cycleId] || [];
  return b
    .filter(function (e) {
      var t = trackById[e.trackId];
      return t && t.genre === genreId;
    })
    .sort(function (a, c) {
      return c.votes - a.votes;
    })
    .map(function (e, i) {
      return Object.assign({}, e, {
        rank: i + 1,
        previousRank: null,
        track: trackById[e.trackId],
      });
    });
}

// ---- albums ----
export function getAlbums() {
  return ALBUMS;
}
export function getAlbum(id) {
  return albumById[id] || null;
}

export function getAlbumBoard(cycleId, genreId) {
  var board = state.leaderboard[cycleId] || [];
  var byAlbum = {};
  board.forEach(function (e) {
    var t = trackById[e.trackId];
    if (!t || !t.album) return;
    if (genreId && t.genre !== genreId) return;
    var aid = t.album.id;
    if (!byAlbum[aid]) byAlbum[aid] = { albumId: aid, votes: 0, trackCount: 0 };
    byAlbum[aid].votes += e.votes;
    byAlbum[aid].trackCount += 1;
  });
  return Object.keys(byAlbum)
    .map(function (k) {
      return byAlbum[k];
    })
    .sort(function (a, c) {
      return c.votes - a.votes;
    })
    .map(function (e, i) {
      return Object.assign({}, e, { rank: i + 1, album: albumById[e.albumId] });
    });
}

export function getAlbumTracks(cycleId, albumId) {
  var board = state.leaderboard[cycleId] || [];
  return board
    .filter(function (e) {
      var t = trackById[e.trackId];
      return t && t.album && t.album.id === albumId;
    })
    .sort(function (a, b) {
      return b.votes - a.votes;
    })
    .map(function (e, i) {
      return Object.assign({}, e, {
        rank: i + 1,
        previousRank: null,
        track: trackById[e.trackId],
      });
    });
}

// ---- producers ----
export function getProducers() {
  return PRODUCERS;
}
export function getProducer(id) {
  return producerById[id] || null;
}

export function getProducerBoard(cycleId, genreId) {
  var board = state.leaderboard[cycleId] || [];
  var byProducer = {};
  board.forEach(function (e) {
    var t = trackById[e.trackId];
    if (!t || !t.producers) return;
    if (genreId && t.genre !== genreId) return;
    t.producers.forEach(function (p) {
      if (!byProducer[p.id])
        byProducer[p.id] = { producerId: p.id, votes: 0, trackCount: 0 };
      byProducer[p.id].votes += e.votes;
      byProducer[p.id].trackCount += 1;
    });
  });
  return Object.keys(byProducer)
    .map(function (k) {
      return byProducer[k];
    })
    .sort(function (a, c) {
      return c.votes - a.votes;
    })
    .map(function (e, i) {
      return Object.assign({}, e, {
        rank: i + 1,
        producer: producerById[e.producerId],
      });
    });
}

export function getProducerTracks(cycleId, producerId) {
  var board = state.leaderboard[cycleId] || [];
  return board
    .filter(function (e) {
      var t = trackById[e.trackId];
      return (
        t &&
        t.producers &&
        t.producers.some(function (p) {
          return p.id === producerId;
        })
      );
    })
    .sort(function (a, b) {
      return b.votes - a.votes;
    })
    .map(function (e, i) {
      return Object.assign({}, e, {
        rank: i + 1,
        previousRank: null,
        track: trackById[e.trackId],
      });
    });
}

// ---- artists ----
export function getArtists() {
  return ARTISTS;
}
export function getArtist(id) {
  return artistById[id] || null;
}

export function getArtistTracks(cycleId, artistId) {
  var board = state.leaderboard[cycleId] || [];
  return board
    .filter(function (e) {
      var t = trackById[e.trackId];
      return t && t.artist && t.artist.id === artistId;
    })
    .sort(function (a, b) {
      return b.votes - a.votes;
    })
    .map(function (e, i) {
      return Object.assign({}, e, {
        rank: i + 1,
        previousRank: null,
        track: trackById[e.trackId],
      });
    });
}

export function getArtistTotals(cycleId, artistId) {
  var tracks = getArtistTracks(cycleId, artistId);
  var totalVotes = tracks.reduce(function (s, e) {
    return s + e.votes;
  }, 0);
  return { trackCount: tracks.length, totalVotes: totalVotes, tracks: tracks };
}

// ---- claim ----
export function searchArtists(query) {
  var q = (query || "").toLowerCase();
  return ARTISTS.map(function (a) {
    return artistById[a.id];
  }).filter(function (a) {
    if (!q) return true;
    return a.name.toLowerCase().indexOf(q) !== -1;
  });
}

export async function logoutUser() {
  try {
    await api.logout();
  } catch (err) {
    console.error("Logout failed on backend", err);
  }

  // Reset local state to Guest
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

  // Optionally force a sync to clear out votedByMe states
  await syncLeaderboard();
}

export async function claimArtist(artistId, profile) {
  if (state.claimedArtistId) return null;
  var artist = artistById[artistId];
  if (!artist) return null;

  try {
    // Call the backend
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

    // Update local user state to reflect new roles
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
    console.error(err);
    throw err;
  }
}

export function getClaimedArtistId() {
  return state.claimedArtistId;
}

export function getClaimedArtist() {
  return state.claimedArtistId ? artistById[state.claimedArtistId] : null;
}
