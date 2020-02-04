import React, { Component } from "react";
import logo from "./images/logo.svg";
import edit_image from "./images/edit.gif";
import "bootstrap/dist/css/bootstrap.css";
import "./App.css";
import "./global.js";
import Websocket from "react-websocket";
import queryString from "query-string";
import AutosizeInput from "react-input-autosize";

import CommentList from "./components/CommentList";
import CommentForm from "./components/CommentForm";

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      comments: [],
      participants: {},
      loading: false,
      show_permit_button: true,
      my_comment: {
        name: "",
        message: ""
      }
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
    comment.ref = React.createRef();
    this.setState({
      loading: false,
      comments: [...this.state.comments, comment]
    });
  }

  editSaveComment(new_message, comment) {
    comment.message = new_message;
    var comment_to_send = { ...comment };
    delete comment_to_send.ref; // lilo: needless and cannot be sent anyway.
    var comment_str = JSON.stringify(comment_to_send);
    fetch(
      global.server_url +
        "?" +
        window.location.title_arg +
        "op=comment_updated&browser_id=" +
        this.state.browser_id,

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
        "op=comment_deleted" +
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
    var audio = "Frogger_Orig_Part_2.mp3";
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
            res.forEach(c => {
              c.ref = React.createRef();
            });
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
          "Client joined: " + json._id,
          "new_client.mp3"
        );
        return;
      case "client_left":
        console.log("client_left: " + json._id);
        var participants = { ...this.comments_app.state.participants };
        var name = participants[json._id].name;
        delete participants[json._id];
        this.comments_app.setState({
          participants: participants
        });
        showNotification(
          "Comments Room: " + global.title,
          "Client left: " + (name != undefined ? name : json._id),
          "client_left.mp3"
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
          "Client changed his name to: " + json.name,
          "new_client.mp3"
        );
        return;
      case "client_message_entered_changed":
        var participants = { ...this.comments_app.state.participants };
        participants[json.browser_id].is_typing = true;
        this.comments_app.setState({
          participants: participants
        });
        if (this.comments_app.state.is_typing_timeout != undefined) {
          clearInterval(this.comments_app.state.is_typing_timeout);
        }
        this.comments_app.state.is_typing_timeout = setTimeout(
          function(comments) {
            var participants = { ...comments.comments_app.state.participants };
            participants[json.browser_id].is_typing = false;
            comments.comments_app.setState({
              participants: participants
            });
          },
          3000,
          this
        );
        // showNotification(
        //   "Comments Room: " + global.title,
        //   participants[json.browser_id].name + " message entered changed."
        // );
        return;
      case "comment_added":
      case "comment_updated":
        var participants = { ...this.comments_app.state.participants };
        var participant = participants[json.browser_id];
        participant.just_wrote_a_message = true;
        participant.is_typing = false;
        if (participant.just_wrote_a_message_timer != undefined) {
          clearInterval(participant.just_wrote_a_message_timer);
        }
        participant.just_wrote_a_message_timer = setInterval(
          function(comments, browser_id) {
            var participants = { ...comments.comments_app.state.participants };
            if (participants[browser_id] != undefined) {
              participants[browser_id].just_wrote_a_message = false;
              comments.comments_app.setState({ participants: participants });
            }
          },
          4000,
          this,
          json.browser_id
        );
        this.comments_app.setState({ participants: participants });
        //
        var comments = [...this.comments_app.state.comments];
        var found = false;
        var comment;
        for (var i = 0; i < comments.length; i++) {
          // lilo
          comment = comments[i];
          if (comment._id == json.comment._id) {
            if (json.op != "comment_updated")
              throw "unexpected json.op: " + json.op;
            comment.message = json.comment.message;
            found = true;
            this.comments_app.setState({ comments: comments });
            break;
          }
        }
        if (!found) {
          comment = json.comment;
          comment.ref = React.createRef();
          this.comments_app.setState({
            comments: [...this.comments_app.state.comments, json.comment]
          });
        }
        comment.ref.current.scrollIntoView({
          block: "end",
          behavior: "smooth"
        });
        username = json.comment.name;
        break;
      case "comment_deleted":
        var comments = [...this.comments_app.state.comments];
        var found_i = -1;
        for (var i = 0; i < comments.length; i++) {
          if (comments[i]._id == json._id) {
            username = comments[i].name;
            found_i = i;
            break;
          }
        }
        if (found_i == -1) {
          throw '{ "error": "comment._id not found." }';
        } else {
          comments.splice(found_i, 1);
          this.comments_app.setState({ comments: comments });
        }
        break;
    }
    showNotification(
      "Comments Room: " + global.title,
      username + " " + json.op,
      "message.mp3"
    );
  }

  ws_send_user_changed_name(name) {
    this.ws.send(JSON.stringify({ op: "client_changed_name", name: name }));
    //alert("name changed to: " + name);
  }

  handle_name_field_changed = event => {
    const { value, name } = event.target;
    if (name === "name") {
      if (this.state.name_changed_timer != undefined) {
        clearInterval(this.state.name_changed_timer);
      }
      this.state.name_changed_timer = setInterval(
        function(c) {
          if (c.state.last_sent_user_name != value) {
            c.ws_send_user_changed_name(value);
            c.state.last_sent_user_name = value;
          }
        },
        5000,
        this
      );
    } else {
      throw "unrecognized name: " + name;
    }
    //
    var my_comment = { ...this.state.my_comment };
    my_comment[name] = value;
    this.setState({ my_comment: my_comment });
  };

  render() {
    var me_participating_style = {
      backgroundColor: "chocolate"
    };
    if (this.state.my_comment.name != "") {
      me_participating_style.backgroundColor = "white";
      me_participating_style.padding = 0;
    }
    var input_style = {
      borderRadius: "0.3rem",
      paddingLeft: "6px"
    };
    if (this.state.my_comment.name != "") {
      input_style.backgroundColor = "pink";
    }
    return (
      <div className="App d-flex flex-column h-100 container bg-light shadow">
        {this.state.show_permit_button ? (
          <button onClick={this.handleUserPermitClick.bind(this)}>
            click here to anable Audio Notifications from this page
          </button>
        ) : (
          ""
        )}
        <table className="App-header">
          <tr>
            <td>
              <img
                src={logo}
                className={this.state.loading ? "App-logo Spin" : "App-logo"}
                alt="logo"
              />
            </td>
            <td style={{ width: "100%" }}>
              <table>
                <tr>
                  <td>
                    <h1 className="App-title" dir="ltr">
                      <span className="px-2" role="img" aria-label="Chat">
                        💬
                      </span>
                      Title: <b>{global.title}</b>
                      <span className="px-2" role="img" aria-label="Chat">
                        💬
                      </span>
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h5>
                      <span className="badge badge-success">
                        {this.state.comments.length}
                      </span>{" "}
                      Comment{this.state.comments.length != 1 ? "s" : ""}
                    </h5>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div
          style={{
            background: "rgb(238, 238, 238)",
            borderRadius: "5px",
            padding: "3px",
            margin: "0",
            display: "inline-block"
          }}
        >
          {this.state.my_comment.name != "" ? <b>{"Your name: "}</b> : ""}
          <AutosizeInput
            onChange={this.handle_name_field_changed}
            placeholder="👤 Please Enter Your Name"
            name="name"
            type="text"
            value={this.state.my_comment.name}
            style={{
              border: "3px solid lightcoral",
              borderRadius: "0.3rem",
              padding: 0
            }}
          />
        </div>
        <div className="participants_div_style">
          {Object.keys(this.state.participants).length == 0 ? (
            <b>No Other Participants</b>
          ) : (
            <span style={{ paddingLeft: "6px" }}>
              <b>Participants: </b>
              {Object.keys(this.state.participants).map(function(browser_id) {
                var participant = this.state.participants[browser_id];
                var participant_span_className =
                  "participants_span_style" +
                  (participant.just_wrote_a_message
                    ? " participants_just_wrote_style"
                    : "");
                return (
                  <span className={participant_span_className}>
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
        <div style={{ maxHeight: "100%", overflow: "auto" }}>
          <CommentList
            loading={this.state.loading}
            comments={this.state.comments}
            comments_app={this}
          />
        </div>
        <div className="my_comment_form_style" style={{ flex: "none" }}>
          <CommentForm
            addComment={this.addComment}
            comments_app={this}
            browser_id={this.state.browser_id}
          />
          {this.state.error ? (
            <h6 className="text-danger ">
              <strong>{this.state.error}</strong>
            </h6>
          ) : null}
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

function showNotification(title, txt, audio) {
  new Notification(title, {
    body: txt,
    icon: "/images/notification.png",
    sound: "/audio/" + audio, // get more here: https://www.zedge.net/find/notification
    vibrate: [200, 100, 200, 100, 200, 100, 200]
  });
  new Audio("/audio/" + audio).play();
  console.log("showNotification done..");
}

export default App;
