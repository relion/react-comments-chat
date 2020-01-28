import React, { Component } from "react";
import "../global.js";

export default class CommentForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      error: "",

      comment: {
        name: "",
        message: ""
      }
    };

    // bind context to methods
    this.handleFieldChange = this.handleFieldChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  ws_send_user_changed_name(name) {
    //alert("name changed to: " + name);
  }

  /**
   * Handle form input field changes & update the state
   */
  handleFieldChange = event => {
    const { value, name } = event.target;
    if (name !== "name") {
      throw "unexpected: name = " + name;
    }

    if (name === "name") {
      this.props.comments_app.setState({ form_name: value });
      if (this.props.comments_app.state.timer != undefined) {
        clearInterval(this.props.comments_app.state.timer);
      }
      this.props.comments_app.state.timer = setInterval(
        function(c) {
          if (c.state.last_sent_user_name != value) {
            c.ws_send_user_changed_name(value);
            c.state.last_sent_user_name = value;
          }
        },
        5000,
        this
      );
    }
    var new_state = { ...this.state };
    new_state.comment[name] = value;
    this.setState(new_state);
    //this.state.comment.form_name = value;
    //this.setState(this.state);

    // this.setState({
    //   ...this.state,
    //   comment: {
    //     ...this.state.comment,
    //     [name]: value
    //   }
    // });
  };

  /**
   * Form submit handler
   */
  onSubmit(e) {
    // prevent default form submission
    e.preventDefault();

    if (!this.isFormValid()) {
      this.setState({ error: "All fields are required." });
      return;
    }

    // loading status and clear error
    this.setState({ error: "", loading: true });

    // persist the comments on server
    let { comment } = this.state;
    fetch(
      global.server_url +
        "?" +
        window.location.title_arg +
        "op=comment_write" +
        "&browser_id=" +
        this.props.browser_id,
      {
        method: "post",
        headers: { "Content-Type": "text/html" },
        body: JSON.stringify(comment)
      }
    )
      .then(res => res.json())
      .then(res => {
        if (res.error) {
          this.setState({ loading: false, error: res.error });
        } else {
          // add time return from api and push comment to parent state
          comment._id = res._id;
          comment.time = res.time;
          comment.user_ip = res.user_ip;
          this.props.addComment(comment);

          // clear the message box
          this.setState({
            loading: false,
            comment: { ...comment, message: "" }
          });
        }
      })
      .catch(err => {
        this.setState({
          error: "Something went wrong while submitting form.",
          loading: false
        });
      });
  }

  /**
   * Simple validation
   */
  isFormValid() {
    return (
      this.state.comment.form_name !== "" && this.state.comment.message !== ""
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
          <div className="form-group">
            <input
              onChange={this.handleFieldChange}
              value={this.state.comment.form_name}
              className="form-control"
              placeholder="👤 Your Name"
              name="name"
              type="text"
            />
          </div>

          <div className="form-group">
            <textarea
              onChange={this.handleFieldChange}
              value={this.state.comment.message}
              className="form-control"
              placeholder="♥️ Your Comment"
              name="message"
              rows="5"
            />
          </div>

          {this.renderError()}

          <div className="form-group">
            <button disabled={this.state.loading} className="btn btn-primary">
              Comment &#10148;
            </button>
          </div>
        </form>
      </React.Fragment>
    );
  }
}
