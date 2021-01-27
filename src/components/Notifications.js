class Notifications {
  constructor(app) {
    this.app = app;
  }

  // chrome://settings/content/notifications
  // Note: for testing the Notifications on real host, you can enable: Insecure origins treated as secure in chrome://flags/
  get_notifications_permission() {
    if (window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission(function (status) {
        if (Notification.permission !== "granted") {
          alert("Notification.permission was NOT granted.");
        }
      }, this.app);
    }
  }

  check_playAudio(enable_obj) {
    var audio = new Audio("/audio/chimes.mp3");
    audio.enable_obj = enable_obj;
    audio.onerror = function (event) {
      console.log("Can't play audio");
    };
    audio.onplay = (event) => {
      console.log("Audio notifications are available.");
      event.target.enable_obj.setState({
        show_permit_button: false,
      });
    };
    audio.play();
  }

  showNotification(title, txt, audio) {
    var do_audio = !this.app.enable_audio_ref.current.state.show_permit_button;
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

export default Notifications;
