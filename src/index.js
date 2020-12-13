import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import CommentsApp from "./components/CommentsApp";
import TNCApp from "./components/TNCApp";
//import registerServiceWorker from "./registerServiceWorker";
import queryString from "query-string";

var root_el = document.getElementById("root");
if (
  queryString.parse(window.location.search).page_type == "tnc" ||
  /^\/tnc[\/]?$/.test(window.location.pathname)
) {
  ReactDOM.render(<TNCApp />, root_el);
} else {
  ReactDOM.render(<CommentsApp />, root_el);
}
//registerServiceWorker();
