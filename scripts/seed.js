import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import Track from "../models/Track.js";

dotenv.config();

// --- Helper: Throttle Deezer Requests ---
// Deezer allows 50 requests / 5 seconds. This keeps us well under that limit.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Helper: Get High-Res Artwork from iTunes ---
async function getHighResArtwork(artistName, albumTitle) {
  try {
    const query = encodeURIComponent(`${artistName} ${albumTitle}`);
    const res = await axios.get(
      `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`,
    );
    if (res.data.results.length > 0) {
      let artworkUrl = res.data.results[0].artworkUrl100;
      // The magic trick: swap 100x100 for a much larger resolution
      if (artworkUrl) return artworkUrl.replace("100x100", "600x600");
    }
  } catch (err) {
    console.warn(`⚠️ iTunes artwork fallback failed for ${albumTitle}`);
  }
  return null;
}

// --- Main Seeding Function for an Artist ---
async function seedArtist(artistName) {
  console.log(`\n🔍 Searching for artist: ${artistName}...`);

  try {
    // 1. Search for Artist on Deezer
    const searchRes = await axios.get(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`,
    );
    const artist = searchRes.data.data?.[0];
    if (!artist) {
      console.log(`❌ Artist not found on Deezer: ${artistName}`);
      return;
    }
    console.log(`✅ Found on Deezer: ${artist.name} (ID: ${artist.id})`);

    // 2. Create Artist in MongoDB
    const dbArtist = await Artist.findOneAndUpdate(
      { spotifyId: `deezer_${artist.id}` }, // Using spotifyId field for Deezer ID for simplicity
      {
        name: artist.name,
        imageUrl: artist.picture_xl || artist.picture_big,
        genres: ["afro-pop"],
      }, // Deezer doesn't provide genres on basic search
      { upsert: true, new: true },
    );

    // 3. Get Albums for this Artist
    const albumsRes = await axios.get(
      `https://api.deezer.com/artist/${artist.id}/albums?limit=5`,
    );
    const albums = albumsRes.data.data || [];
    console.log(`   -> Found ${albums.length} albums.`);

    for (const album of albums) {
      await sleep(200); // Respect Deezer rate limit

      // 4. Get High-Res Artwork (iTunes Fallback)
      let artworkUrl = album.cover_xl || album.cover_big;
      if (!artworkUrl || artworkUrl.includes("e-cdns-images.dzcdn.net")) {
        // If Deezer image is missing or low-res, try iTunes
        const itunesArt = await getHighResArtwork(artistName, album.title);
        if (itunesArt) artworkUrl = itunesArt;
      }

      // 5. Create Album in MongoDB
      const dbAlbum = await Album.findOneAndUpdate(
        { spotifyId: `deezer_${album.id}` },
        {
          title: album.title,
          artistId: dbArtist._id,
          artworkUrl: artworkUrl,
          releaseDate: album.release_date || "2026",
        },
        { upsert: true, new: true },
      );

      // 6. Get Tracks for this Album
      const tracksRes = await axios.get(
        `https://api.deezer.com/album/${album.id}/tracks`,
      );
      const tracks = tracksRes.data.data || [];
      console.log(
        `     -> Saving ${tracks.length} tracks from "${album.title}"`,
      );

      for (const track of tracks) {
        await Track.findOneAndUpdate(
          { spotifyId: `deezer_${track.id}` },
          {
            title: track.title,
            artistId: dbArtist._id,
            albumId: dbAlbum._id,
            durationMs: track.duration * 1000, // Deezer gives seconds, we need ms
            artworkUrl: artworkUrl,
            genre: "afro-pop", // Placeholder genre
            cycleId: "baze_wk12_kenya",
            // NOTE: You must add a YouTube ID manually via the Admin Dashboard for now
          },
          { upsert: true },
        );
      }
    }
  } catch (err) {
    console.error(`❌ Error seeding ${artistName}:`, err.message);
  }
}

// --- Main Execution ---
async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // 🚨 WIPE OLD DATA SO WE DON'T GET DUPLICATES
    await Track.deleteMany({});
    await Album.deleteMany({});
    await Artist.deleteMany({});
    console.log("🧹 Cleared old mock data");

    // Add the artists you want to seed here
    const artistsToSeed = [
      "Sauti Sol",
      "Khaligraph Jones",
      "Nyashinski",
      "Bien",
      "Wangechi",
    ];

    for (const name of artistsToSeed) {
      await seedArtist(name);
      await sleep(1000);
    }

    console.log("\n🎉 Seeding complete!");
  } catch (err) {
    console.error("❌ Fatal Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
