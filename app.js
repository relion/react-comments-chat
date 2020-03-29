const url = require("url");
const express = require("express");
const app = express();
app.set("port", process.env.PORT || 80);
const bodyParser = require("body-parser");
app.use(bodyParser.text({ type: "text/html" }));
const fs = require("fs");
const uuidv1 = require("uuid/v1");

var tnc = require("./tnc.js");

const WebSocket = require("ws");

const ws_port = 3030;
const wss = new WebSocket.Server({ port: ws_port });
console.log("WebSocket.Server connected on port: " + ws_port);

wss.on("error", error => {
  console.log("WebSocket.Server Error.");
});

var ws_by_id = {};
var all_participants = {};

wss.on("connection", function connection(ws, req) {
  var app_name = req.url;
  console.log(
    `got connection from: ${ws._socket.remoteAddress}:${ws._socket.remotePort} ${app_name}`
  );
  var browser_id = uuidv1();
  ws.browser_id = browser_id;
  var ws_connected_json_data = {
    op: "ws_connected",
    browser_id: browser_id
  };
  ws.send(JSON.stringify(ws_connected_json_data));
  ws_by_id[browser_id] = ws;
  all_participants[browser_id] = {};
  ws.on("message", function(msg) {
    var json = JSON.parse(msg);
    switch (json.op) {
      case "client_changed_name":
        all_participants[browser_id].name = json.name;
        broadcast(ws.page_title, ws.browser_id, {
          op: json.op,
          browser_id: ws.browser_id,
          name: json.name
        });
        console.log(
          "got msg from browser_id: " +
            ws.browser_id +
            " title: " +
            ws.page_title +
            " msg.op: " +
            json.op +
            " msg.name: " +
            json.name
        );
        break;
      case "client_message_entered_changed":
      case "client_message_entered_ceased":
        broadcast(ws.page_title, ws.browser_id, {
          op: json.op,
          browser_id: ws.browser_id,
          entered_message: json.entered_message
        });
        break;
      default:
        throw "websocket received an unsupported message op: " + json.op;
    }
  });
  ws.on("close", function() {
    var name = all_participants[ws.browser_id].name;
    console.log(
      "page_title: " +
        ws.page_title +
        " WebSocket Client disconnected: " +
        ws.browser_id +
        (name != undefined ? " (" + name + ") " : "")
    );
    delete ws_by_id[browser_id];
    delete all_participants[browser_id];
    delete browsers_ids_by_title[ws.page_title][browser_id];
    broadcast(ws.page_title, browser_id, {
      op: "client_left",
      _id: browser_id
    });
  });
});

var scheme = require("http"); // later: https

// for https, use listen to port: 443
// var privateKey = fs.readFileSync('privatekey.pem').toString();
// var certificate = fs.readFileSync('certificate.pem').toString();

scheme
  .createServer(
    {
      key: "",
      cert: ""
    },
    app
  )
  .listen(app.get("port"), () => {
    console.log("Server running at: http://localhost" + `:${app.get("port")}/`);
  });

function broadcast(page_title, by_browser_id, data) {
  console.log("in broadcast..");
  var bids = browsers_ids_by_title[page_title];
  for (id in bids) {
    var ws = ws_by_id[id];
    if (id != undefined && id != by_browser_id) {
      // lilo
      if (
        ws != undefined &&
        ws.readyState === 1 &&
        ws.page_title == page_title
      ) {
        console.log("broadcasting to..");
        ws.send(JSON.stringify(data)); // '{ "_id": -1, "message": "Hello World2" }'
      }
    }
  }
}

app.get("*", function(req, res, next) {
  if (req.path == "/comments/" || req.path == "/comments/index.html") {
    const filePath = process.cwd() + "/src/comments/index.html"; // where the <div id="root"> is.
    var data = fs.readFileSync(filePath, "utf8");
    var result = data.replace(
      /\$OG_TITLE/g,
      req.query.title + " Comments Room"
    );
    result = result.replace(/\$OG_DESCRIPTION/g, "Please click this Link");
    result = result.replace(
      /\$OG_IMAGE/g,
      "http://www.thevcard.net/DATA/VCard_Logo.png"
    );
    res.send(result);
    res.end();
    return;
  }
  next();
});

// usefull for running React Debugger in port 3000 to access the running Node.js:
// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

app.use("/", express.static("src"));

app.post("/handle_comments", (req, res) => {
  handle_request(req, res);
});

app.get("/handle_comments", (req, res) => {
  handle_request(req, res);
});

var browsers_ids_by_title = {};

