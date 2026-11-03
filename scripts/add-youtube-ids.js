import mongoose from "mongoose";
import dotenv from "dotenv";
import Track from "../models/Track.js";
import Artist from "../models/Artist.js";

dotenv.config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchYouTubeId(title, artistName) {
  const query = encodeURIComponent(`${artistName} ${title}`);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${process.env.YOUTUBE_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.error(`❌ API Error: ${data.error.message}`);
      return null;
    }

    if (data.items && data.items.length > 0) {
      return data.items[0].id.videoId;
    }
    return null;
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all tracks that don't have a YouTube ID yet
    const tracks = await Track.find({
      $or: [
        { youtubeVideoId: { $exists: false } },
        { youtubeVideoId: null },
        { youtubeVideoId: "" },
      ],
    }).populate("artistId");

    console.log(`🔍 Found ${tracks.length} tracks needing YouTube IDs.`);

    let successCount = 0;

    for (const track of tracks) {
      if (!track.artistId) continue;

      const artistName = track.artistId.name;
      console.log(`Searching: "${artistName} - ${track.title}"...`);

      const videoId = await fetchYouTubeId(track.title, artistName);

      if (videoId) {
        track.youtubeVideoId = videoId;
        await track.save();
        console.log(`   ✅ Found: ${videoId}`);
        successCount++;
      } else {
        console.log(`   ❌ Not found.`);
      }

      // YouTube API limits: sleep for 500ms to avoid hitting rate limits instantly
      await sleep(500);
    }

    console.log(`\n🎉 Finished! Added YouTube IDs to ${successCount} tracks.`);
  } catch (err) {
    console.error("❌ Fatal Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
