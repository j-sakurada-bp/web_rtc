// 定数
const _URL = 'ws://13.231.213.196:5000/signaling';
const _DEBUG = true;
const _DEFAULT_OPTIONS = {
    audio: true,
    video: false,
    audioBitRate: 32
};

/**
 * REQUESTパラメータからcid(channelId)とmd(metadata)の値を取得する。
 */
function getGETParameters() {

    // GETパラメータ
    let urlParameter = location.search;
    if (!urlParameter) {
        return {};
    }
    let params = urlParameter.substring(1);
    if (!params) {
        return {};
    }
    // mapに変換
    params = params.split('&');
    let paramObj = {};
    for (let i = 0; i < params.length; i++) {
        let keyValue = params[i].split('=');
        paramObj[keyValue[0]] = keyValue[1];
    }
    return paramObj;
}

function getUserMedia(options) {
    options = options || _DEFAULT_OPTIONS;
    return navigator.mediaDevices.getUserMedia(options);
}

/**
 * SORAのPublisherオブジェクトを取得する。
 */
function getSoraPublisher(channelId, metadata, options) {
    // channelId未指定はNG
    if (!channelId) {
        throw new Error('channelId is required.');
    }
    // 残りはデフォルト値を
    metadata = metadata || '';
    options = options || _DEFAULT_OPTIONS;

    return getSoraConnection().publisher(channelId, metadata, options);
}

function getSoraSubscriber(channelId, metadata, options) {
    // channelId未指定はNG
    if (!channelId) {
        throw new Error('channelId is required.');
    }
    // 残りはデフォルト値を
    metadata = metadata || '';
    options = options || _DEFAULT_OPTIONS;

    return getSoraConnection().subscriber(channelId, metadata, options);
}

/**
 * SORAのコネクションを取得する。
 */
function getSoraConnection(url, debug) {
    url = url || _URL;
    debug = debug || _DEBUG;
    return Sora.connection(url, debug);
}

/**
 * audioメディア取得用contextを取得する。
 */
function getContext() {
    var context = window.AudioContext || window.webkitAudioContext;
    return new context();
};

/**
 * RTCPeerConnectionを取得する。
 */
function getRTCPeerConnection() {
    var PC =
        window.RTCPeerConnection
        || window.webkitRTCPeerConnection
        || window.mozRTCPeerConnection;
    return new PC();
}

/**
 * MediaRecorderを取得する。
 * (なんか使えそうだったので。実施には未使用)
 */
function getMediaRecorder(stream) {
    var recorder = new MediaRecorder(stream);
    var buff = [];
    recorder.ondataavailable = function(event) {
        console.log('event.data.type = ' + event.data.type + ', size = ' + event.data.size);
        buff.push(event.data);
    };
    recorder.onstop = function(event) {
        recorder = null;
    };
    return recorder;
}

/**
 * ファイルに残したければ、WEBサーバに処理を飛ばすしかなさそう。
 * (なんか使えそうだったので。実施には未使用)
 */
function post() {
    var fd = new FormData(); // not exist
    fd.append('fname', 'test.wav');
    fd.append('data', soundBlob); // not exist

    $.ajax({
        type: 'POST',
        url: '/upload.php', // not exist
        data: fd,
        processData: false,
        contentType: false
    }).done(function(data) {
       console.log(data);
   });
}
