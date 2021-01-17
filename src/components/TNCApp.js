import React, { Component } from "react";
//import "bootstrap/dist/css/bootstrap.css";
import "./TNC.css";
import handle_win_title from "./global.js";
import WSUtils from "./WebSocketsUtils.js";

class TNCApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      verses: [],
      search_str: "my and to",
      max_distance: 3,
      min_words: 2,
      stop_less_words: true,
      stop_more_distance: false,
    };
    handle_win_title();
    this.onSubmit = this.onSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  ws_utils = new WSUtils(this, "/TNC/");

  componentDidMount() {
    this.ws_utils.connect_ws(this.ws_utils);
  }

  do_on_connect(json_browser_id) {
    fetch(
      global.server_url +
        "?" +
        "title=Proximity_Search" +
        "&op=first_request" +
        "&browser_id=" +
        json_browser_id,
      {
        method: "post",
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  onSubmit(e) {
    console.log("in onSubmit.");
    e.preventDefault();
    this.do_query(
      this.state.search_str
        .split(" ")
        .map(function (word) {
          return word.trim();
        })
        .filter((word) => word.length > 0), // clean spaces.
      this.state.max_distance,
      this.state.min_words,
      this.state.stop_less_words,
      this.state.stop_more_distance
    );
  }

  do_query(
    words,
    max_distance,
    min_words,
    stop_less_words,
    stop_more_distance
  ) {
    this.setState({
      status_txt: "Searching",
      verses: [],
    });
    var tnc_app = this;
    var start_time_ms = new Date().getTime();
    fetch(
      global.server_url +
        "?" +
        "title=Proximity_Search" +
        "&op=get_verses" +
        "&browser_id=" +
        this.state.browser_id,
      {
        method: "post",
        headers: { "Content-Type": "text/html" },
        body: JSON.stringify({
          words: words,
          max_distance: max_distance,
          min_words: min_words,
          stop_less_words: stop_less_words,
          stop_more_distance: stop_more_distance,
        }),
      }
    )
      .then((res) => res.json())
      .then((res) => {
        if (res.error) {
          tnc_app.setState({ status_txt: "error", error: res.error });
        } else {
          tnc_app.setState({
            status_txt: "got_results",
            verses: res,
            run_time_sec:
              Math.floor((new Date().getTime() - start_time_ms) / 100) / 10,
            loading: false,
          });
          // add time return from api and push comment to parent state
          // my_comment._id = res._id;
          // my_comment.time = res.time;
          // my_comment.user_ip = res.user_ip;
          // this.props.addComment(my_comment);
          // //
          // this.setState({ loading: false });
          // // clear the message box
          // this.props.comments_app.setState({
          //   my_comment_message: ""
          // });
          // my_comment.ref.current.scrollIntoView({
          //   block: "end",
          //   behavior: "smooth"
          // });
        }
      })
      .catch((err) => {
        this.setState({ status_txt: "error", error: err.message });
      });
  }

  handleInputChange(event) {
    const target = event.target;
    const name = target.name;
    switch (name) {
      case "search_str":
      case "max_distance":
      case "min_words":
        this.setState({ [name]: event.target.value });
        break;
      case "stop_less_words":
      case "stop_more_distance":
        this.setState({ [name]: event.target.checked });
        break;
      default:
        throw "unhandled: " + target.name;
    }
  }

  x9 = { "Connected": "green" };

  render() {
    return (
      <React.Fragment>
        <form method="post" onSubmit={this.onSubmit}>
          <div style={{ padding: "5px", backgroundColor: "#bae7c2" }}>
            <input
              name="search_str"
              type="text"
              value={this.state.search_str}
              onChange={this.handleInputChange}
            />{" "}
            <button style={{ backgroundColor: "limegreen" }}>Search</button>{" "}
            Min. Words:{" "}
            <input
              name="min_words"
              type="text"
              value={this.state.min_words}
              size="1"
              onChange={this.handleInputChange}
            />{" "}
            Max. Distance:{" "}
            <input
              name="max_distance"
              type="text"
              value={this.state.max_distance}
              size="1"
              onChange={this.handleInputChange}
            />
            <br />
            If found don't check less words:{" "}
            <input
              name="stop_less_words"
              type="checkbox"
              checked={this.state.stop_less_words}
              onChange={this.handleInputChange}
            />{" "}
            If found don't increase distance:{" "}
            <input
              name="stop_more_distance"
              type="checkbox"
              checked={this.state.stop_more_distance}
              onChange={this.handleInputChange}
            />
            {/* <div style={{ marginTop: "5px" }}>
              Html Doc Path:
              <input
                type="text"
                id="doc_path"
                style={{ width: 300 }}
                value="TNC_B1_eng.html"
              />
              XPath:
              <select id="xpath_str">
                <option value="//*">All</option>
                <option value="//span[@class = 'v']">TNC</option>
                <option value="//a[contains(@href, '#')]/span[contains(@style, 'mso-bookmark:')]/span">
                  Yishay
                </option>
              </select>
            </div> */}
            <div style={{ margin: "8px 4px 4px 0" }}>
              {this.state.status_txt !== "error" ? (
                <span
                  style={{
                    background: this.state.status_color,
                    padding: "4px",
                  }}
                >
                  {this.state.status_txt === "got_results" ? (
                    <span>
                      <b>Found: {this.state.verses.length} verses</b> runtime:{" "}
                      {this.state.run_time_sec} seconds
                    </span>
                  ) : (
                    this.state.status_txt
                  )}
                </span>
              ) : (
                <span style={{ background: "red", padding: "4px" }}>
                  {this.state.error}
                </span>
              )}
            </div>
          </div>
        </form>
        <div
          style={{
            maxHeight: "100%",
            overflow: "auto",
            display: "block",
            background: "#fffeca",
            padding: "2px 4px 0 4px",
            marginTop: "0",
            marginBottom: "4px",
          }}
        >
          {this.state.verses.map((verse, index) => {
            var key = verse.b + 1 + " " + (verse.c + 1) + " " + (verse.v + 1);
            return (
              <div key={key} style={{ margin: "4px 0 4px 0" }}>
                <span
                  style={{
                    color: "blue",
                    fontWeight: "bold",
                    fontSize: "smaller",
                  }}
                >
                  {key}
                </span>{" "}
                <span
                  style={{ fontWeight: "bold" }}
                  dangerouslySetInnerHTML={{ __html: verse.marked }}
                />
              </div>
            );
          })}
        </div>
      </React.Fragment>
    );
  }
}

export default TNCApp;
