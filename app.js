//const PORT = process.env.PORT || 8080;
//const http = require("http");
const url = require("url");
const express = require("express");
express.static("/static");
express.static("/images");
const app = express();
app.set("port", process.env.PORT || 80);
app.use("/", express.static("src"));
const bodyParser = require("body-parser");
app.use(bodyParser.text({ type: "text/html" }));
const fs = require("fs");
const uuidv1 = require("uuid/v1"); // npm install uuid

const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3030 });
wss.on("error", error => {
  var x = "handle error";
});

wss.on("connection", function connection(ws) {
  console.log(`got connection from: :${ws}/`);
  var browser_id = uuidv1();
  browsers_ws_by_id[browser_id] = ws;
  ws.send(browser_id);
  // browsers_ws_by_id[ws.query.browser_id] = ws;
  // ws.on("message", function incoming(data) {
  //   wss.clients.forEach(function each(client) {
  //     if (client !== ws && client.readyState === WebSocket.OPEN) {
  //       client.send(data);
  //     }
  //   });
  // });
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

app.listen(app.get("port"), () => {
  console.log("Server running at: http://localhost" + `:${app.get("port")}/`);
});

var browsers_ws_by_id = {};

function trans(page_title, by_browser_id, data) {
  console.log("in trans..");
  var bids = browsers_ids_by_title[page_title];
  bids.forEach(id => {
    if (id != undefined && id != by_browser_id) {
      // lilo
      var client = browsers_ws_by_id[id];
      if (client.readyState === 1) {
        console.log("transing to..");
        client.send(JSON.stringify(data)); // '{ "_id": -1, "message": "Hello World2" }'
      }
    }
  });
  // wss.clients.forEach(function each(client) {
  //   if (client.readyState === WebSocket.OPEN) {
  //     console.log("transing to..");
  //     client.send('{ "_id": -1, "message": "Hello World2" }');
  //   }
  // });
}

app.post("/handle_comments", (req, res) => {
  handle_request(req, res);
});

app.get("/handle_comments", (req, res) => {
  handle_request(req, res);
});

var browsers_ids_by_title = {};

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
    if (browsers_ids_by_title[page_title] == undefined)
      browsers_ids_by_title[page_title] = [];
    browsers_ids_by_title[page_title].push(req.query.browser_id);
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
  } else if (op == "comment_delete") {
    var _id = req.body;
    var data = fs.readFileSync(comment_file);
    var comments_json_ar = JSON.parse(data);
    var found_i = -1;
    for (var i = 0; i < comments_json_ar.length; i++) {
      if (comments_json_ar[i]._id == _id) {
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
      trans(page_title, req.query.browser_id, { op: "delete", _id: _id });
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
