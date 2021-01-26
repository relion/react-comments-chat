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
      txt_bg_color: "green",
    };
  }

  ws_utils = new WSUtils(this, "/Monitor/");

  componentDidMount() {
    this.ws_utils.connect_ws(this.ws_utils);
    this.playAudio = new PlayAudio(this);
    this.playAudio.app = this;
    this.playAudio.check_playAudio();
    this.playAudio.get_notifications_permission();
    setInterval(this.blinking_timer, 1000, this);
  }

  do_on_connect() {}

  handleUserPermitClick(event) {
    this.playAudio.check_playAudio();
  }

  blinking_timer(app) {
    app.setState({
      txt_bg_color: app.state.txt_bg_color == "green" ? "orange" : "green",
    });
  }

  render() {
    return (
      <React.Fragment>
        {this.state.show_permit_button ? (
          <button onClick={this.handleUserPermitClick.bind(this)}>
            Enable
            <b style={{ background: this.state.txt_bg_color }}>
              {" "}
              Audio Notifications{" "}
            </b>
            from this page
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
