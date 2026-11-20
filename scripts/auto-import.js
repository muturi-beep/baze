import dns from "node:dns";
import os from "node:os";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import Track from "../models/Track.js";

dotenv.config();

// FIX FOR WINDOWS DNS BUG
if (os.platform() === "win32") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) {
  console.error("❌ Missing YOUTUBE_API_KEY in .env file!");
  process.exit(1);
}

const artistsToAdd = [
  "Nyashinski", "Sauti Sol", "Khaligraph Jones", "Bien", "Wangechi",
  "Nviiri the Storyteller", "Nikita Kering", "Bahati", "Willis Raburu", "H_art the Band"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getYouTubeId(title, artistName) {
  try {
    const query = encodeURIComponent(`${artistName} ${title}`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      if (data.error.code === 403) throw new Error("QUOTA_EXCEEDED");
      return null;
    }
    return (data.items && data.items.length > 0) ? data.items[0].id.videoId : null;
  } catch (err) {
    if (err.message === "QUOTA_EXCEEDED") throw err;
    return null;
  }
}

async function importArtist(artistName) {
  console.log(`\n🔍 Searching Deezer for: ${artistName}`);
  
  try {
    const searchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`);
    const searchData = await searchRes.json();
    const artist = searchData.data?.[0];
    if (!artist) return console.log(`❌ Not found on Deezer: ${artistName}`);

    const dbArtist = await Artist.findOneAndUpdate(
      { spotifyId: `deezer_${artist.id}` },
      { name: artist.name, imageUrl: artist.picture_xl || artist.picture_big, genres: ["afro-pop"] },
      { upsert: true, new: true }
    );
    console.log(`✅ Saved Artist: ${artist.name}`);

    const albumsRes = await fetch(`https://api.deezer.com/artist/${artist.id}/albums?limit=5`);
    const albumsData = await albumsRes.json();
    if (!albumsData.data) return;

    for (const album of albumsData.data) {
      const dbAlbum = await Album.findOneAndUpdate(
        { spotifyId: `deezer_${album.id}` },
        { title: album.title, artistId: dbArtist._id, artworkUrl: album.cover_xl || album.cover_big, releaseDate: album.release_date || "2026" },
        { upsert: true, new: true }
      );

      const tracksRes = await fetch(`https://api.deezer.com/album/${album.id}/tracks`);
      const tracksData = await tracksRes.json();

      let newTracks = 0;
      let skippedTracks = 0;

      for (const track of tracksData.data || []) {
        const titleLower = track.title.toLowerCase();
        if (titleLower.match(/remix|instrumental|live|edit|version|reprise|mix/)) continue;

        // Check if track already exists in DB
        const existingTrack = await Track.findOne({ spotifyId: `deezer_${track.id}` });
        
        // If it exists AND already has a YouTube ID, skip it entirely
        if (existingTrack && existingTrack.youtubeVideoId) {
          skippedTracks++;
          continue; 
        }

        // If it doesn't exist, or is missing a YouTube ID, search for it
        console.log(`      📺 Searching YouTube for: ${track.title}`);
        const youtubeVideoId = await getYouTubeId(track.title, artist.name);
        await sleep(300);

        await Track.findOneAndUpdate(
          { spotifyId: `deezer_${track.id}` },
          {
            title: track.title, artistId: dbArtist._id, albumId: dbAlbum._id,
            durationMs: track.duration * 1000, artworkUrl: album.cover_xl || album.cover_big,
            genre: "afro-pop", cycleId: "baze_wk12_kenya", youtubeVideoId: youtubeVideoId,
          },
          { upsert: true }
        );
        newTracks++;
      }
      
      console.log(`   -> Album "${album.title}": Added/Updated ${newTracks} | Skipped (already exist) ${skippedTracks}`);
      await sleep(500); 
    }
  } catch (err) {
    if (err.message === "QUOTA_EXCEEDED") throw err;
    console.error(`❌ Error importing ${artistName}:`, err.message);
  }
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    for (const name of artistsToAdd) {
      await importArtist(name);
      await sleep(1000); 
    }

    console.log("\n🎉 Bulk import complete!");
  } catch (err) {
    if (err.message === "QUOTA_EXCEEDED") {
      console.log("\n🚨 YOUTUBE QUOTA EXCEEDED (100 searches/day).");
      console.log("The script stopped early. Run it again tomorrow to continue.");
    } else {
      console.error("❌ Fatal Error:", err);
    }
  } finally {
    process.exit(0);
  }
}

run();