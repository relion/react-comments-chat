import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import CommentsApp from "./components/CommentsApp";
// import TNCApp from "./components/TNCApp";
import registerServiceWorker from "./registerServiceWorker";

ReactDOM.render(<CommentsApp />, document.getElementById("root"));
registerServiceWorker();
