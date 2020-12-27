import React, { Component } from "react";
import logo_blue from "../images/logo-blue.svg";
import logo_red from "../images/logo-red.svg";
import edit_image from "../images/edit.gif";
import "bootstrap/dist/css/bootstrap.css";
import handle_win_title from "./global.js";

import CommentList from "./CommentList";
import CommentForm from "./CommentForm";

// chrome://settings/content/notifications
// Note: for testing the Notifications on real host, you can enable: Insecure origins treated as secure in chrome://flags/
function get_notifications_permission() {
  if (window.Notification && Notification.permission !== "granted") {
    Notification.requestPermission(function (status) {
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
    vibrate: [200, 100, 200, 100, 200, 100, 200],
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
      my_comment_message: "",
    };

    setInterval(this.my_setInterval, global.time_sec_jump, this);

    this.addComment = this.addComment.bind(this);
    handle_win_title();
  }

  my_setInterval(comments_obj) {
    var new_comments = [...comments_obj.state.comments];
    var found_change = false;
    for (var i = 0; i < new_comments.length; i++) {
      new_comments[
        i
      ].formatted_since = comments_obj.props.main_app.get_time_since_now_formatted(
        new_comments[i].time
      );
      // console.log(
      //   "in Timeout get_time_since_now_formatted: " + comment.formatted_since
      // );
      // if (old_val != new_val)
      // {
      //   found_change = true;
      // }
    }
    comments_obj.setState({
      comments: new_comments,
    });
    // this.state.comments.forEach((comment) => {
    // });
  }

  componentDidMount() {
    this.connect_ws(this);
  }

  connect_ws(comments_obj) {
    comments_obj.state.status_txt = "Connecting...";
    comments_obj.state.status_color = "green";
    comments_obj.ws = new WebSocket(
      "ws://" + global.host + ":" + global.ws_port + "/Comments/"
    );
    console.log("opening WebSocket on port:" + global.ws_port);
    comments_obj.ws.comments_app = comments_obj;
    comments_obj.ws.onmessage = comments_obj.handleWebsocketReceivedData;
    comments_obj.ws.onopen = comments_obj.handleWebsocketEvent.bind(
      comments_obj
    );
    comments_obj.ws.onclose = comments_obj.handleWebsocketEvent.bind(
      comments_obj
    );
    comments_obj.ws.onerror = comments_obj.handleWebsocketEvent.bind(
      comments_obj
    );
  }

  addComment(comment) {
    comment.ref = React.createRef();
    comment.formatted_since = global.formatted_since_just_added;
    this.setState({
      loading: false,
      comments: [...this.state.comments, comment],
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
        body: comment_str,
      }
    )
      //.then(res => res.json())
      .then((res) => {
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
            comments: new_comments,
          });
        }
      })
      .catch((err) => {
        this.setState({
          error: "Something went wrong in editSaveComment.",
          loading: false,
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
        body: comment._id,
      }
    )
      //.then((res) => res.json())
      .then((res) => {
        if (res.error) {
          this.setState({ loading: false, error: res.error });
        } else {
          this.setState({
            loading: false,
            error: "",
            comments: this.state.comments.filter((e) => e._id !== comment._id), // res
          });
        }
      })
      .catch((err) => {
        this.setState({
          error: "Something went wrong while deleting Comment.",
          loading: false,
        });
      });
  }

  handleWebsocketEvent(event) {
    switch (event.type) {
      case "close":
        this.setState({
          status_txt: "Disconnected",
          status_color: "red",
          participants: {},
        });
        setTimeout(this.connect_ws, 4000, this);
        break;
      case "open":
        this.setState({
          status_txt: "Connected",
          status_color: "black",
        });
        break;
      case "error":
        this.setState({
          status_txt: "WS Error!",
          status_color: "red",
        });
        break;
      default:
        console.log("Websocket " + event.type + " event.");
        break;
    }
  }

  handleWebsocketReceivedData(msg) {
    console.log("in handleWebsocketReceivedData");
    var json = JSON.parse(msg.data);
    var username = null;
    switch (json.op) {
      case "ws_connected":
        this.comments_app.setState({
          loading: true,
          browser_id: json.browser_id,
        });

        fetch(
          global.server_url +
            "?" +
            window.location.title_arg +
            "op=get_all_comments" +
            "&browser_id=" +
            this.comments_app.state.browser_id +
            "&name=" +
            this.comments_app.props.main_app.state.my_name
        )
          .then((res) => res.json())
          .then((res) => {
            // console.log("my browser_id is: " + res.browser_id);

            // res.comments.forEach((c) => {
            // });
            for (var i = 0; i < res.comments.length; i++) {
              var c = res.comments[i];
              c.ref = React.createRef();
              c.formatted_since = this.comments_app.props.main_app.get_time_since_now_formatted(
                c.time
              );
            }
            this.comments_app.setState({
              comments: res.comments,
              loading: false,
              participants: res.participants,
              // browser_id: res.browser_id
            });

            var my_name = this.comments_app.props.main_app.state.my_name;
            if (my_name != undefined && my_name.trim() != "") {
              setTimeout(
                () =>
                  this.send(
                    JSON.stringify({
                      op: "client_changed_name",
                      name: my_name,
                    })
                  ),
                2000
              );
            }
          })
          .catch((err) => {
            this.comments_app.setState({ loading: false });
          });
        return;
      case "client_joined":
        this.comments_app.handle_client_joined(this.comments_app, json);
        return;
      case "client_left":
        console.log("client_left: " + json.browser_id);
        var participants = { ...this.comments_app.state.participants };
        if (participants[json.browser_id] == undefined) return;
        var name = participants[json.browser_id].name;
        delete participants[json.browser_id];
        this.comments_app.setState({
          participants: participants,
        });
        showNotification(
          "Comments Room: " + global.title,
          "Client left: " + (name !== undefined ? name : json.browser_id),
          "client_left.mp3"
        );
        return;
      case "client_changed_name":
        if (this.comments_app.state.participants[json.browser_id] != null) {
          participants = { ...this.comments_app.state.participants };
        } else {
          participants = this.comments_app.handle_client_joined(
            this.comments_app,
            json
          );
          participants[json.browser_id] = {};
        }
        participants[json.browser_id].name = json.name;
        this.comments_app.setState({
          participants: participants,
        });
        //
        showNotification(
          "Comments Room: " + global.title,
          "Client changed his name to: " + json.name,
          "new_client.mp3"
        );
        return;
      case "client_message_entered_changed":
        if (this.comments_app.state.is_typing_timeout !== undefined) {
          clearInterval(this.comments_app.state.is_typing_timeout);
        }
        //
        participants = { ...this.comments_app.state.participants };
        participants[json.browser_id].is_typing = true;
        participants[json.browser_id].entered_message = json.entered_message;
        this.comments_app.setState({
          participants: participants,
        });
        // note: unccery because should recieve mesage: client_message_entered_ceased, ut anyway:
        this.comments_app.state.is_typing_timeout = setTimeout(
          function (comments) {
            participants = { ...comments.comments_app.state.participants };
            participants[json.browser_id].is_typing = false;
            comments.comments_app.setState({
              participants: participants,
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
        clearInterval(this.comments_app.state.is_typing_timeout);
        participants = { ...this.comments_app.state.participants };
        participants[json.browser_id].is_typing = false;
        participants[json.browser_id].entered_message = json.entered_message;
        this.comments_app.setState({
          participants: participants,
        });
        return;
      case "client_disabled_report_typing":
        clearInterval(this.comments_app.state.is_typing_timeout);
        participants = { ...this.comments_app.state.participants };
        participants[json.browser_id].is_typing = false;
        participants[json.browser_id].entered_message = "";
        this.comments_app.setState({
          participants: participants,
        });
        return;
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
          function (comments, browser_id) {
            var participants = { ...comments.comments_app.state.participants };
            if (participants[browser_id] !== undefined) {
              participants[browser_id].just_wrote_a_message = false;
              comments.comments_app.setState({ participants: participants });
            }
          },
          5000,
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
            comments: [...this.comments_app.state.comments, json.comment],
          });
        }
        comment.ref.current.scrollIntoView({
          block: "end",
          behavior: "smooth",
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

  handle_client_joined(comments_app, json) {
    var participants = { ...comments_app.state.participants };
    participants[json.browser_id] = {}; // still has no name
    comments_app.setState({
      participants: participants,
    });
    showNotification(
      "Comments Room: " + global.title,
      "Client joined: " + json.browser_id,
      "new_client.mp3"
    );
    return participants;
  }

  ws_send_user_changed_name(name) {
    this.ws.send(JSON.stringify({ op: "client_changed_name", name: name }));
    //alert("name changed to: " + name);
  }

  render() {
    var me_participating_style = {
      backgroundColor: "chocolate",
    };
    var my_name = this.props.main_app.state.my_name;
    if (my_name !== "") {
      me_participating_style.backgroundColor = "white";
      me_participating_style.padding = 0;
    }
    var input_style = {
      borderRadius: "0.3rem",
      paddingLeft: "6px",
    };
    if (my_name !== "") {
      input_style.backgroundColor = "pink";
    }
    var participants_keys = Object.keys(this.state.participants);

    return (
      <React.Fragment>
        <table className="App-header">
          <tr>
            <td>
              <img
                src={
                  this.state.status_txt == "Connected" ? logo_blue : logo_red
                }
                className={
                  this.state.loading || this.state.status_txt == "Connecting..."
                    ? "App-logo Spin"
                    : "App-logo"
                }
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
                <tr align="left">
                  <td>
                    <span>
                      <span className="badge badge-success">
                        {this.state.comments.length}
                      </span>{" "}
                      Comment{this.state.comments.length !== 1 ? "s" : ""}
                    </span>{" "}
                    <span style={{ color: "black" }}>
                      status:{" "}
                      <span
                        style={{
                          color: this.state.status_color,
                          fontWeight: "bold",
                        }}
                      >
                        {this.state.status_txt}
                      </span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div
          className="participants_div_style"
          style={{ padding: "0 2px 0 2px" }}
        >
          {participants_keys.length === 0 ? (
            <span style={{ marginLeft: "4px" }}>
              <b>No Other Online Participants</b>
            </span>
          ) : (
            <span style={{ marginLeft: "4px" }}>
              <b>
                {participants_keys.length} Participant
                {participants_keys.length != 1 ? "s" : ""}:{" "}
              </b>
              {participants_keys.map(function (browser_id) {
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
                    {participant.name !== undefined &&
                    participant.name.trim() != ""
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
        {my_name == undefined || my_name.trim() == "" ? (
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
