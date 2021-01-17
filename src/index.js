import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import CommentsApp from "./components/CommentsApp";
import TNCApp from "./components/TNCApp";
import MonitorApp from "./components/MonitorApp";
//import registerServiceWorker from "./registerServiceWorker";
import queryString from "query-string";

var root_el = document.getElementById("root");
if (/^\/tnc[\/]?$/i.test(window.location.pathname)) {
  ReactDOM.render(<TNCApp />, root_el);
} else if (/^\/comments[\/]?$/i.test(window.location.pathname)) {
  ReactDOM.render(<CommentsApp />, root_el);
} else if (/^\/monitor[\/]?$/i.test(window.location.pathname)) {
  ReactDOM.render(<MonitorApp />, root_el);
} else {
  throw "React: page type not found.";
}
//registerServiceWorker();
