console.log("WatchCast Server has started...");
var tnc = require("./tnc.js");
const fs = require("fs");
const path = require("path");
const dns = require("dns");
var MongoClient = require("mongodb").MongoClient;
var mongo_url = "mongodb://localhost:27017/";
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

let transporter = nodemailer.createTransport(
  smtpTransport({
    service: "gmail",
    auth: {
      user: "watchcast.project@gmail.com",
      pass: fs.readFileSync(process.cwd() + path.sep + "pwd.txt", "utf8"),
    },
  })
);

const mailOptions = {
  from: "WatchCast Sever <watchcast.project@gmail.com>",
  to: "Aryeh Tuchfeld <aryeh.tuchfeld@gmail.com>",
  subject: "WatchCast Server Has Started",
  text: "",
};

transporter.sendMail(mailOptions, function (error, info) {
  if (error) {
    console.log(error);
  } else {
    console.log("Email sent: " + info.response);
  }
});

var fb_dbo;
// if (process.execPath.startsWith("C:\\")) {
// }
MongoClient.connect(
  mongo_url,
  { useUnifiedTopology: true },
  function (err, db) {
    if (err) throw "Failed to connect to mongoDB: " + err;
    tnc.set_books_dbo(db.db("Books"));
    fb_dbo = db.db("faithbit");
    console.log("MongoDB is connected on: " + mongo_url);
  }
);

const url = require("url");
const express = require("express");
const app = express();
app.set(
  "port",
  process.execPath.startsWith("C:\\") ? 8080 : process.env.PORT || 80
);
const bodyParser = require("body-parser");
app.use(bodyParser.text({ type: "text/html" }));
const uuidv1 = require("uuid/v1");

const WebSocket = require("ws");

const ws_port = 3030;
const wss = new WebSocket.Server({ port: ws_port, pingTimeout: 60000 });
console.log("WebSocket Server is listening on port: " + ws_port);

wss.on("error", (error) => {
  console.log("WebSocket.Server Error.");
});

var ws_by_id = {};
var all_participants = {};
var browsers_ids_by_title = {};

