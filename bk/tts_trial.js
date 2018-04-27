$(function() {
    $('#btnConnect').on('click', doTest);
});

const doTest = function() {

    try {
        let audio = new Audio();
        audio.src = 'http://13.231.213.196/resources/audio/tts.mp3';
        audio.loop = true;
        audio.play();

    } catch (e) {
        alert(e);
    }
}
