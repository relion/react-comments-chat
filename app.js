//const PORT = process.env.PORT || 8080;
//const http = require("http");
const url = require("url");
const express = require("express");
express.static("/static");
express.static("/images");
express.static("/audio");
const app = express();
app.set("port", process.env.PORT || 80);
const bodyParser = require("body-parser");
app.use(bodyParser.text({ type: "text/html" }));
const fs = require("fs");
const uuidv1 = require("uuid/v1"); // npm install uuid

const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3030 });
wss.on("error", error => {
  console.log("WebSocket.Server Error.");
});

var ws_by_id = {};

wss.on("connection", function connection(ws) {
  console.log(`got connection from: :${ws}/`);
  var browser_id = uuidv1();
  ws.browser_id = browser_id;
  var ws_connected_json_data = {
    op: "ws_connected",
    browser_id: browser_id,
    participants: Object.keys(ws_by_id)
  };
  ws.send(JSON.stringify(ws_connected_json_data));
  ws_by_id[browser_id] = ws;
  ws.on("close", function() {
    console.log(
      "page_title: " +
        ws.page_title +
        " WebSocket Client disconnected: " +
        ws.browsers_id
    );
    delete ws_by_id[browser_id];
    trans(ws.page_title, browser_id, { op: "client_left", _id: browser_id });
  });
});

// var expressWs = require("express-ws")(app);

// expressWs.getWss().on("connection", function(ws) {
//   console.log(`got connection from: :${ws}/`);
//   var browser_id = uuidv1();
//   browsers_ws_by_id[browser_id] = ws;
//   ws.send(browser_id);
// });
// app.ws("/ws", function(ws, req) {
//   console.log(`got to app.ws..`);
//   ws.on("message", function(msg) {
//     //ws.send(msg);
//   });

//   ws.on("error", error => {
//     var x = "handle error";
//   });

//   ws.on("connection", function connection(ws) {
//     var x = 1;
//     // browsers_ws_by_id[ws.query.browser_id] = ws;
//     // ws.on("message", function incoming(data) {
//     //   wss.clients.forEach(function each(client) {
//     //     if (client !== ws && client.readyState === WebSocket.OPEN) {
//     //       client.send(data);
//     //     }
//     //   });
//     // });
//     ws.on("close", function(data) {
//       console.log("browser disconnected!");
//       // browsers_ids_by_title.forEach(t =>)
//     });
//   });
// });

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

function trans(page_title, by_browser_id, data) {
  console.log("in trans..");
  var bids = browsers_ids_by_title[page_title];
  bids.forEach(id => {
    if (id != undefined && id != by_browser_id) {
      // lilo
      var client = ws_by_id[id];
      if (client != undefined && client.readyState === 1) {
        console.log("transing to..");
        client.send(JSON.stringify(data)); // '{ "_id": -1, "message": "Hello World2" }'
      }
    }
  });
}

app.get("*", function(req, res, next) {
  if (req.path == "/comments/" || req.path == "/comments/index.html") {
    const filePath = process.cwd() + "/src/comments/index.html";
    var data = fs.readFileSync(filePath, "utf8");
    var result = data.replace(
      /\$OG_TITLE/g,
      req.query.title + " Comments Room"
    );
    result = result.replace(/\$OG_DESCRIPTION/g, "About page description");
    result = result.replace(/\$OG_IMAGE/g, "https://i.imgur.com/V7irMl8.png");
    res.send(result);
    res.end();
    return;
  }
  next();
});

app.use("/", express.static("src"));

app.post("/handle_comments", (req, res) => {
  handle_request(req, res);
});

app.get("/handle_comments", (req, res) => {
  handle_request(req, res);
});

var browsers_ids_by_title = [];

function handle_request(req, res) {
  var dir = "/src/DATA/";
  var q = url.parse(req.url, true);
  var op = q.query.op;
  var page_title = q.query.title;
  var comment_file =
    process.cwd() +
    dir +
    (page_title != null ? page_title + "_" : "") +
    "comment.json";
  //
  if (op == "comment_write") {
    var comment_json = JSON.parse(req.body);
    comment_json._id = uuidv1();
    comment_json.time = new Date().toUTCString();
    comment_json.user_ip = req.headers.host;
    //
    trans(page_title, req.query.browser_id, {
      op: "add",
      comment: comment_json
    });
    //
    var data = fs.readFileSync(comment_file);
    var comments_json_ar = JSON.parse(data);
    comments_json_ar.push(comment_json);
    fs.writeFileSync(comment_file, JSON.stringify(comments_json_ar));
    res.write(JSON.stringify(comment_json));
  } else if (op == "get_all_comments") {
    ws_by_id[req.query.browser_id].page_title = page_title;
    if (browsers_ids_by_title[page_title] == undefined)
      browsers_ids_by_title[page_title] = [];
    browsers_ids_by_title[page_title].push(req.query.browser_id);
    trans(page_title, req.query.browser_id, {
      op: "client_joined",
      _id: req.query.browser_id
    });

    if (fs.existsSync(comment_file)) {
      var comments_json_str = fs.readFileSync(comment_file);
      res.write(comments_json_str);
      // var comments_json = JSON.parse(comments_json_str);
      // var comment_read_res_json = {
      //   browser_id: browser_id,
      //   comments: comments_json
      // };
      // var comment_read_res_json_str = JSON.stringify(comment_read_res_json);
      // res.write(comment_read_res_json_str);
    } else {
      fs.writeFileSync(comment_file, "[]");
      //console.log("in comment_read. browser_id: " + browser_id);
      res.write("{ browser_id: '" + req.query.browser_id + "', comments: [] }");
    }
    res.end();
    return;
  } else if (op == "comment_delete") {
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
      trans(page_title, req.query.browser_id, {
        op: "delete",
        _id: comment_id
      });
    }
  } else if (op == "comment_update") {
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
      trans(page_title, req.query.browser_id, {
        op: "update",
        comment: comments_json_ar[found_i]
      });
    }
  } else {
    throw "op (" + op + ") not recognized.";
  }
  //
  res.end();
}
