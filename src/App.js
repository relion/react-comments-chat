import React, { Component } from "react";
import logo from "./logo.svg";
import "bootstrap/dist/css/bootstrap.css";
import "./App.css";
import "./global.js";
import Websocket from "react-websocket";
import queryString from "query-string";

import CommentList from "./components/CommentList";
import CommentForm from "./components/CommentForm";

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      comments: [],
      loading: false
    };

    this.addComment = this.addComment.bind(this);

    var title_arg = window.location.search;
    if (title_arg !== "") title_arg = title_arg.substr(1) + "&";
    window.location.title_arg = title_arg;
    global.title = queryString.parse(window.location.search).title;
    if (global.title == undefined || global.title == "") {
      global.title = "ראשי";
    }
  }

  componentDidMount() {
    //document.title = "WCC " + global.title;
  }

  addComment(comment) {
    this.setState({
      loading: false,
      comments: [...this.state.comments, comment]
    });
  }

  editSaveComment(new_message, comment) {
    comment.message = new_message;
    var comment_str = JSON.stringify(comment);
    fetch(
      global.server_url + "?" + window.location.title_arg + "op=comment_update",
      {
        method: "post",
        headers: { "Content-Type": "text/html" },
        body: comment_str
      }
    )
      //.then(res => res.json())
      .then(res => {
        if (res.error) {
          this.setState({ loading: false, error: res.error });
        } else {
          var new_comments = [...this.state.comments];
          var found = false;
          for (var i = 0; i < new_comments.length; i++) {
            if (new_comments[i]._id === comment._id) {
              new_comments[i].message = new_message;
              found = true;
              break;
            }
          }
          if (!found) throw "";
          this.setState({
            loading: false,
            comments: new_comments
          });
        }
      })
      .catch(err => {
        this.setState({
          error: "Something went wrong in editSaveComment.",
          loading: false
        });
      });
  }

  deleteComment(comment) {
    var title_arg = window.location.search;
    if (title_arg !== "") title_arg += "&";
    fetch(
      global.server_url +
        "?" +
        window.location.title_arg +
        "op=comment_delete" +
        "&browser_id=" +
        this.state.browser_id,
      {
        method: "post",
        headers: { "Content-Type": "text/html" },
        body: comment._id
      }
    )
      .then(res => res.json())
      .then(res => {
        if (res.error) {
          this.setState({ loading: false, error: res.error });
        } else {
          this.setState({
            loading: false,
            error: "",
            comments: this.state.comments.filter(e => e._id !== comment._id) // res
          });
        }
      })
      .catch(err => {
        this.setState({
          error: "Something went wrong while deleting Comment.",
          loading: false
        });
      });
  }

  handleWebsocketReceivedData(msg) {
    if (
      //msg.op == undefined) {
      !msg.includes("op")
    ) {
      // lilo: todo: msg should be always a json: { op: "ws_connected", browser_id: "" }
      this.setState({
        browser_id: msg
      });
      this.setState({ loading: true });

      fetch(
        global.server_url +
          "?" +
          window.location.title_arg +
          "op=get_all_comments" +
          "&browser_id=" +
          this.state.browser_id
      )
        .then(res => res.json())
        .then(res => {
          // console.log("my browser_id is: " + res.browser_id);
          this.setState({
            comments: res, // .comments
            loading: false
            // browser_id: res.browser_id
          });
        })
        .catch(err => {
          this.setState({ loading: false });
        });
    } else {
      var json = JSON.parse(msg);
      switch (json.op) {
        case "add":
        case "update":
          var new_comments = [...this.state.comments];
          var found = false;
          new_comments.forEach(c => {
            // lilo
            if (c._id == json.comment._id) {
              if (json.op != "update") throw "unexpected json.op: " + json.op;
              c.message = json.comment.message;
              found = true;
            }
          });
          if (found) {
            this.setState({ comments: new_comments });
          } else {
            this.setState({ comments: [...this.state.comments, json.comment] });
          }
          break;
        case "delete":
          var new_comments = [...this.state.comments];
          var found_i = -1;
          for (var i = 0; i < new_comments.length; i++) {
            if (new_comments[i]._id == json._id) {
              found_i = i;
              break;
            }
          }
          if (found_i == -1) {
            throw '{ "error": "comment._id not found." }';
          } else {
            new_comments.splice(found_i, 1);
            this.setState({ comments: new_comments });
          }
          break;
      }
      showNotification("MY_TITLE", "MY_MESSAGE", "/images/notification.png");
    }
  }

  render() {
    var port = ":3030";
    const loadingSpin = this.state.loading ? "App-logo Spin" : "App-logo";
    return (
      <div className="App container bg-light shadow">
        <Websocket
          url={"ws://" + global.host + port + "/ws/"} // :8888 ?browser_id=" + this.state.browser_id
          onMessage={this.handleWebsocketReceivedData.bind(this)}
        />
        {/* <button onClick={get_notifications_permission}>
          get_notifications_permission
        </button> */}
        <header className="App-header">
          <img src={logo} className={loadingSpin} alt="logo" />
          <h1 className="App-title" dir="ltr">
            <span className="px-2" role="img" aria-label="Chat">
              💬
            </span>
            Dev Comments Room: <b>{global.title}</b>
            <span className="px-2" role="img" aria-label="Chat">
              💬
            </span>
          </h1>
        </header>
        <div className="row">
          <div className="col-4  pt-3 border-right">
            <h6>Say something about anything...</h6>
            <h6 className="text-danger ">
              <strong>{this.state.error}</strong>
            </h6>
            <CommentForm
              addComment={this.addComment}
              comments_app={this}
              browser_id={this.state.browser_id}
            />
          </div>
          <div className="col-8  pt-3 bg-white">
            <CommentList
              loading={this.state.loading}
              comments={this.state.comments}
              form_name={this.state.form_name}
              comments_app={this}
            />
          </div>
        </div>
      </div>
    );
  }
}

// chrome://settings/content/notifications
// note: for testing the Notifications, you can enable: Insecure origins treated as secure in chrome://flags/
function get_notifications_permission() {
  if (window.Notification && Notification.permission !== "granted") {
    Notification.requestPermission(function(status) {
      if (Notification.permission !== "granted") {
        alert("Notification.permission was NOT granted.");
      }
    });
  }
}

get_notifications_permission();

function showNotification(title, body, icon) {
  new Notification(title, {
    body: body,
    icon: icon,
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: "vibration-sample"
  });
}

export default App;
