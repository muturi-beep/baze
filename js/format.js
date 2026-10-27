export function formatDuration(sec) {
  var m = Math.floor(sec / 60),
    s = String(sec % 60);
  if (s.length < 2) s = "0" + s;
  return m + ":" + s;
}

export function formatRemaining(endsAt) {
  var ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "closed";
  var d = Math.floor(ms / 86400000),
    h = Math.floor((ms % 86400000) / 3600000),
    m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return d + "d " + h + "h";
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}

export function cycleProgress(cycle) {
  var start = new Date(cycle.startsAt).getTime(),
    end = new Date(cycle.endsAt).getTime();
  var pct = ((Date.now() - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, pct));
}
