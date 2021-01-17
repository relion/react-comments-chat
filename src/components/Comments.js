import React, { Component } from "react";
import logo_blue from "../images/logo-blue.svg";
import logo_red from "../images/logo-red.svg";
import edit_image from "../images/edit.gif";
import "bootstrap/dist/css/bootstrap.css";
import handle_win_title from "./global.js";

import CommentList from "./CommentList";
import CommentForm from "./CommentForm";
import WSUtils from "./WebSocketsUtils.js";

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

  ws_utils = new WSUtils(this, "/Comments/");

  componentDidMount() {
    this.ws_utils.connect_ws(this.ws_utils);
    // preload images:
    [logo_red].forEach((image) => {
      new Image().src = image;
    });
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

  handle_client_joined(comments_app, json) {
    var participants = { ...comments_app.state.participants };
    participants[json.browser_id] = {}; // still has no name
    comments_app.setState({
      participants: participants,
    });
    this.ws_utils.showNotification(
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

  do_on_connect() {
    fetch(
      global.server_url +
        "?" +
        window.location.title_arg +
        "op=get_all_comments" +
        "&browser_id=" +
        this.state.browser_id +
        "&name=" +
        this.props.main_app.state.my_name
    )
      .then((res) => res.json())
      .then((res) => {
        // console.log("my browser_id is: " + res.browser_id);

        // res.comments.forEach((c) => {
        // });
        for (var i = 0; i < res.comments.length; i++) {
          var c = res.comments[i];
          c.ref = React.createRef();
          c.formatted_since = this.props.main_app.get_time_since_now_formatted(
            c.time
          );
        }
        this.setState({
          comments: res.comments,
          loading: false,
          participants: res.participants,
          // browser_id: res.browser_id
        });

        var my_name = this.props.main_app.state.my_name;
        if (my_name != undefined && my_name.trim() != "") {
          setTimeout(
            () =>
              this.ws.send(
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
        this.setState({ loading: false });
      });
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
    var participants_keys = [];
    if (this.state.participants != undefined) {
      participants_keys = Object.keys(this.state.participants);
    }

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
                      <b>{global.title.replace(/_/g, " ")}</b>
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
            primary_app={this}
          />
        </div>
        {my_name == undefined || my_name.trim() == "" ? (
          ""
        ) : (
          <div className="my_comment_form_style" style={{ flex: "none" }}>
            <CommentForm
              addComment={this.addComment}
              primary_app={this}
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
