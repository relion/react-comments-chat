var MongoClient = require("mongodb").MongoClient;
var mongo_url = "mongodb://localhost:27017/";

var books_dbo;
if (false) {
  MongoClient.connect(
    mongo_url,
    { useUnifiedTopology: true },
    function (err, db) {
      if (err) throw "Failed to connect to mongoDB: " + err;
      books_dbo = db.db("Books"); // BOOKS
      console.log("Connected to " + mongo_url);
    }
  );
}

function search_sorted(words, distance, data) {
  if (words.length == 0) {
    data.n_depth--;
    if (data.n_depth == 0) {
      send_results(data);
    }
    return;
  }
  //
  var ignore_case = "i";
  var re_ar = get_re_ar(words, distance, ignore_case, data.re_hash);
  if (re_ar == null) {
    update_sub_search_done_log_line(words, distance, data);
    data.n_depth--;
    if (words.length == data.min_words && data.n_depth == 0) {
      send_results(data);
    }
    return;
  }
  //
  update_progress_log_line(words, distance, data);
  //
  var lang = "eng"; // "heb";
  books_dbo
    .collection("TNC")
    .find({ [lang]: { $in: re_ar } })
    .toArray(function (err, result) {
      if (err) throw err;
      //res_ar = res_ar.concat(result);
      for (var i = 0; i < result.length; i++) {
        var verse = result[i];
        var key = verse.b + 1 + "-" + (verse.c + 1) + "-" + (verse.v + 1);
        if (data.res_hash[key] == null) {
          data.res_hash[key] = 1;

          var is_heb = lang == "heb";
          verse.marked = verse[is_heb ? "eng" : lang]; // "heb", "heb_puncd"
          re_ar.forEach((_re1) => {
            verse.marked = verse.marked.replace(
              _re1,
              "<span class='fm'>AAA$1BBB</span>"
            );
          });

          words.forEach((word) => {
            var the_word = word;
            if (is_heb) {
              the_word = "";
              Array.from(word).forEach((char) => {
                the_word += char + "[ְֱֲֳִֵֶַָֹׁׂ]*";
              });
            }
            var re =
              "(AAA[\\w\\W<>']*?)((?<=(AAA|\\W))" +
              the_word +
              "(?=(\\W|BBB)))([\\w\\W<>'/]*?BBB)";
            verse.marked = verse.marked.replace(
              new RegExp(re, "g" + ignore_case),
              "$1<span class='wm'>$2</span>$5"
            );
          });

          verse.marked = verse.marked.replace(new RegExp("AAA|BBB", "g"), "");

          data.res_ar.push(verse);
        }
      }

      update_sub_search_done_log_line(words, distance, data);

      data.n_depth--;

      if (
        (data.stop_more_distance && data.res_ar.length > 0) ||
        words.length == 1 ||
        distance == data.max_distance
      ) {
        if (!data.stop_less_words) {
          if (words.length == data.min_words) {
            if (data.n_depth == 0) {
              send_results(data);
            }
            return;
          }
          data.n_depth += words.length;
          for (var i = 0; i < words.length; i++) {
            var _words = words.slice();
            _words.splice(i, 1);
            search_sorted(_words, 0, data);
          }
        } else {
          send_results(data);
        }
      } else {
        data.n_depth++;
        search_sorted(words, distance + 1, data);
      }
    });
}

function get_re_ar(words, distance, flags, re_hash) {
  if (re_hash[words] != undefined) {
    if (re_hash[words][distance] != undefined) {
      return null;
    }
  } else {
    re_hash[words] = {};
  }
  re_hash[words][distance] = flags;
  //
  var re_ar = [];
  var re_str = "";
  var p = perm(words);
  for (var k = 0; k < p.length; k++) {
    var words_p = p[k];
    var re_str = "";
    var non_char = "[\\W ;,]";
    for (var i = 0; i < words_p.length; i++) {
      if (i > 0) {
        re_str += non_char + "*([\\w]+" + non_char + "+){0," + distance + "}";
      }
      re_str += "(?<!\\w)" + words_p[i] + "(?!\\w)";
    }
    re_ar.push(new RegExp("(" + re_str + ")", flags));
  }
  return re_ar;
}

function perm(xs) {
  let ret = [];

  for (let i = 0; i < xs.length; i = i + 1) {
    let rest = perm(xs.slice(0, i).concat(xs.slice(i + 1)));

    if (!rest.length) {
      ret.push([xs[i]]);
    } else {
      for (let j = 0; j < rest.length; j = j + 1) {
        ret.push([xs[i]].concat(rest[j]));
      }
    }
  }
  return ret;
}

// var readline = require("readline");

function update_progress_log_line(words, distance, data) {
  return;
  // readline.cursorTo(process.stdout, 0);
  var str =
    "Shearching " +
    "*".repeat(data.n_depth) +
    " (" +
    words +
    ") dist: " +
    distance;

  if (process.stdout.clearLine != undefined) {
    process.stdout.clearLine();
    process.stdout.write("\r" + str);
  } else {
    console.log(str);
  }
}
//
function update_sub_search_done_log_line(words, distance, data) {
  // if (data.n_depth == 0) {
  //   console.log("");
  // }
  current_time_ms = new Date().getTime();
  var str =
    "(" +
    words +
    ")" +
    " dist: " +
    distance +
    " new_results: " +
    (data.res_ar.length - data.last_reported_n_results) +
    " took: " +
    Math.floor((current_time_ms - data.last_update_time) / 100) / 10 +
    " sec." +
    " total: " +
    data.res_ar.length;
  data.last_reported_n_results = data.res_ar.length;
  data.last_update_time = current_time_ms;
  console.log(str);

  // if (process.stdout.clearLine != undefined) {
  //   process.stdout.write(" " + str);
  // } else {
  //   console.log(str);
  // }
}
//
function send_results(data) {
  if (process.stdout.clearLine != undefined) {
    process.stdout.clearLine();
  }
  console.log("Sending Response (total_results: " + data.res_ar.length + ")");
  //
  data.res.write(JSON.stringify(data.res_ar));
  data.res.end();
}

function handle_tnc_query(res) {
  // yishay
  books_dbo
    .collection("TNC")
    .find({ b: 0, c: 0, v: 1 })
    .toArray(function (err, result) {
      if (err) throw err;
      res.send("<b>" + result[0].eng + "</b>");
    });
}

function handle_get_verses(req_json, res) {
  search_sorted(req_json.words, 0, {
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
    last_reported_n_results: 0,
  });
}

exports.handle_get_verses = handle_get_verses;
exports.handle_tnc_query = handle_tnc_query;
