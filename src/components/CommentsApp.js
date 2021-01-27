import React, { Component } from "react";
import Notifications from "./Notifications.js";
import EnableAudio from "./EnableAudio.js";
//import "bootstrap/dist/css/bootstrap.css";
import "./CommentsApp.css";
import "./global.js";
//import Websocket from "react-websocket";
import queryString from "query-string";
import AutosizeInput from "react-input-autosize";
import cookie from "react-cookies";

import Comments from "./Comments";

class CommentsApp extends Component {
  constructor(props) {
    super(props);
    this.enable_audio_ref = React.createRef();
    this.state = {
      //comments: [],
      //participants: {},
      //loading: false,
      //show_permit_button: true,
      my_name: undefined,
      //my_comment_message: ""
      report_typing: true,
      edit_mode: false,
      //txt_bg_color: "green",
    };

    this.handle_report_typing_checkbox_changed = this.handle_report_typing_checkbox_changed.bind(
      this
    );
    this.handle_edit_mode_checkbox_changed = (event) => {
      this.setState({ edit_mode: event.target.checked });
    };
  }

  get_time_since_now_formatted(time) {
    const do_half = 2; // 1
    var passed_time = new Date().getTime() - Date.parse(time);
    var n_seconds_since_now =
      Math.floor(passed_time / 1000 / global.time_sec_jump) *
      global.time_sec_jump;
    var n_minutes_since_now = Math.floor(passed_time / (1000 * 60));
    var n_hours_since_now =
      Math.floor((passed_time / (1000 * 60 * 60)) * do_half) / do_half;
    var n_days_since_now = Math.floor(passed_time / (1000 * 60 * 60 * 24));
    var res = null;
    if (n_days_since_now >= 1) {
      res = n_days_since_now + " days";
    } else if (n_hours_since_now >= 1) {
      res = n_hours_since_now + " hour" + (n_hours_since_now > 1 ? "s" : "");
    } else if (n_minutes_since_now >= 1) {
      res =
        n_minutes_since_now + " minute" + (n_minutes_since_now > 1 ? "s" : "");
    } else if (n_seconds_since_now >= 1) {
      res =
        n_seconds_since_now + " second" + (n_seconds_since_now > 1 ? "s" : "");
    }
    if (res != null) {
      res = "about " + res + " ago";
    } else {
      res = global.formatted_since_just_added;
    }
    return res;
  }

  componentDidMount() {
    var name = "";
    var name_coockie = cookie.load("my_name");
    var name_query = queryString.parse(window.location.search).name;
    if (name_coockie != undefined) {
      name = name_coockie;
    } else if (name == undefined) {
      name = name_query;
      cookie.save("my_name", name_query, { path: "/" });
    }
    this.setState({
      pre_set_name: name_query !== undefined,
      my_name: name,
    });
    this.Notifications = new Notifications(this);
    this.Notifications.app = this;
    this.Notifications.check_playAudio(this.enable_audio_ref.current);
    this.Notifications.get_notifications_permission();
  }

  handle_name_field_changed = (event) => {
    const { value, name } = event.target;
    if (name === "name") {
      // reset the timer, therefor only 5 seconds after the last key is pressed the name is published for each comments room to all it's participants.
      // todo: avoid sending unneccary repeating name_changed notification.
      if (this.state.name_changed_timer !== undefined) {
        clearInterval(this.state.name_changed_timer);
      }
      this.setState({
        name_changed_timer: setTimeout(
          (app_main) => {
            app_main.refs["comments_obj"].ws_send_user_changed_name(value);
          },
          4000,
          this
        ),
      });
    } else {
      throw "unrecognized name: " + name;
    }
    //
    this.setState({ my_name: value });
    cookie.save("my_name", value, { path: "/" });
  };

  handle_report_typing_checkbox_changed(event) {
    var report_typing = event.target.checked;
    this.setState({ report_typing: report_typing });
    for (var ref in this.refs) {
      var comments_obj = this.refs["comments_obj"];
      if (ref.startsWith("CommentsApp_")) {
        var json;
        if (report_typing) {
          json = JSON.stringify({
            op: "client_message_entered_changed",
            entered_message: comments_obj.state.my_comment_message,
          });
        } else {
          json = JSON.stringify({
            op: "client_disabled_report_typing",
          });
        }
        comments_obj.ws.send(json);
      }
    }
  }

  render() {
    return (
      <div className="App d-flex flex-column h-100 container bg-light shadow">
        <EnableAudio ref={this.enable_audio_ref} main_app={this} />
        {this.state.pre_set_name ? (
          <span style={{ marginLeft: "4px" }}>
            <b>Hi {this.state.my_name}, </b>
          </span>
        ) : (
          <div
            style={{
              borderRadius: "5px",
              margin: "0 2px 0 2px",
              display: "inline-block",
            }}
            disabled={this.state.status_txt != "Connected"}
          >
            {this.state.my_name !== "" ? (
              <span style={{ marginLeft: "4px" }}>
                <b>{"Your name: "}</b>
              </span>
            ) : (
              ""
            )}
            <AutosizeInput
              onChange={this.handle_name_field_changed}
              placeholder="👤 Please Enter Your Full Name"
              name="name"
              type="text"
              value={this.state.my_name}
              style={{
                border: "3px solid lightcoral",
                borderRadius: "0.3rem",
                padding: "0",
                margin: "4px 0",
                fontSize: "small",
              }}
            />
            {" Show typing: "}
            <input
              type="checkbox"
              checked={this.state.report_typing}
              onChange={this.handle_report_typing_checkbox_changed}
            />
            {" Edit mode: "}
            <input
              type="checkbox"
              checked={this.state.edit_mode}
              onChange={this.handle_edit_mode_checkbox_changed}
            />
          </div>
        )}
        <Comments main_app={this} ref={"comments_obj"}></Comments>
        {/* <br></br>
        <Comments
          main_app={this}
          ref={"CommentsApp_" + React.createRef()}
        ></Comments> */}
      </div>
    );
  }
}

export default CommentsApp;
