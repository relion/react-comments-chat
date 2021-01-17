import React, { Component } from "react";

class WSUtils {
  constructor(app, app_str) {
    this.app = app;
    this.app_str = app_str;
  }

  connect_ws(ws_obj) {
    ws_obj.app.setState({
      status_txt: "Connecting...",
      status_color: "limegreen",
    });
    ws_obj.app.ws = new WebSocket(
      "ws://" + global.host + ":" + global.ws_port + ws_obj.app_str
    );
    console.log("opening WebSocket on port:" + global.ws_port);
    ws_obj.app.ws.primary_app = ws_obj.app;
    ws_obj.app.ws.onmessage = ws_obj.handleWebsocketReceivedData.bind(ws_obj);
    ws_obj.app.ws.onopen = ws_obj.handleWebsocketEvent.bind(ws_obj);
    ws_obj.app.ws.onclose = ws_obj.handleWebsocketEvent.bind(ws_obj);
    ws_obj.app.ws.onerror = ws_obj.handleWebsocketEvent.bind(ws_obj);
  }

  handleWebsocketReceivedData(msg) {
    console.log("in handleWebsocketReceivedData");
    var json = JSON.parse(msg.data);
    var username = null;
    switch (json.op) {
      case "ws_connected":
        this.app.setState({
          loading: true,
          browser_id: json.browser_id,
          status: "Connected",
        });
        this.app.do_on_connect(json.browser_id);
        return;
      case "client_joined":
        this.app.handle_client_joined(this.app, json);
        return;
      case "client_left":
        console.log("client_left: " + json.browser_id);
        var participants = { ...this.app.state.participants };
        if (participants[json.browser_id] == undefined) return;
        var name = participants[json.browser_id].name;
        delete participants[json.browser_id];
        this.app.setState({
          participants: participants,
        });
        this.showNotification(
          "Comments Room: " + global.title,
          "Client left: " + (name !== undefined ? name : json.browser_id),
          "client_left.mp3"
        );
        return;
      case "client_changed_name":
        if (this.app.state.participants[json.browser_id] != null) {
          participants = { ...this.app.state.participants };
        } else {
          participants = this.app.handle_client_joined(this.app, json);
          participants[json.browser_id] = {};
        }
        participants[json.browser_id].name = json.name;
        this.app.setState({
          participants: participants,
        });
        //
        this.showNotification(
          "Comments Room: " + global.title,
          "Client changed his name to: " + json.name,
          "new_client.mp3"
        );
        return;
      case "client_message_entered_changed":
        if (this.app.state.is_typing_timeout !== undefined) {
          clearInterval(this.app.state.is_typing_timeout);
        }
        //
        participants = { ...this.app.state.participants };
        participants[json.browser_id].is_typing = true;
        participants[json.browser_id].entered_message = json.entered_message;
        this.app.setState({
          participants: participants,
        });
        // note: unccery because should recieve mesage: client_message_entered_ceased, ut anyway:
        this.app.state.is_typing_timeout = setTimeout(
          function (comments) {
            participants = { ...comments.app.state.participants };
            participants[json.browser_id].is_typing = false;
            comments.app.setState({
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
        clearInterval(this.app.state.is_typing_timeout);
        participants = { ...this.app.state.participants };
        participants[json.browser_id].is_typing = false;
        participants[json.browser_id].entered_message = json.entered_message;
        this.app.setState({
          participants: participants,
        });
        return;
      case "client_disabled_report_typing":
        clearInterval(this.app.state.is_typing_timeout);
        participants = { ...this.app.state.participants };
        participants[json.browser_id].is_typing = false;
        participants[json.browser_id].entered_message = "";
        this.app.setState({
          participants: participants,
        });
        return;
      case "comment_added":
      case "comment_updated":
        participants = { ...this.app.state.participants };
        var participant = participants[json.browser_id];
        participant.just_wrote_a_message = true;
        participant.is_typing = false;
        if (participant.just_wrote_a_message_timer !== undefined) {
          clearInterval(participant.just_wrote_a_message_timer);
        }
        participant.just_wrote_a_message_timer = setInterval(
          function (comments, browser_id) {
            var participants = { ...comments.app.state.participants };
            if (participants[browser_id] !== undefined) {
              participants[browser_id].just_wrote_a_message = false;
              comments.app.setState({ participants: participants });
            }
          },
          5000,
          this,
          json.browser_id
        );
        this.app.setState({ participants: participants });
        //
        var comments = [...this.app.state.comments];
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
            this.app.setState({ comments: comments });
            break;
          }
        }
        if (!found) {
          comment = json.comment;
          comment.ref = React.createRef();
          this.app.setState({
            comments: [...this.app.state.comments, json.comment],
          });
        }
        comment.ref.current.scrollIntoView({
          block: "end",
          behavior: "smooth",
        });
        username = json.comment.name;
        break;
      case "comment_deleted":
        comments = [...this.app.state.comments];
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
          this.app.setState({ comments: comments });
        }
        break;
      case "rooms_status_changed":
        this.app.setState({ rooms_status: JSON.parse(json.rooms_status) });
        this.showNotification(
          "Monitor Room",
          json.op,
          "rooms_status_changed.mp3"
        );
        return;
      default:
        throw "unrecognized json.op: " + json.op;
        break;
    }
    this.showNotification(
      "Comments Room: " + global.title,
      username + " " + json.op,
      "message.mp3"
    );
  }

  handleWebsocketEvent(event) {
    switch (event.type) {
      case "close":
        this.app.setState({
          status_txt: "Disconnected",
          status_color: "lightcoral",
          participants: {},
        });
        setTimeout(this.connect_ws, 4000, this);
        break;
      case "open":
        this.app.setState({
          status_txt: "Connected",
          status_color: "lightskyblue",
        });
        break;
      case "error":
        this.app.setState({
          status_txt: "WS Error!",
          status_color: "lightred",
        });
        break;
      default:
        console.log("Websocket " + event.type + " event.");
        break;
    }
    if (this.app.props.main_app != undefined) {
      this.app.props.main_app.setState({
        status_txt: this.app.state.status_txt,
      });
    }
  }

  showNotification(title, txt, audio) {
    var do_audio = !this.app.state.show_permit_button;
    if (do_audio) {
      new Audio("/audio/" + audio).play();
    }
    new Notification(title, {
      body: txt,
      icon: "/images/WC_Logo.png",
      silent: do_audio,
      //sound: "/audio/" + audio, // get more here: https://www.zedge.net/find/notification
      //vibrate: [200, 100, 200, 100, 200, 100, 200],
    });
    console.log("showNotification done..");
  }
}
export default WSUtils;
