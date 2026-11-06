import express from "express";
import Track from "../models/Track.js";
import Artist from "../models/Artist.js";

const router = express.Router();

router.get("/track/:trackId", async (req, res) => {
  try {
    const track = await Track.findById(req.params.trackId).populate("artistId");
    if (!track) return res.redirect("https://baze-theta.vercel.app/"); // Change this to your Vercel URL!

    const artistName = track.artistId ? track.artistId.name : "Unknown Artist";
    const title = `${track.title} by ${artistName}`;
    const description = `Vote for "${track.title}" on Baze. The official Kenyan music chart.`;
    const imageUrl =
      track.artworkUrl || `https://picsum.photos/seed/${track._id}/600`;
    const appUrl = `https://baze-theta.vercel.app/#/track/${track._id}`; // Change this to your Vercel URL!

    // Generate a minimal HTML page just for the crawlers
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <!-- Open Graph / Facebook / WhatsApp -->
        <meta property="og:type" content="music.song" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:url" content="${appUrl}" />
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${imageUrl}" />

        <!-- Redirect human users to the actual app -->
        <meta http-equiv="refresh" content="0; url=${appUrl}">
      </head>
      <body>
        <script>window.location.href = "${appUrl}";</script>
        <p>Redirecting to Baze...</p>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    res.redirect("https://baze-theta.vercel.app/"); // Change this to your Vercel URL!
  }
});

export default router;
