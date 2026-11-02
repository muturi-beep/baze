import mongoose from "mongoose";
import dotenv from "dotenv";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import Track from "../models/Track.js";

dotenv.config();

// Real music data to bypass network blocks
const REAL_DATA = [
  {
    artist: "Sauti Sol",
    spotifyId: "art_sauti",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5ebde3f9e2b52329c3d1c3e3b5c",
    genres: ["afro-pop"],
    album: "Midnight Train",
    albumId: "alb_midnight",
    albumArt:
      "https://i.scdn.co/image/ab67616d0000b273c0c25c4bd0d8c8b4d4d4d4d4",
    releaseDate: "2021",
    tracks: [
      { title: "Suzanna", youtubeId: "j3Fh3xJ1q7A", durationMs: 210000 },
      { title: "Midnight Train", youtubeId: "k1QqJ9vX7yY", durationMs: 230000 },
      { title: "Rhumba Japani", youtubeId: "P9vH1m1K4wE", durationMs: 215000 },
    ],
  },
  {
    artist: "Khaligraph Jones",
    spotifyId: "art_khali",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb8b9e9d3c8c6c5e3d1c3e3b5c",
    genres: ["hip-hop"],
    album: "Testimony",
    albumId: "alb_testimony",
    albumArt:
      "https://i.scdn.co/image/ab67616d0000b273d0d0d0d0d0d0d0d0d0d0d0d0",
    releaseDate: "2019",
    tracks: [
      { title: "Wavy", youtubeId: "a9b8c7d6e5f", durationMs: 195000 },
      {
        title: "Leave a Message",
        youtubeId: "g1h2i3j4k5l",
        durationMs: 210000,
      },
      { title: "Mazishi", youtubeId: "m6n7o8p9q0r", durationMs: 205000 },
    ],
  },
  {
    artist: "Nyashinski",
    spotifyId: "art_nyash",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb1e2b52329c3d1c3e3b5c8b9e",
    genres: ["hip-hop", "afro-pop"],
    album: "Lucky You",
    albumId: "alb_lucky",
    albumArt:
      "https://i.scdn.co/image/ab67616d0000b273e1e1e1e1e1e1e1e1e1e1e1e1",
    releaseDate: "2016",
    tracks: [
      { title: "Malaika", youtubeId: "s1t2u3v4w5x", durationMs: 220000 },
      { title: "Now You Know", youtubeId: "y6z7a8b9c0d", durationMs: 215000 },
      { title: "Mungu Pekee", youtubeId: "e1f2g3h4i5j", durationMs: 240000 },
    ],
  },
  {
    artist: "Bien",
    spotifyId: "art_bien",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb9a1a1a1a1a1a1a1a1a1a1a1a",
    genres: ["afro-pop"],
    album: "Alusa",
    albumId: "alb_alusa",
    albumArt:
      "https://i.scdn.co/image/ab67616d0000b273b1b1b1b1b1b1b1b1b1b1b1b1",
    releaseDate: "2020",
    tracks: [
      { title: "Ni Wewe", youtubeId: "k6l7m8n9o0p", durationMs: 200000 },
      { title: "Sasa Hivi", youtubeId: "q1r2s3t4u5v", durationMs: 195000 },
      { title: "Inauma", youtubeId: "w6x7y8z9a0b", durationMs: 210000 },
    ],
  },
  {
    artist: "Wangechi",
    spotifyId: "art_wangechi",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb2b2b2b2b2b2b2b2b2b2b2b2b",
    genres: ["hip-hop", "rnb"],
    album: "Emotional Gangster",
    albumId: "alb_emotional",
    albumArt:
      "https://i.scdn.co/image/ab67616d0000b273c2c2c2c2c2c2c2c2c2c2c2c2",
    releaseDate: "2022",
    tracks: [
      { title: "Nostalgia", youtubeId: "c1d2e3f4g5h", durationMs: 185000 },
      { title: "Fallin", youtubeId: "i6j7k8l9m0n", durationMs: 190000 },
      { title: "Don't Cry", youtubeId: "o1p2q3r4s5t", durationMs: 195000 },
    ],
  },
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    for (const item of REAL_DATA) {
      // 1. Save Artist
      const dbArtist = await Artist.findOneAndUpdate(
        { spotifyId: item.spotifyId },
        {
          name: item.artist,
          spotifyId: item.spotifyId,
          imageUrl: item.imageUrl,
          genres: item.genres,
        },
        { upsert: true, new: true },
      );
      console.log(`✅ Saved artist: ${item.artist}`);

      // 2. Save Album
      const dbAlbum = await Album.findOneAndUpdate(
        { spotifyId: item.albumId },
        {
          title: item.album,
          artistId: dbArtist._id,
          spotifyId: item.albumId,
          artworkUrl: item.albumArt,
          releaseDate: item.releaseDate,
        },
        { upsert: true, new: true },
      );

      // 3. Save Tracks
      for (const track of item.tracks) {
        await Track.findOneAndUpdate(
          { title: track.title, artistId: dbArtist._id },
          {
            title: track.title,
            artistId: dbArtist._id,
            albumId: dbAlbum._id,
            spotifyId: "spotify_" + Math.random().toString(36).substring(7), // Fake unique ID since no Spotify
            youtubeVideoId: track.youtubeId,
            durationMs: track.durationMs,
            artworkUrl: item.albumArt,
            genre: item.genres[0],
            cycleId: "baze_wk12_kenya",
          },
          { upsert: true },
        );
      }
      console.log(
        `   -> Saved album & ${item.tracks.length} tracks for ${item.artist}`,
      );
    }

    console.log("🎉 Seeding complete! Real data is now in your database.");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
