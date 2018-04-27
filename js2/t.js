$(() => {
    $('#dotest1').on('click', doTest1);
});

const doTest1 = function() {
    // const ary = ['aaa', 'bbb', 'ccc', 'ddd'];
    // for (let val of ary) {
    //     console.log(val);
    // }
    // for (let idx in ary) {
    //     console.log(idx);
    // }
    //

    const map = {3 : 'HHH', 1 : 'FFF', 2 : 'GGG'};
    for (let idx in map) {
        console.log(idx);
    }
    for (let val of map) {
        console.log(val);
    }



    split(1, 2, 3, 4, 5, 6, 7, 8, 9);
};
const split = (a, ...z) => {
    console.log(a);
    console.log(z);
};
