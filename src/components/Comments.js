import React, { Component } from "react";
import logo from "../images/logo.svg";
import edit_image from "../images/edit.gif";
import "bootstrap/dist/css/bootstrap.css";
import handle_win_title from "./global.js";

import CommentList from "./CommentList";
import CommentForm from "./CommentForm";

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

class Comments extends Component {
  constructor(props) {
    super(props);

    //props.main_app.setState({ my_name: "" });

    this.state = {
      comments: [],
      participants: {},
      loading: false,
      //show_permit_button: false,
      //my_name: "",
      my_comment_message: ""
    };

    this.addComment = this.addComment.bind(this);
    handle_win_title();
  }

  componentDidMount() {
    const ws_port = ":3030";
    this.ws = new WebSocket("ws://" + global.host + ws_port + "/Comments/");
    console.log("opening WebSocket on port:" + ws_port);
    this.ws.comments_app = this;
    this.ws.onmessage = this.handleWebsocketReceivedData;
    this.ws.onopen = this.handleWebsocketEvent;
    this.ws.onclose = this.handleWebsocketEvent;
    this.ws.onerror = this.handleWebsocketEvent;
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
          if (!found) throw "new_message not found.";
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

  handleWebsocketEvent(event) {
    console.log("Websocket " + event.type + " event.");
  }

  handleWebsocketReceivedData(msg) {
    console.log("in handleWebsocketReceivedData");
    var json = JSON.parse(msg.data);
    var username = null;
    switch (json.op) {
      case "ws_connected":
        this.comments_app.setState({
          loading: true,
          browser_id: json.browser_id
        });

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

            res.comments.forEach(c => {
              c.ref = React.createRef();
            });
            this.comments_app.setState({
              comments: res.comments,
              loading: false,
              participants: res.participants
              // browser_id: res.browser_id
            });

            if (this.comments_app.props.main_app.state.pre_set_name) {
              this.send(
                JSON.stringify({
                  op: "client_changed_name",
                  name: this.comments_app.props.main_app.state.my_name
                })
              );
            }
          })
          .catch(err => {
            this.comments_app.setState({ loading: false });
          });
        return;
      case "client_joined":
        var participants = { ...this.comments_app.state.participants };
        participants[json._id] = {}; // still has no name
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
        participants = { ...this.comments_app.state.participants };
        var name = participants[json._id].name;
        delete participants[json._id];
        this.comments_app.setState({
          participants: participants
        });
        showNotification(
          "Comments Room: " + global.title,
          "Client left: " + (name !== undefined ? name : json._id),
          "client_left.mp3"
        );
        return;
      case "client_changed_name":
        participants = { ...this.comments_app.state.participants };
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
        participants = { ...this.comments_app.state.participants };
        participants[json.browser_id].is_typing = true;
        participants[json.browser_id].entered_message = json.entered_message;
        this.comments_app.setState({
          participants: participants
        });
        if (this.comments_app.state.is_typing_timeout !== undefined) {
          clearInterval(this.comments_app.state.is_typing_timeout);
        }
        // note: unccery because should recieve mesage: client_message_entered_ceased, ut anyway:
        this.comments_app.state.is_typing_timeout = setTimeout(
          function(comments) {
            participants = { ...comments.comments_app.state.participants };
            participants[json.browser_id].is_typing = false;
            comments.comments_app.setState({
              participants: participants
            });
          },
          5000,
          this
        );
        // showNotification(
        //   "Comments Room: " + global.title,
        //   participants[json.browser_id].name + " message entered changed."
        // );
        return;
      case "client_message_entered_ceased":
        participants = { ...this.comments_app.state.participants };
        participants[json.browser_id].is_typing = false;
        participants[json.browser_id].entered_message = json.entered_message;
        this.comments_app.setState({
          participants: participants
        });
        clearInterval(this.comments_app.state.is_typing_timeout);
        return;
        break;
      case "comment_added":
      case "comment_updated":
        participants = { ...this.comments_app.state.participants };
        var participant = participants[json.browser_id];
        participant.just_wrote_a_message = true;
        participant.is_typing = false;
        if (participant.just_wrote_a_message_timer !== undefined) {
          clearInterval(participant.just_wrote_a_message_timer);
        }
        participant.just_wrote_a_message_timer = setInterval(
          function(comments, browser_id) {
            var participants = { ...comments.comments_app.state.participants };
            if (participants[browser_id] !== undefined) {
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
          if (comment._id === json.comment._id) {
            if (json.op !== "comment_updated")
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
        comments = [...this.comments_app.state.comments];
        var found_i = -1;
        for (var i = 0; i < comments.length; i++) {
          if (comments[i]._id === json._id) {
            username = comments[i].name;
            found_i = i;
            break;
          }
        }
        if (found_i === -1) {
          throw "comment._id not found.";
        } else {
          comments.splice(found_i, 1);
          this.comments_app.setState({ comments: comments });
        }
        break;
      default:
        throw "unrecognized json.op: " + json.op;
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

  render() {
    var me_participating_style = {
      backgroundColor: "chocolate"
    };
    if (this.props.main_app.state.my_name !== "") {
      me_participating_style.backgroundColor = "white";
      me_participating_style.padding = 0;
    }
    var input_style = {
      borderRadius: "0.3rem",
      paddingLeft: "6px"
    };
    if (this.props.main_app.state.my_name !== "") {
      input_style.backgroundColor = "pink";
    }
    return (
      <React.Fragment>
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
                      Comment{this.state.comments.length !== 1 ? "s" : ""}
                    </h5>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div
          className="participants_div_style"
          style={{ padding: "4px 6px 0 2px" }}
        >
          {Object.keys(this.state.participants).length === 0 ? (
            <span style={{ marginLeft: "4px" }}>
              <b>No Other Participants</b>
            </span>
          ) : (
            <span style={{ marginLeft: "4px" }}>
              <b>Participants: </b>
              {Object.keys(this.state.participants).map(function(browser_id) {
                var participant = this.state.participants[browser_id];
                var participant_span_className =
                  "participants_span_style" +
                  (participant.just_wrote_a_message
                    ? " participants_just_wrote_style"
                    : "") +
                  (participant.name === undefined
                    ? " participants_span_unknown_style"
                    : "");
                return (
                  <div
                    className={participant_span_className}
                    style={{ display: "inline-block" }}
                  >
                    {participant.name !== undefined
                      ? participant.name
                      : "unknown"}
                    {participant.is_typing ? (
                      <span>
                        <img
                          src={edit_image}
                          className={"Edit-animation infinite 2s linear"}
                          alt="participant is typing"
                        />{" "}
                      </span>
                    ) : (
                      ""
                    )}{" "}
                    <span style={{ fontSize: "12px", color: "red" }}>
                      {participant.entered_message}
                    </span>
                  </div>
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
        {this.props.main_app.state.my_name == "" ? (
          ""
        ) : (
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
        )}
      </React.Fragment>
    );
  }
}

export default Comments;
