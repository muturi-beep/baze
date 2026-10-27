var routes = [];
var root = null;
var currentView = null;

export function route(pattern, handler) {
  var keys = [];
  var regex = new RegExp(
    "^" +
      pattern.replace(/:(\w+)/g, function (_, k) {
        keys.push(k);
        return "([^/]+)";
      }) +
      "$",
  );
  routes.push({ regex: regex, keys: keys, handler: handler });
}

export function start(el) {
  root = el;
  window.addEventListener("hashchange", render);
  render();
}

function currentPath() {
  return location.hash.replace(/^#/, "") || "/";
}

function render() {
  var path = currentPath();
  for (var i = 0; i < routes.length; i++) {
    var r = routes[i];
    var m = path.match(r.regex);
    if (!m) continue;
    if (currentView && currentView.destroy) currentView.destroy();
    var params = {};
    r.keys.forEach(function (k, idx) {
      params[k] = m[idx + 1];
    });
    currentView = r.handler(params);
    root.innerHTML = "";
    root.appendChild(currentView.el);
    window.scrollTo(0, 0);
    return;
  }
  root.textContent = "Not found";
}
