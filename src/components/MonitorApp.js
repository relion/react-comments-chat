import React, { Component } from "react";
import Notifications from "./Notifications.js";
import EnableAudio from "./EnableAudio.js";
//import Comments from "./Comments.js";
//import handle_win_title from "./global.js";
import WSUtils from "./WebSocketsUtils.js";

class MonitorApp extends Component {
  constructor(props) {
    super(props);
    this.enable_audio_ref = React.createRef();
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
    this.Notifications = new Notifications(this);
    this.Notifications.app = this;
    this.Notifications.check_playAudio(this.enable_audio_ref.current);
    this.Notifications.get_notifications_permission();
  }

  do_on_connect() {}

  render() {
    return (
      <React.Fragment>
        <EnableAudio ref={this.enable_audio_ref} main_app={this} />
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
