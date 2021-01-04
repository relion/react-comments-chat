import Avatar from "react-avatar";
import styled, { css } from "styled-components";
import React, { Component } from "react";
import { Button } from "reactstrap";
import EdiText from "react-editext";
const reactStringReplace = require("react-string-replace");
const dateFormat = require("dateformat");
var parse = require("html-react-parser");

const StyledEdiText = styled(EdiText)`
  button,
  input {
    margin-right: 5px;
  }
  .my-react-header {
    font-size: 1.2em;
    border: 1.5px solid #6cdaf7;
    padding: 5px;
    border-radius: 5px;
    background-color: #1f2229;
    color: #6cdaf7;
    margin-right: 10px;
  }
`;

export default class Comment extends Component {
  onClickDelete(e) {
    this.comment.props.comments_app.deleteComment(this.comment.props.comment);
  }

  onEditSave(new_val, comment) {
    comment.props.comments_app.editSaveComment(new_val, comment.props.comment);
  }

  render() {
    const { name, message, time, _id, user_ip } = this.props.comment;
    var date_str = dateFormat(time, "dd-mmm-yyyy");
    var time_str = dateFormat(time, "H:MM"); // :ss
    var message_with_br = reactStringReplace(
      message,
      "\n",
      (match, i) => "<br />"
    );
    var is_owner =
      name === this.props.comments_app.props.main_app.state.my_name;
    var is_editable =
      is_owner && this.props.comments_app.props.main_app.state.edit_mode;
    var participants = this.props.comments_app.state.participants;
    var div_container_style = {};
    for (var participant in participants) {
      if (participants[participant].name === name) {
        div_container_style = { borderWidth: "4px", borderStyle: "dashed" };
        break;
      }
    }
    var is_message_rtl = false;
    var matches = message.match(/[א-ת\w]/);
    if (matches != null) {
      var char_ascii = matches[0].charCodeAt(0);
      is_message_rtl = char_ascii >= 1488 && char_ascii <= 1514; // between א to ת.
    }
    var direction = is_message_rtl ? "rtl" : "ltr";
    return (
      <div
        ref={this.props.ref_id}
        className="media mb-1"
        style={div_container_style}
        disabled={this.props.comments_app.state.status_txt != "Connected"}
      >
        <div className="row">
          <div className="col-sm-3 mr-2">
            <Avatar
              name /* googleId, facebookId */={name.toLowerCase()}
              size="48"
              alt={name}
            />
          </div>
        </div>
        {/* {user_ip != null && (
          <div className="row">
            <div className="col-sm-5 pl-2">
              <img
                width="48"
                height="48"
                src={`http://api.hostip.info/flag.php?ip=${user_ip}`}
                style={{ padding: 10 + "px", margin: 0 }}
              ></img>
            </div>
          </div>
        )} */}
        <div className="media-body p-2 shadow-sm rounded bg-light border">
          <small className="float-right text-muted">
            {date_str}{" "}
            <span style={{ fontSize: "smaller", fontStyle: "lighter" }}>
              {time_str}
            </span>{" "}
            <span style={{ fontStyle: "italic", fontWeight: "bold" }}>
              ({this.props.comment.formatted_since})
            </span>
          </small>
          <h6 className="mt-0 mb-1 text-muted">{name}</h6>
          {is_editable ? (
            <Button
              className="btn btn-dark float-right"
              comment={this}
              onClick={this.onClickDelete}
            >
              Delete
            </Button>
          ) : (
            ""
          )}
          {is_editable ? (
            <StyledEdiText
              type="text" // textarea
              viewProps={{
                className: "my-react-header",
                style: { borderRadius: 3, direction: direction },
              }}
              buttonsAlign="before"
              value={message}
              onSave={(val) => this.onEditSave(val, this)}
            />
          ) : (
            <div style={{ direction: direction }}>
              {parse(
                message
                  .replace(/\*([^\*]+)\*/, "<b>$1</b>")
                  .replace(
                    /(^|\s)((https?:\/\/)?[\w]+\.[\w]+(\.[\w]+|\/)[^\s]+)(\s|$)/i,
                    "$1<a href='$2' target='_blank'>$2</a>$5"
                  )
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
