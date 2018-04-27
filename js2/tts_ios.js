// デフォルトチャンネル
const _DEFAULT_CHANNEL = 'tcdt';
const _DEFAULT_METADATA = 'ios';

let _channelId = null;
let _metadata = null;
// Sora Publisher
let _publisher = null;

/**
 * 初期化処理
 */
$(function() {
    // イベントハンドラの設定
    setupEventHandler();
    // デフォルトチャネル, メタデータの設定
    setupDefaultValues();
    // 画面を制御する。
    controlItems('init');
});

const setupEventHandler = function() {
    $('#btnConnect').on('click', doConnect);
    $('#btnDisconnect').on('click', doDisconnect);
};

const setupDefaultValues = function() {
    $('#txtChannelId').val(_DEFAULT_CHANNEL);
    $('#txtMetadata').val(_DEFAULT_METADATA);
    
    const param = getGetParameters();
    const isUseCustomOption = param.custom;
    if (isUseCustomOption === 'true') {
        _IS_USE_CUSTOM_OPTION = true;
    }
}

/**
 * 接続ボタンイベントハンドラ
 */
const doConnect = function() {

    _channelId = $('#txtChannelId').val();
    _metadata = $('#txtMetadata').val();
    // 入力チェック
    if (validate() === false) {
        return;
    }

    // SoraにSubscriberとして接続する。
    connectSoraAsSubscriber();
};

/**
 * 切断ボタンイベントハンドラ
 */
const doDisconnect = function() {

    if (_publisher) {
        _publisher.disconnect();
        _publisher = null;
    }

    $('#containerUp').empty();
    $('#containerDown').empty();
    // 画面を制御する。
    controlItems('doDisconnect');
};

/**
 * 入力チェック
 */
const validate = function() {
    if (!_channelId) {
        alert('チャネルIdを入力して下さい。');
        return false;
    }
    return true;
};

/**
 * Soraに購読者として接続する。
 */
const connectSoraAsSubscriber = function() {

    _publisher = getSoraPublisher(_channelId, _metadata);
    setupPublisherEventHandler(_publisher);

    getUserMedia()
        .then(s => {
            _publisher.connect(s)
                .then(onSuccess)
                .catch(onError);
        })
        .catch(onError);
};

const setupPublisherEventHandler = function(publisher) {

    publisher.on('addstream', function(event) {
        // 追加されたストリームからAudioMediaを生成
        const newAudio = createAudioStreamElement(event.stream);
        // <audio>を追加する。
        $('#containerDown').append(newAudio);

        // FireFoxは"removestream"イベントを発火しないらしいので、ここで設定しておく
        event.stream.onremovetrack = function(e) {
            $('#' + event.stream.id).remove();
        };
    });
};

/**
 * UserMedia接続成功時処理。
 */
const onSuccess = stream => {
    const tag = createAudioStreamElement(stream);
    $('#containerUp').append(tag);
    // 画面を制御する。
    controlItems('doConnect');
};

/**
 * 接続失敗時処理。
 */
const onError = error => {
    console.log(error);
    alert(error);
};

/**
 * 画面を制御する。
 */
const controlItems = function(target) {

    if (!target) {
        return;
    }

    let disabled = [];
    let attrs = [];

    if (target === 'init') {
        disabled = [false, true];
        attrs = ['未接続', 'blue'];
    } else if (target === 'doConnect') {
        disabled = [true, false];
        attrs = ['接続中。。', 'red'];
    } else if (target === 'doDisconnect') {
        disabled = [false, true];
        attrs = ['未接続', 'blue'];
    } else {
        return;
    }

    $('#btnConnect').prop('disabled', disabled[0]);
    $('#btnDisconnect').prop('disabled', disabled[1]);
    $('#status').text(attrs[0]).css('color', attrs[1]);
};
