import React, { Component } from "react";
import "./global.js";
import Comments from "./Comments.js";

export default class CommentForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      error: "",
    };

    // bind context to methods
    this.handle_message_field_changed = this.handle_message_field_changed.bind(
      this
    );
    this.onSubmit = this.onSubmit.bind(this);
  }

  /**
   * Handle form input field changes & update the state
   */

  do_my_comment_ceased_message(CommentForm_app, comments_app) {
    console.log("in do_my_comment_ceased_message.");
    clearInterval(
      CommentForm_app.state.last_time_sent_message_changed_timeout_function
    );
    //
    var op = "client_message_entered_ceased";
    var entered_message = comments_app.state.my_comment_message;
    comments_app.ws.send(
      JSON.stringify({
        op: op,
        entered_message: entered_message,
      })
    );
    console.log("ws.send op: " + op + " entered_message: " + entered_message);
  }

  handle_message_field_changed = (event) => {
    console.log("in handle_message_field_changed.");
    const { value, name } = event.target;
    this.props.comments_app.setState({
      my_comment_message: value,
    });
    if (name === "message") {
      var state = this.props.comments_app.state;
      if (!this.props.comments_app.props.main_app.state.report_typing) {
        return;
      }
      var current_time = new Date().getTime();
      clearInterval(
        this.props.comments_app.state
          .last_time_sent_message_changed_timeout_function
      );
      if (
        state.last_time_sent_message_changed === undefined ||
        state.last_time_sent_message_changed < current_time - 2000
      ) {
        this.props.comments_app.setState({
          last_time_sent_message_changed: current_time,
        });
        var op = "client_message_entered_changed";
        var entered_message = value;
        this.props.comments_app.ws.send(
          JSON.stringify({
            op: op,
            entered_message: entered_message,
          })
        );
        console.log(
          "ws.send op: " + op + " entered_message: " + entered_message
        );
        //
      }
      //
      this.props.comments_app.state.last_time_sent_message_changed_timeout_function = setTimeout(
        function (form_app) {
          if (!form_app.props.comments_app.state.report_typing) {
            return;
          }
          console.log("in last_time_sent_message_changed_timeout_function !!!");
          form_app.do_my_comment_ceased_message(
            form_app,
            form_app.props.comments_app
          );
        },
        value != "" ? 4000 : 1000,
        this
      );
      // this.do_my_comment_ceased_message(this, this.props.comments_app);
      // //
    } else {
      throw "unrecognized name: " + name;
    }
  };

  /**
   * Form submit handler
   */
  onSubmit(e) {
    console.log("in onSubmit.");
    // prevent default form submission
    e.preventDefault();

    if (!this.isFormValid()) {
      this.setState({ error: "All fields are required." });
      return;
    }

    // loading status and clear error
    this.setState({ error: "", loading: true });

    // persist the comments on server
    let my_comment = {
      name: this.props.comments_app.props.main_app.state.my_name,
      message: this.props.comments_app.state.my_comment_message,
      ref: undefined,
    };
    fetch(
      global.server_url +
        "?" +
        window.location.title_arg +
        "op=comment_added" +
        "&browser_id=" +
        this.props.browser_id,
      {
        method: "post",
        headers: { "Content-Type": "text/html" },
        body: JSON.stringify(my_comment),
      }
    )
      .then((res) => res.json())
      .then((res) => {
        if (res.error) {
          this.setState({ loading: false, error: res.error });
        } else {
          // add time return from api and push comment to parent state
          my_comment._id = res._id;
          my_comment.time = res.time;
          my_comment.user_ip = res.user_ip;
          this.props.addComment(my_comment);
          //
          this.setState({ loading: false });
          // clear the message box
          this.props.comments_app.setState({
            my_comment_message: "",
          });
          this.do_my_comment_ceased_message(this, this.props.comments_app);
          //
          my_comment.ref.current.scrollIntoView({
            block: "end",
            behavior: "smooth",
          });
        }
      })
      .catch((err) => {
        this.setState({
          error: "Something went wrong while submitting form.",
          loading: false,
        });
      });
  }

  /**
   * Simple validation
   */
  isFormValid() {
    return (
      this.props.comments_app.props.main_app.state.my_name !== "" &&
      this.props.comments_app.state.my_comment_message !== ""
    );
  }

  renderError() {
    return this.state.error ? (
      <div className="alert alert-danger">{this.state.error}</div>
    ) : null;
  }

  render() {
    return (
      <React.Fragment>
        {/* <h5 className="text-muted mb-3">
          chars{" "}
          {this.state.comment.name.length + this.state.comment.message.length}
        </h5> */}
        <form method="post" onSubmit={this.onSubmit}>
          <div className="d-flex flex-row">
            <input
              className=""
              value={this.props.comments_app.state.my_comment_message}
              onChange={this.handle_message_field_changed}
              style={{
                margin: 0,
                borderRadius: "0.3rem",
                width: "100%",
                paddingLeft: "6px",
              }}
              placeholder="♥️ Your Comment"
              name="message"
            />
            <button
              style={{ marginLeft: "8px", padding: "0 5px 0 6px" }}
              className="btn btn-primary"
              disabled={this.state.loading}
            >
              &#10148;
            </button>
          </div>
          {this.renderError()}
        </form>
      </React.Fragment>
    );
  }
}