function handle_request(req, res) {
  var dir = "/DATA/";
  var op = req.query.op;
  var page_title = req.query.title;
  var browser_id = req.query.browser_id;
  var comment_file =
    process.cwd() +
    dir +
    (page_title != null ? page_title + "_" : "") +
    "comment.json";

  if (op == "comment_added") {
    var comment_json = JSON.parse(req.body);
    comment_json._id = uuidv1();
    comment_json.time = new Date().toUTCString();
    comment_json.user_ip = req.headers.host;
    comment_json.browser_id = browser_id;
    //
    broadcast(page_title, browser_id, {
      op: op,
      browser_id: browser_id,
      comment: comment_json
    });
    //
    var data = fs.readFileSync(comment_file);
    var comments_json_ar = JSON.parse(data);
    comments_json_ar.push(comment_json);
    fs.writeFileSync(comment_file, JSON.stringify(comments_json_ar));
    res.write(JSON.stringify(comment_json));
  } else if (op == "get_all_comments") {
    handle_first_request(req);
    broadcast(page_title, browser_id, {
      op: "client_joined",
      _id: browser_id
    });

    var comments_json;
    if (fs.existsSync(comment_file)) {
      comments_json = JSON.parse(fs.readFileSync(comment_file));
    } else {
      fs.writeFileSync(comment_file, "[]");
      comments_json = [];
    }
    var participants = {};
    for (var _browser_id in browsers_ids_by_title[page_title]) {
      if (_browser_id == browser_id) continue;
      participants[_browser_id] = {};
      if (all_participants[_browser_id] != undefined) {
        var participant_name = all_participants[_browser_id].name;
        if (participant_name != undefined) {
          participants[_browser_id].name = participant_name;
        }
      }
    }
    var to_send = JSON.stringify({
      comments: comments_json,
      participants: participants
    });
    res.write(to_send);
    res.end();
    return;
  } else if (op == "comment_deleted") {
    var comment_id = req.body;
    var data = fs.readFileSync(comment_file);
    var comments_json_ar = JSON.parse(data);
    var found_i = -1;
    for (var i = 0; i < comments_json_ar.length; i++) {
      if (comments_json_ar[i]._id == comment_id) {
        found_i = i;
        break;
      }
    }
    if (found_i == -1) {
      res.write('{ "error": "comment._id not found." }');
    } else {
      comments_json_ar.splice(found_i, 1);
      var comments_json_ar_str = JSON.stringify(comments_json_ar);
      fs.writeFileSync(comment_file, comments_json_ar_str);
      res.write(comments_json_ar_str);
      broadcast(page_title, browser_id, {
        op: "comment_deleted",
        _id: comment_id
      });
    }
  } else if (op == "comment_updated") {
    var updated_comment = JSON.parse(req.body);
    var comments_json_ar = JSON.parse(fs.readFileSync(comment_file));
    var found_i = -1;
    for (var i = 0; i < comments_json_ar.length; i++) {
      if (comments_json_ar[i]._id == updated_comment._id) {
        found_i = i;
        break;
      }
    }
    if (found_i == -1) {
      res.write('{ "error": "comment._id not found." }');
    } else {
      comments_json_ar[found_i].message = updated_comment.message;
      fs.writeFileSync(comment_file, JSON.stringify(comments_json_ar));
      broadcast(page_title, browser_id, {
        op: "comment_updated",
        browser_id: browser_id,
        comment: comments_json_ar[found_i]
      });
    }
  } else if (op == "get_verses") {
    handle_first_request(req);
    //
    var req_json = JSON.parse(req.body);
    //
    tnc.search_sorted(req_json.words, 0, {
      max_distance: req_json.max_distance,
      min_words: req_json.min_words,
      stop_more_distance: req_json.stop_more_distance,
      stop_less_words: req_json.stop_less_words,
      //
      res: res,
      res_ar: [],
      res_hash: {},
      n_depth: 1,
      re_hash: {},
      last_update_time: new Date().getTime(),
      last_reported_n_results: 0
    });
    return;
  } else {
    throw "op (" + op + ") not recognized.";
  }
  //
  res.end();
}

function handle_first_request(req) {
  var browser_id = req.query.browser_id;
  var page_title = req.query.title;
  console.log(
    "got first request from page_title: " +
      page_title +
      " browser_id: " +
      browser_id
  );
  if (ws_by_id[browser_id] != undefined) {
    ws_by_id[browser_id].page_title = page_title;
    if (browsers_ids_by_title[page_title] == undefined)
      browsers_ids_by_title[page_title] = {};
    browsers_ids_by_title[page_title][browser_id] = null;
  } else {
    // lilo: Warning..
  }
}
