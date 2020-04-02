import React, { Component } from "react";
import "bootstrap/dist/css/bootstrap.css";
import "./CommentsApp.css";
import "./global.js";
//import Websocket from "react-websocket";
import queryString from "query-string";
import AutosizeInput from "react-input-autosize";
import cookie from "react-cookies";

import Comments from "./Comments";

import ReactDOM from "react-dom";

class CommentsApp extends Component {
  constructor(props) {
    super(props);
    // props.main_app = this;
    this.state = {
      //comments: [],
      //participants: {},
      //loading: false,
      show_permit_button: false,
      my_name: undefined
      //my_comment_message: ""
    };
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
      my_name: name
    });
    this.check_playAudio();
  }

  handle_name_field_changed = event => {
    const { value, name } = event.target;
    if (name === "name") {
      // reset the timer, therefor only 5 seconds after the last key is pressed the name is published for each comments room to all it's participants.
      // todo: avoid sending unneccary repeating name_changed notification.
      if (this.state.name_changed_timer !== undefined) {
        clearInterval(this.state.name_changed_timer);
      }
      this.setState({
        name_changed_timer: setTimeout(
          app_main => {
            for (var ref in app_main.refs) {
              if (ref.startsWith("CommentsApp_")) {
                app_main.refs[ref].ws_send_user_changed_name(value);
              }
            }
          },
          4000,
          this
        )
      });
    } else {
      throw "unrecognized name: " + name;
    }
    //
    this.setState({ my_name: value });
    cookie.save("my_name", value, { path: "/" });
  };

  handleUserPermitClick() {
    new Audio("/audio/chimes.mp3").play();
    this.setState({ show_permit_button: false });
  }

  check_playAudio() {
    try {
      var audio = new Audio("/audio/chimes.mp3");
      audio.t = this;
      audio.onerror = function() {
        this.t.setState({ show_permit_button: true });
        console.log("Can't play audio");
      };
      audio.play();
      console.log("Can play audio");
    } catch (e) {
      this.t.setState({ show_permit_button: true });
      console.log("Can't play audio");
    }
  }

  render() {
    return (
      <div className="App d-flex flex-column h-100 container bg-light shadow">
        {this.state.show_permit_button ? (
          <button onClick={this.handleUserPermitClick.bind(this)}>
            click here to anable Audio Notifications from this page
          </button>
        ) : (
          ""
        )}
        {this.state.pre_set_name ? (
          <span style={{ marginLeft: "4px" }}>
            <b>Hi {this.state.my_name}, </b>
          </span>
        ) : (
          <div
            style={{
              borderRadius: "5px",
              margin: "0 2px 0 2px",
              display: "inline-block"
            }}
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
              placeholder="👤 Please Enter Your Name"
              name="name"
              type="text"
              value={this.state.my_name}
              style={{
                border: "3px solid lightcoral",
                borderRadius: "0.3rem",
                padding: "0",
                margin: "4px 0"
              }}
            />
          </div>
        )}
        <Comments
          main_app={this}
          ref={"CommentsApp_" + React.createRef()}
        ></Comments>
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
