import { route, start } from "./router.js";
import { HomeView } from "./views/home.js";
import { TrackView } from "./views/track.js";
import { LeaderboardView } from "./views/leaderboard.js";
import { MyVotesView } from "./views/myVotes.js";
import { ResultsView } from "./views/results.js";
import { ExploreView } from "./views/explore.js";
import { GenreView } from "./views/genre.js";
import { AlbumsView } from "./views/albums.js";
import { AlbumView } from "./views/album.js";
import { ProducersView } from "./views/producers.js";
import { ProducerView } from "./views/producer.js";
import { ArtistView } from "./views/artist.js";
import { MeView } from "./views/me.js";
import { ClaimView } from "./views/claim.js";
import { RankingExplainedView } from "./views/rankingExplained.js";

route("/", function () {
  return HomeView();
});
route("/track/:trackId", function (p) {
  return TrackView(p);
});
route("/leaderboard", function () {
  return LeaderboardView();
});
route("/votes", function () {
  return MyVotesView();
});
route("/results", function () {
  return ResultsView();
});
route("/explore", function () {
  return ExploreView();
});
route("/genre/:genreId", function (p) {
  return GenreView(p);
});
route("/albums", function () {
  return AlbumsView();
});
route("/album/:albumId", function (p) {
  return AlbumView(p);
});
route("/producers", function () {
  return ProducersView();
});
route("/producer/:producerId", function (p) {
  return ProducerView(p);
});
route("/artist/:artistId", function (p) {
  return ArtistView(p);
});
route("/me", function () {
  return MeView();
});
route("/claim", function () {
  return ClaimView();
});
route("/ranking-explained", function () {
  return RankingExplainedView();
});

start(document.getElementById("app"));
