import React, { Component } from "react";

class EnableAudio extends Component {
  constructor(props) {
    super(props);
    this.state = {
      show_permit_button: true,
      txt_bg_color: "green",
    };
  }

  componentDidMount() {
    setTimeout(this.blinking_timer, 1000, this);
  }

  blinking_timer(app) {
    if (app.state.show_permit_button) {
      app.setState({
        txt_bg_color: app.state.txt_bg_color == "green" ? "orange" : "green",
      });
      setTimeout(app.blinking_timer, 1000, app);
    }
  }

  handleUserPermitClick() {
    this.props.main_app.Notifications.check_playAudio(this);
  }

  render() {
    return this.state.show_permit_button ? (
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
    );
  }
}

export default EnableAudio;
