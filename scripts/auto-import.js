import dns from "node:dns";
import os from "node:os";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import Track from "../models/Track.js";

dotenv.config();

// 🚨 FIX FOR WINDOWS DNS BUG
if (os.platform() === "win32") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) {
  console.error("❌ Missing YOUTUBE_API_KEY in .env file!");
  process.exit(1);
}

// 🚨 ADD OR REMOVE ARTISTS HERE
const artistsToAdd = [
  "Nyashinski", 
  "Sauti Sol", 
  "Khaligraph Jones", 
  "Bien", 
  "Otile Brown", 
  "Nviiri the Storyteller", 
  "Bensoul", 
  "Nikita Kering'", 
  "Wakadinali", 
  "Mejja", 
  "Femi One", 
  "Nadia Mukami", 
  "Jux", 
  "Sanaipei Tande", 
  "Octopizzo", 
  "King Kaka", 
  "Willy Paul", 
  "Bahati", 
  "Savara", 
  "Xenia Manasseh", 
  "Ethic Entertainment", 
  "Sailors", 
  "Boondocks Gang", 
  "Ochungulo Family", 
  "Mbogi Genje", 
  "Ssaru", 
  "Trio Mio", 
  "Exray Taniua", 
  "Rekles", 
  "Zzero Sufuri", 
  "Breeder LW", 
  "Lil Maina", 
  "Ndovu Kuu", 
  "Toxic Lyrikali", 
  "Buruklyn Boyz",
  "Kapitani", 
  "Mauru Gwash", 
  "Virusi Mbaya", 
  "OnlyMoh", 
  "Colorado", 
  "Vospa", 
  "Makamanda", 
  "Mastar VK", 
  "Thirty Four Brick", 
  "Spoiler 4T3", 
  "4Mr Frank White", 
  "Ebola Mkuu", 
  "Countree Hype", 
  "Scar Mkadinali", 
  "Sewersydaa", 
  "Domani Mkadinali", 
  "Buruklyn Boyz", 
  "Dyana Cods", 
  "YBW Smith"
];

// Helper to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Search YouTube for a track
async function getYouTubeId(title, artistName) {
  try {
    const query = encodeURIComponent(`${artistName} ${title}`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      if (data.error.code === 403) {
        throw new Error("QUOTA_EXCEEDED"); // Special error to catch
      }
      console.error(`   ⚠️ YouTube API Error: ${data.error.message}`);
      return null;
    }

    if (data.items && data.items.length > 0) {
      return data.items[0].id.videoId;
    }
    return null;
  } catch (err) {
    if (err.message === "QUOTA_EXCEEDED") throw err;
    console.error(`   ⚠️ YouTube Fetch Error:`, err.message);
    return null;
  }
}

// 2. Import Artist from Deezer
async function importArtist(artistName) {
  console.log(`\n🔍 Searching Deezer for: ${artistName}`);
  
  try {
    const searchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`);
    const searchData = await searchRes.json();
    const artist = searchData.data?.[0];
    
    if (!artist) {
      console.log(`❌ Not found on Deezer: ${artistName}`);
      return;
    }

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

      let savedTracksCount = 0;

      for (const track of tracksData.data || []) {
        const titleLower = track.title.toLowerCase();
        if (titleLower.match(/remix|instrumental|live|edit|version|reprise|mix/)) continue;

        // Check if we already have this track WITH a YouTube ID
        const existingTrack = await Track.findOne({ spotifyId: `deezer_${track.id}` });
        let youtubeVideoId = existingTrack ? existingTrack.youtubeVideoId : null;

        // If we don't have a YouTube ID yet, search for it
        if (!youtubeVideoId) {
          console.log(`      📺 Searching YouTube for: ${track.title}`);
          youtubeVideoId = await getYouTubeId(track.title, artist.name);
          if (!youtubeVideoId) console.log(`      ❌ No video found for: ${track.title}`);
          
          // Sleep to respect YouTube API rate limits (not quota, just requests per second)
          await sleep(300); 
        }

        await Track.findOneAndUpdate(
          { spotifyId: `deezer_${track.id}` },
          {
            title: track.title,
            artistId: dbArtist._id,
            albumId: dbAlbum._id,
            durationMs: track.duration * 1000,
            artworkUrl: album.cover_xl || album.cover_big,
            genre: "afro-pop",
            cycleId: "baze_wk12_kenya",
            youtubeVideoId: youtubeVideoId, // Will save null if not found, or the ID if found
          },
          { upsert: true }
        );
        savedTracksCount++;
      }
      
      console.log(`   -> Processed ${savedTracksCount} tracks for album: ${album.title}`);
      await sleep(500); // Deezer rate limit delay
    }
  } catch (err) {
    if (err.message === "QUOTA_EXCEEDED") throw err; // Pass quota error up to stop the loop
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
      console.log("The script stopped early. Run it again tomorrow to continue adding YouTube IDs.");
    } else {
      console.error("❌ Fatal Error:", err);
    }
  } finally {
    process.exit(0);
  }
}

run();