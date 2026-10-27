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

export function verifyUser() {
  return new Promise(function (resolve) {
    setTimeout(function () {
      update({ user: Object.assign({}, state.user, { verified: true }) });
      resolve();
    }, 400);
  });
}

export function castVote(cycleId, trackId) {
  return new Promise(function (resolve, reject) {
    var board = state.leaderboard[cycleId] || [];
    var current = board.find(function (e) {
      return e.trackId === trackId;
    });
    if (!current) return reject({ code: "TRACK_NOT_IN_CYCLE" });
    if (current.votedByMe) return reject({ code: "ALREADY_VOTED" });
    if (state.user.votesRemaining <= 0)
      return reject({ code: "NO_VOTES_LEFT" });

    setTimeout(function () {
      var bumped = board.map(function (e) {
        return e.trackId === trackId
          ? Object.assign({}, e, {
              votes: e.votes + 1,
              votedByMe: true,
              previousRank: e.rank,
            })
          : e;
      });
      var nextBoard = assignRanks(bumped);
      var toRank = nextBoard.find(function (e) {
        return e.trackId === trackId;
      }).rank;
      var lb = Object.assign({}, state.leaderboard);
      lb[cycleId] = nextBoard;
      update({
        leaderboard: lb,
        user: Object.assign({}, state.user, {
          votesRemaining: state.user.votesRemaining - 1,
        }),
      });
      resolve({
        rank: toRank,
        budgetUsed: CYCLE.fanVoteBudget - state.user.votesRemaining,
      });
    }, 350);
  });
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

export function claimArtist(artistId, profile) {
  if (state.claimedArtistId) return null;
  var artist = artistById[artistId];
  if (!artist) return null;
  if (artist.claimed) return null;

  var profileData = {
    claimed: true,
    bio: profile.bio || "",
    links: profile.links || {},
    photoUrl: profile.photoUrl || "",
  };

  state.artistProfiles[artistId] = profileData;
  state.claimedArtistId = artistId;
  Object.assign(artist, profileData);
  persist();
  listeners.forEach(function (fn) {
    fn(state);
  });
  return artist;
}

export function getClaimedArtistId() {
  return state.claimedArtistId;
}

export function getClaimedArtist() {
  return state.claimedArtistId ? artistById[state.claimedArtistId] : null;
}
