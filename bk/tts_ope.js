// 定数
const IP_ADDRESS = '13.231.213.196';
const SUB_DOMAIN = 'resources/wav';
const FILENAME = 'eine.mp3';
const MEDIA_TYPE = 'audio/wave';
// グローバル変数
let _publisher = null;
let _player = null;
let _playerDisabled = true;

/**
 * 初期化処理
 */
$(function() {
    _player = document.getElementById('audioPlayer');
    setupEventHander();
});

/**
 * イベントリスナの設定
 */
function setupEventHander() {
    $('#btnConnIOS').on('click', connectToClient);
    // $('#btnDisconnIOS').on('click', disconnectFromClient);
    // $('#btnConnServer').on('click', connectToTTSServer);
    // $('#btnDisconnServer').on('click', disconnectFromTTSServer);
    // $('#btnEnablePlayer').on('click', enablePlayer);
    // 画面項目制御
    // controlEnable('init');
}

let _xhr = null;

function connectToClient() {

    _xhr = new XMLHttpRequest();
    console.log(_xhr);
    let url = createUrl();
    let audioStack = [];
    var context = new (window.AudioContext || window.webkitAudioContext)();
    var nextTime = 0;

    fetch(url).then(function(response) {
      console.log(response);
      var reader = response.body.getReader();
      function read() {
        return reader.read().then(({ value, done })=> {
          context.decodeAudioData(value.buffer, function(buffer) {
            audioStack.push(buffer);
            if (audioStack.length) {
                scheduleBuffers();
            }
          }, function(err) {
            console.log("err(decodeAudioData): "+err);
          });
          if (done) {
            console.log('done');
            return;
          }
          read()
        });
      }
      read();
    })

    function scheduleBuffers() {
        while ( audioStack.length) {
            var buffer    = audioStack.shift();
            var source    = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            if (nextTime == 0)
                nextTime = context.currentTime + 0.01;  /// add 50ms latency to work well across systems - tune this if you like
            source.start(nextTime);
            nextTime += source.buffer.duration; // Make the next buffer wait the length of the last buffer before being played
        };
    }


    _xhr.onload = doLoad;
    _xhr.open('GET', url, true);
    _xhr.responseType = 'arraybuffer';
    _xhr.send(null);
}

function doLoad() {
    if (_xhr.status === 200) {
        let buf = _xhr.response;
        console.log(buf instanceof ArrayBuffer);
        if (!(buf instanceof ArrayBuffer)) {
            return;
        }
        getContext().decodeAudioData(buf, onSuccess, onError);
    }
}

var onSuccess = audioBuffer => {
    console.log(audioBuffer);
};

var onError = error => {
    console.log(error);
}

function createUrl() {
    return 'http://adrs/sd/fname'
                .replace('adrs', IP_ADDRESS)
                .replace('sd', SUB_DOMAIN)
                .replace('fname', FILENAME);
}
