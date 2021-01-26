class PlayAudio {
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

  check_playAudio() {
    var audio = new Audio("/audio/chimes.mp3");
    audio.app = this.app;
    audio.onerror = function () {
      console.log("Can't play audio");
    };
    audio.onplay = () => {
      console.log("Audio notifications are available.");
      this.app.setState({ show_permit_button: false });
    };
    audio.play();
  }
}

export default PlayAudio;