wss.on("connection", function connection(ws, req) {
  var app_name = req.url;
  console.log(
    `got connection from: ${ws._socket.remoteAddress}:${ws._socket.remotePort} ${app_name}`
  );
  var browser_id = uuidv1();
  ws.browser_id = browser_id;
  var ws_connected_json_data = {
    op: "ws_connected",
    browser_id: browser_id,
  };
  ws.send(JSON.stringify(ws_connected_json_data));
  ws_by_id[browser_id] = ws;
  all_participants[browser_id] = {};
  ws.on("message", function (msg) {
    var json = JSON.parse(msg);
    console.log(
      `got msg from browser_id: ${ws.browser_id} room: \`${ws.room_title}\` op: \`${json.op}\` name: \`${json.name}\``
    );
    switch (json.op) {
      case "client_changed_name":
        all_participants[browser_id].name = json.name;
        broadcast(ws.room_title, ws.browser_id, {
          op: json.op,
          browser_id: ws.browser_id,
          name: json.name,
        });
        break;
      case "client_message_entered_changed":
      case "client_message_entered_ceased":
        all_participants[browser_id].entered_message = json.entered_message;
        broadcast(ws.room_title, ws.browser_id, {
          op: json.op,
          browser_id: ws.browser_id,
          entered_message: json.entered_message,
        });
        break;
      case "client_disabled_report_typing":
        all_participants[browser_id].entered_message = json.entered_message;
        broadcast(ws.room_title, ws.browser_id, {
          op: json.op,
          browser_id: ws.browser_id,
        });
        break;
      default:
        throw "websocket received an unsupported message op: `" + json.op + "`";
    }
  });
  ws.on("close", function () {
    var name = all_participants[ws.browser_id].name;
    console.log(
      "Client disconnected from room_title: `" +
        ws.room_title +
        "` browser_id: " +
        ws.browser_id +
        (name != undefined ? " name: `" + name + "`" : "")
    );
    delete ws_by_id[browser_id];
    delete all_participants[browser_id];
    if (browsers_ids_by_title[ws.room_title] != undefined)
      delete browsers_ids_by_title[ws.room_title][browser_id];
    broadcast(ws.room_title, browser_id, {
      op: "client_left",
      browser_id: browser_id,
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
      cert: "",
    },
    app
  )
  .listen(app.get("port"), () => {
    console.log(
      `Http Server is running at: http://localhost:${app.get("port")}/`
    );
  });

function broadcast(room_title, by_browser_id, data) {
  var bids = browsers_ids_by_title[room_title];
  if (bids == undefined) {
    console.log(
      `in broadcast. room: \`${room_title}\` is Empty. probably because the server restarted. todo...`
    );
    return;
  }
  for (id in bids) {
    var ws = ws_by_id[id];
    if (id != undefined && id != by_browser_id) {
      // lilo
      if (
        ws != undefined &&
        ws.readyState === 1 &&
        ws.room_title == room_title
      ) {
        ws.send(JSON.stringify(data)); // '{ "_id": -1, "message": "Hello World2" }'
      }
    }
  }
  var n_other_peers = Object.keys(bids).length - 1;
  console.log(
    `in broadcast msg: \`${data.op}\` to room: \`${room_title}\` with ${
      n_other_peers < 1 ? "no" : n_other_peers
    }${n_other_peers == -1 ? "" : " other"} peer${
      n_other_peers == 1 ? "" : "s"
    }`
  );
}

app.get("*", function (req, res, next) {
  //throw "get out";
  var rel_url = req.params[0];
  //res.header("aryeh_debug", "rel_url=" + rel_url);
  // res.cookie("aryeh_debug", "rel_url=" + rel_url, {
  //   maxAge: 900000,
  //   httpOnly: true,
  // });
  //console.log("rel_url: " + rel_url);

  // lilo: code too complex?
  var tmp =
    process.cwd() +
    path.sep +
    "src" +
    rel_url.replace(/\/$/, "").replace(/\//g, path.sep); // lilo: is it needed?..
  //tmp = tmp.replace(/\\/g, path.sep);
  var is_file = false;
  try {
    var stats = fs.lstatSync(tmp);
    is_file = stats.isFile();
  } catch (ex) {}
  //var is_file_or_dir = fs.existsSync(tmp);
  // if (!is_file_or_dir && ) {
  //   try {
  //     is_file_or_dir = fs.statSync(tmp).isDirectory();
  //   } catch (ex) {}
  // }

  if (rel_url == "/handle_comments/") {
    handle_request(req, res);
  } else if (/^\/(tnc|comments)[\/]?$/i.test(rel_url)) {
    const filePath = process.cwd() + "/src/comments/index.html"; // where the <div id="root"> is.
    var html = fs.readFileSync(filePath, "utf8");

    var html = replace_html(
      req,
      html,
      /^\/comments/i.test(rel_url)
        ? req.query.title + " Comments Room"
        : "Bible English Search",
      "Click here to Enter the Chat Room"
    );

    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.header("Expires", "-1");
    res.header("Pragma", "no-cache");
    res.send(html);
    res.end();
    return;
  } else if (/127\.0\.0\.1$/i.test(req.ip) && rel_url == "/whm-server-status") {
    // lilo: what's that?
    // console.log(`ignoring request. path: ${rel_url} from: ${req.ip}`);
    next();
  } else if (rel_url == "/" || !is_file) {
    var html;
    if (rel_url == "/") {
      var html = fs.readFileSync(
        process.cwd() + "/src/pages/home-page.html",
        "utf8"
      );
      html = replace_html(req, html, "WatchCast Homepage", "");
    } else {
      var html = fs.readFileSync(
        process.cwd() + "/src/pages/default-page.html",
        "utf8"
      );
      replace_html(req, html, "WatchCast Default page", "");
    }
    res.send(html);
    res.end();

    var ip_res = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g.exec(
      req.connection.remoteAddress
    );
    var ip;
    if (ip_res != null) {
      ip = ip_res[0];
    } else {
      ip = "127.0.0.1";
    }

    dns.reverse(ip, (err, hostnames) => {
      var hostnames_str = "";
      if (!err) {
        hostnames_str = " hostname: " + hostnames;
      }
      console.log(
        `default request. path: ${rel_url} from: ${ip}` + hostnames_str
      );
    });
    return;
  } else {
    next();
  }

  // usefull for running React Debugger in port 3000 to access the running Node.js:
  // app.use(function(req, res, next) {
  //   res.header("Access-Control-Allow-Origin", "*");
  //   res.header(
  //     "Access-Control-Allow-Headers",
  //     "Origin, X-Requested-With, Content-Type, Accept"
  //   );
  //   next();
  // });

  app.use(express.static("/"), express.static("src"));

  app.get("/tnc_query", (req, res) => {
    // yishay
    tnc.handle_tnc_query(res);
  });

  app.post("/handle_comments", (req, res) => {
    handle_request(req, res);
  });

  // app.get("/handle_comments", (req, res) => {
  //   handle_request(req, res);
  // });

  function handle_request(req, res) {
    // var dir = "/DATA/";
    var op = req.query.op;
    var room_title = req.query.title;
    var browser_id = req.query.browser_id;
    // var comment_file =
    //   process.cwd() +
    //   dir +
    //   (room_title != null ? room_title + "_" : "") +
    //   "comment.json";

    if (op == "comment_added") {
      var comment_json = JSON.parse(req.body);
      comment_json._id = uuidv1();
      comment_json.time = new Date().toUTCString();
      comment_json.user_ip = req.headers.host;
      comment_json.browser_id = browser_id;
      //
      //var data = fs.readFileSync(comment_file);
      //var comments_json_ar = JSON.parse(data);
      //comments_json_ar.push(comment_json);
      fb_dbo.collection("comments").updateOne(
        { room_title: room_title },
        {
          $push: { comments_ar: comment_json },
        },
        function (err, result) {
          broadcast(room_title, browser_id, {
            op: op,
            browser_id: browser_id,
            comment: comment_json,
          });
          res.write(JSON.stringify(comment_json));
          res.end();
        }
      );
      //fs.writeFileSync(comment_file, JSON.stringify(comments_json_ar));
      return;
    } else if (op == "get_all_comments") {
      handle_first_request(req);
      broadcast(room_title, browser_id, {
        op: "client_joined",
        browser_id: browser_id,
        name: req.query.name,
      });

      var participants = {};
      for (var _browser_id in browsers_ids_by_title[room_title]) {
        if (_browser_id == browser_id) continue;
        participants[_browser_id] = {};
        var all_participant = all_participants[_browser_id];
        var participant = participants[_browser_id];
        participant.name = all_participant.name;
        participant.entered_message = all_participant.entered_message;
      }

      fb_dbo.collection("comments").findOne(
        { room_title: room_title },
        function (err, result) {
          if (result == null) {
            var empty_comments_ar = [];
            fb_dbo.collection("comments").insert(
              {
                "room_title": room_title,
                "comments_ar": empty_comments_ar,
              },
              function (err, result) {
                res.write(
                  JSON.stringify({
                    comments: empty_comments_ar,
                    participants: this.participants,
                  })
                );
                res.end();
              }
            );
          } else {
            res.write(
              JSON.stringify({
                comments: result.comments_ar,
                participants: this.participants,
              })
            );
            res.end();
          }
        }.bind({ participants: participants })
      );
      return;
    } else if (op == "comment_deleted") {
      var comment_id = req.body;
      fb_dbo.collection("comments").updateOne(
        { room_title: room_title },
        {
          $pull: { comments_ar: { _id: comment_id } },
        },
        function (err, result) {
          res.end();
          broadcast(room_title, browser_id, {
            op: "comment_deleted",
            _id: comment_id,
          });
        }
      );
      return;

      // var data = fs.readFileSync(comment_file);
      // var comments_json_ar = JSON.parse(data);
      // var found_i = -1;
      // for (var i = 0; i < comments_json_ar.length; i++) {
      //   if (comments_json_ar[i]._id == comment_id) {
      //     found_i = i;
      //     break;
      //   }
      // }
      // if (found_i == -1) {
      //   res.write('{ "error": "comment._id not found." }');
      // } else {
      //   comments_json_ar.splice(found_i, 1);
      //   var comments_json_ar_str = JSON.stringify(comments_json_ar);
      //   fs.writeFileSync(comment_file, comments_json_ar_str);
      //   res.write(comments_json_ar_str);
      //   broadcast(room_title, browser_id, {
      //     op: "comment_deleted",
      //     _id: comment_id,
      //   });
      // }
    } else if (op == "comment_updated") {
      var updated_comment = JSON.parse(req.body);

      fb_dbo.collection("comments").updateOne(
        { room_title: room_title, "comments_ar._id": updated_comment._id },
        {
          $set: { "comments_ar.$.message": updated_comment.message },
        },
        function (err, result) {
          //res.write(JSON.stringify(updated_comment));
          res.end();
          broadcast(room_title, browser_id, {
            op: "comment_updated",
            browser_id: browser_id,
            comment: updated_comment,
          });
        }
      );
      return;

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
        broadcast(room_title, browser_id, {
          op: "comment_updated",
          browser_id: browser_id,
          comment: comments_json_ar[found_i],
        });
      }
    } else if (op == "get_verses") {
      tnc.handle_get_verses(JSON.parse(req.body), res);
      return;
    } else if (op == "first_request") {
      handle_first_request(req);
    } else {
      throw "op (" + op + ") not recognized.";
    }
    //
    res.end();
  }

  function handle_first_request(req) {
    var browser_id = req.query.browser_id;
    var room_title = req.query.title;
    console.log(
      `got first request from room_title: \`${room_title}\` browser_id: ${browser_id}`
    );
    if (ws_by_id[browser_id] != undefined) {
      ws_by_id[browser_id].room_title = room_title;
      if (browsers_ids_by_title[room_title] == undefined)
        browsers_ids_by_title[room_title] = {};
      browsers_ids_by_title[room_title][browser_id] = null;
    } else {
      // lilo: Warning..
    }
  }
});
function replace_html(req, data, title, description) {
  var html = data.replace(/\$OG_TITLE/g, title);
  html = html.replace(/\$OG_DESCRIPTION/g, description);
  html = html.replace(/\$OG_IMAGE/g, "/images/WC_Logo.png");
  html = html.replace(/\$LOCALHOST/g, req.headers.host);
  return html;
}
