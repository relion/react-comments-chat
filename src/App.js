import React, { Component } from "react";
import logo from "./images/logo.svg";
import edit_image from "./images/edit.gif";
import "bootstrap/dist/css/bootstrap.css";
import "./App.css";
import "./global.js";
import Websocket from "react-websocket";
import queryString from "query-string";
import { ListGroup, ListGroupItem, ListGroupItemText } from "reactstrap";

import CommentList from "./components/CommentList";
import CommentForm from "./components/CommentForm";

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      comments: [],
      participants: {},
      loading: false,
      show_permit_button: true
    };

    this.addComment = this.addComment.bind(this);

    var title_arg = window.location.search;
    if (title_arg !== "") title_arg = title_arg.substr(1) + "&";
    window.location.title_arg = title_arg;
    global.title = queryString.parse(window.location.search).title;
    if (global.title == undefined || global.title == "") {
      global.title = "Root";
    }
  }

  componentDidMount() {
    const ws_port = ":3030";
    this.ws = new WebSocket("ws://" + global.host + ws_port + "/ws/");
    this.ws.comments_app = this;
    this.ws.onmessage = this.handleWebsocketReceivedData;
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
    console.log("in handleWebsocketReceivedData");
    var json = JSON.parse(msg.data);
    var username = null;
    switch (json.op) {
      case "ws_connected":
        this.comments_app.setState({
          browser_id: json.browser_id,
          participants: json.participants
        });
        this.comments_app.setState({ loading: true });

        fetch(
          global.server_url +
            "?" +
            window.location.title_arg +
            "op=get_all_comments" +
            "&browser_id=" +
            this.comments_app.state.browser_id
        )
          .then(res => res.json())
          .then(res => {
            // console.log("my browser_id is: " + res.browser_id);
            this.comments_app.setState({
              comments: res, // .comments
              loading: false
              // browser_id: res.browser_id
            });
          })
          .catch(err => {
            this.comments_app.setState({ loading: false });
          });
        return;
      case "client_joined":
        var participants = { ...this.comments_app.state.participants };
        participants[json._id] = {}; // still no name
        this.comments_app.setState({
          participants: participants
        });
        showNotification(
          "Comments Room: " + global.title,
          "Client joined: " + json._id
        );
        return;
      case "client_left":
        console.log("client_left: " + json._id);
        var participants = { ...this.comments_app.state.participants };
        delete participants[json._id];
        this.comments_app.setState({
          participants: participants
        });
        showNotification(
          "Comments Room: " + global.title,
          "Client left: " + json._id
        );
        return;
      case "client_changed_name":
        var participants = { ...this.comments_app.state.participants };
        participants[json.browser_id].name = json.name;
        this.comments_app.setState({
          participants: participants
        });
        // console.log(
        //   "Client_changed_name.. browser_id: " +
        //     this.comments_app.state.browser_id +
        //     " name: " +
        //     json.name
        // );
        showNotification(
          "Comments Room: " + global.title,
          "Client changed his name to: " + json.name
        );
        return;
      case "client_message_changed":
        console.log("got client_message_changed");
        var participants = { ...this.comments_app.state.participants };
        participants[json.browser_id].is_typing = true;
        this.comments_app.setState({
          participants: participants
        });
        if (this.comments_app.state.is_typing_timeout != undefined) {
          clearInterval(this.comments_app.state.is_typing_timeout);
        }
        this.comments_app.state.is_typing_timeout = setTimeout(
          function(c) {
            var participants = { ...c.comments_app.state.participants };
            participants[json.browser_id].is_typing = false;
            c.comments_app.setState({
              participants: participants
            });
          },
          3000,
          this
        );
        break;
      case "add":
      case "update":
        var new_comments = [...this.comments_app.state.comments];
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
          this.comments_app.setState({ comments: new_comments });
        } else {
          this.comments_app.setState({
            comments: [...this.comments_app.state.comments, json.comment]
          });
        }
        username = json.comment.name;
        break;
      case "delete":
        var new_comments = [...this.state.comments];
        var found_i = -1;
        for (var i = 0; i < new_comments.length; i++) {
          if (new_comments[i]._id == json._id) {
            username = new_comments[i].name;
            found_i = i;
            break;
          }
        }
        if (found_i == -1) {
          throw '{ "error": "comment._id not found." }';
        } else {
          new_comments.splice(found_i, 1);
          this.comments_app.setState({ comments: new_comments });
        }
        break;
    }
    showNotification(
      "Comments Room: " + global.title,
      username + " " + json.op + (json.op == "add" ? "e" : "") + "d a comment."
    );
  }

  render() {
    return (
      <div className="App container bg-light shadow">
        {this.state.show_permit_button ? (
          <button onClick={this.handleUserPermitClick.bind(this)}>
            click here to anable Audio Notifications from this page
          </button>
        ) : (
          ""
        )}
        <header className="App-header">
          <img
            src={logo}
            className={this.state.loading ? "App-logo Spin" : "App-logo"}
            alt="logo"
          />
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
        <div className="participants_div_style">
          {Object.keys(this.state.participants).length == 0 ? (
            <b>No Other Participants</b>
          ) : (
            <span>
              <b>Participants: </b>
              {Object.keys(this.state.participants).map(function(browser_id) {
                var participant = this.state.participants[browser_id];
                return (
                  <span className="participants_span_style">
                    {participant.name != undefined
                      ? participant.name
                      : browser_id}
                    {participant.is_typing ? (
                      <img
                        src={edit_image}
                        className={"Edit-animation infinite 2s linear"}
                      />
                    ) : (
                      ""
                    )}
                  </span>
                );
              }, this)}
            </span>
          )}
        </div>
        <div className="row">
          <div className="col-md pt-3 bg-white">
            <CommentList
              loading={this.state.loading}
              comments={this.state.comments}
              form_name={this.state.form_name}
              comments_app={this}
            />
          </div>
          <div className="col-md-auto pt-3 border-right">
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
        </div>
      </div>
    );
  }

  handleUserPermitClick() {
    new Audio("/audio/chimes.mp3").play();
    this.setState({ show_permit_button: false });
  }
}

// chrome://settings/content/notifications
// Note: for testing the Notifications on real host, you can enable: Insecure origins treated as secure in chrome://flags/
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

function showNotification(title, txt) {
  new Notification(title, {
    body: txt,
    icon: "/images/notification.png",
    sound: "/audio/Frogger_Orig_Part_2.mp3",
    vibrate: [200, 100, 200, 100, 200, 100, 200]
  });
  new Audio("/audio/Frogger_Orig_Part_2.mp3").play();
  console.log("showNotification done..");
}

export default App;
