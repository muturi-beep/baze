export function h(tag, attrs) {
  var el = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object")
        Object.assign(el.style, v);
      else if (k.indexOf("on") === 0 && typeof v === "function")
        el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    });
  }
  for (var i = 2; i < arguments.length; i++) {
    (function append(c) {
      if (Array.isArray(c)) return c.forEach(append);
      if (c == null || c === false || c === true) return;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    })(arguments[i]);
  }
  return el;
}
