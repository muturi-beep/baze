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

async function importArtist(artistName) {
  console.log(`\n🔍 Searching for: ${artistName}`);
  
  try {
    // 1. Search Deezer for the artist
    const searchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`);
    const searchData = await searchRes.json();
    const artist = searchData.data?.[0];
    
    if (!artist) {
      console.log(`❌ Not found on Deezer: ${artistName}`);
      return;
    }

    // 2. Save Artist to MongoDB
    const dbArtist = await Artist.findOneAndUpdate(
      { spotifyId: `deezer_${artist.id}` },
      { 
        name: artist.name, 
        imageUrl: artist.picture_xl || artist.picture_big, 
        genres: ["afro-pop"] 
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Saved Artist: ${artist.name}`);

    // 3. Fetch their albums (limit to 5 to save time)
    const albumsRes = await fetch(`https://api.deezer.com/artist/${artist.id}/albums?limit=5`);
    const albumsData = await albumsRes.json();

    if (!albumsData.data) return;

    for (const album of albumsData.data) {
      // Save Album
      const dbAlbum = await Album.findOneAndUpdate(
        { spotifyId: `deezer_${album.id}` },
        { 
          title: album.title, 
          artistId: dbArtist._id, 
          artworkUrl: album.cover_xl || album.cover_big, 
          releaseDate: album.release_date || "2026" 
        },
        { upsert: true, new: true }
      );

      // 4. Fetch tracks for this album
      const tracksRes = await fetch(`https://api.deezer.com/album/${album.id}/tracks`);
      const tracksData = await tracksRes.json();

      let savedTracksCount = 0;

      for (const track of tracksData.data || []) {
        // 🚨 FILTER: Skip remixes, live versions, and instrumentals
        const titleLower = track.title.toLowerCase();
        if (titleLower.match(/remix|instrumental|live|edit|version|reprise|mix/)) {
          continue; 
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
          },
          { upsert: true }
        );
        savedTracksCount++;
      }
      console.log(`   -> Saved ${savedTracksCount} tracks for album: ${album.title}`);
      
      // Delay to respect Deezer API rate limits
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }
  } catch (err) {
    console.error(`❌ Error importing ${artistName}:`, err.message);
  }
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    for (const name of artistsToAdd) {
      await importArtist(name);
      // Wait 1 second between artists to prevent Deezer from blocking you
      await new Promise(resolve => setTimeout(resolve, 1000)); 
    }

    console.log("\n🎉 Bulk import complete!");
  } catch (err) {
    console.error("❌ Fatal Error:", err);
  } finally {
    process.exit(0);
  }
}

run();