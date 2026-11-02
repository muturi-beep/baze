import fetch from "node-fetch";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import Track from "../models/Track.js";

dotenv.config();

// 1. Get Spotify Access Token
async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const data = await response.json();
  return data.access_token;
}

// 2. Fetch data for a list of artists
async function seedArtist(artistName, token) {
  const headers = { Authorization: `Bearer ${token}` };

  // Search for the artist
  const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;
  const searchRes = await fetch(searchUrl, { headers });
  const searchData = await searchRes.json();
  const artist = searchData.artists.items[0];

  if (!artist) {
    console.log(`❌ Artist not found: ${artistName}`);
    return;
  }

  console.log(`✅ Found artist: ${artist.name} (${artist.id})`);

  // Save Artist to MongoDB
  const dbArtist = await Artist.findOneAndUpdate(
    { spotifyId: artist.id },
    {
      name: artist.name,
      spotifyId: artist.id,
      imageUrl: artist.images[0]?.url,
      genres: artist.genres,
    },
    { upsert: true, new: true },
  );

  // Fetch their albums
  const albumsUrl = `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&limit=5`;
  const albumsRes = await fetch(albumsUrl, { headers });
  const albumsData = await albumsRes.json();

  for (const album of albumsData.items) {
    // Save Album
    const dbAlbum = await Album.findOneAndUpdate(
      { spotifyId: album.id },
      {
        title: album.name,
        artistId: dbArtist._id,
        spotifyId: album.id,
        artworkUrl: album.images[0]?.url,
        releaseDate: album.release_date,
      },
      { upsert: true, new: true },
    );

    // Fetch tracks for this album
    const tracksUrl = `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=10`;
    const tracksRes = await fetch(tracksUrl, { headers });
    const tracksData = await tracksRes.json();

    for (const track of tracksData.items) {
      // Save Track
      await Track.findOneAndUpdate(
        { spotifyId: track.id },
        {
          title: track.name,
          artistId: dbArtist._id,
          albumId: dbAlbum._id,
          spotifyId: track.id,
          durationMs: track.duration_ms,
          artworkUrl: album.images[0]?.url,
          genre: artist.genres[0] || "afro-pop", // Use the artist's primary genre
          cycleId: "baze_wk12_kenya", // Associate with your current cycle
        },
        { upsert: true },
      );
    }
  }
  console.log(`   -> Saved albums and tracks for ${artist.name}`);
}

// 3. Main function
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const token = await getSpotifyToken();
  const artistsToSeed = [
    "Sauti Sol",
    "Khaligraph Jones",
    "Nyashinski",
    "Bien",
    "Wangechi",
    "Nikita Kering",
  ];

  for (const name of artistsToSeed) {
    await seedArtist(name, token);
  }

  console.log("✅ Seeding complete!");
  process.exit(0);
}

run().catch(console.error);
