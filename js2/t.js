$(function() {
    $('#btnSet').on('click', doSet);
    $('#btnCancel').on('click', doCancel);
    doTest();
});

const doTest = function() {
    getUserMedia({ video : false, audio : true}, function(stream) {
        const ctx = new AudioContext();
        var src = ctx.createMediaStreamSource(stream);
        var dest = ctx.createMediaStreamDestination();
        var gain = ctx.createGain();

        src.connect(gain);
        gain.connect(dest);
        gain.gain.value = 0.2;

    }, funcion(e) {
        alert(e)
    });
};

let doSet = function() {
    let volume = parseInt($('#txtVolume').val());
    if (!validate(volume)) {
        $('#txtVolume').val('100')
        return;
    }

    let player = document.getElementById('player');
    let rate = parseFloat(volume / 100);
    player.volume = rate;
};

let validate = function(volume) {
    if (!volume) {
        alert('0から100までの数値を入力。');
        return false;
    }
    if (isNaN(volume)) {
        alert('0から100までの数値を入力。')
        return false;
    }
    if (volume < 0 || volume > 100) {
        alert('0から100までの数値を入力。')
        return false;
    }
    return true;
};

let doCancel = function() {
    let player = document.getElementById('player');
    player.muted = false;
    player.volume = 1.0;
};
