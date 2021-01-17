import React, { Component } from "react";
import PlayAudio from "./PlayAudio.js";
import Comments from "./Comments.js";
import handle_win_title from "./global.js";
import WSUtils from "./WebSocketsUtils.js";

class MonitorApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "connecting",
      rooms_status: {},
      show_permit_button: true,
    };
  }

  ws_utils = new WSUtils(this, "/Monitor/");

  componentDidMount() {
    this.ws_utils.connect_ws(this.ws_utils);
    this.playAudio = new PlayAudio(this);
    this.playAudio.check_playAudio();
    this.playAudio.get_notifications_permission();
  }

  do_on_connect() {}

  handleUserPermitClick(event) {
    var a = new Audio("/audio/" + "chimes.mp3");
    var playPromise = a.play();
    if (playPromise !== undefined) {
      playPromise
        .then(function () {
          // Automatic playback started!
        })
        .catch(function (error) {
          // Automatic playback failed.
          // Show a UI element to let the user manually start playback.
          console.log(
            "EEEEEEEEERRRRRRRRRRRRRRROOOOOOOOOOOOOOOOOORRRRRRRRRRRRRRRRRRR"
          );
        });
    }
    //this.playAudio.handleUserPermitClick();
    this.setState({ show_permit_button: false });
  }

  render() {
    return (
      <React.Fragment>
        {this.state.show_permit_button ? (
          <button onClick={this.handleUserPermitClick.bind(this)}>
            click here to anable Audio Notifications from this page
          </button>
        ) : (
          ""
        )}

        <div style={{ color: "black" }}>
          status:{" "}
          <span
            style={{
              background: this.state.status_color,
              padding: "4px",
              fontWeight: "bold",
            }}
          >
            {this.state.status_txt}
          </span>
        </div>
        {Object.keys(this.state.rooms_status).map(
          (room_title, pars) => (
            <div>
              <a
                style={{ cursor: "pointer" }}
                target="_blank"
                href={
                  room_title == "/Monitor/"
                    ? "/Monitor"
                    : room_title == "Proximity_Search"
                    ? "/TNC"
                    : "/Comments?title=" + room_title
                }
              >
                {room_title}
              </a>{" "}
              ({Object.keys(this.state.rooms_status[room_title]).length}){": "}
              {this.state.rooms_status[room_title].map((u, i) => (
                <span>
                  {i === 0 ? "" : " "}
                  <span style={{ background: "pink" }}>
                    {u.name == "" || u.name == undefined ? "unset" : u.name}
                  </span>
                </span>
              ))}
            </div>
          ),
          this
        )}
      </React.Fragment>
    );
  }
}

export default MonitorApp;
