import { addNewNote, pitchObject, setInLocalStorage } from '../utils.js';

//KEYS DOM ELEMENTS
const whiteKeys = document.querySelectorAll('.white-keys');
const blackKeys = document.querySelectorAll('.black-keys');
//PAD DOM ELEMENTS
const pads = document.querySelectorAll('.pad');
//Waveform DOM ELEMENTS
const waveformControlSine = document.getElementById('sine');
const waveformControlSquare = document.getElementById('square');
const waveformControlTriangle = document.getElementById('triangle');
const waveformControlSawtooth = document.getElementById('sawtooth');
const waveformControlDiscovibes = document.getElementById('discovibes');

//MASTER VOLUME DOM ELEMENT
const gainControl = document.getElementById('gain-control');
const filterControl = document.getElementById('filter-control');

//Makes a spread that combines the keys arrays
const keys = [...whiteKeys, ...blackKeys];

//TURNS ON AN AUDIO CONTEXT
//SET UP AUDIO CONTEXT
const context = new (window.AudioContext || window.webkitAudioContext)();

//PATHING: Makes a global state for master gain, analyser, and filter
const masterGainNode = context.createGain();
// other fancy nodes could go here
const analyserNode = context.createAnalyser();
const biquadFilter = context.createBiquadFilter();

//MASTER OUTPUT ROUTING (GOES FROM INTERNAL)
biquadFilter.connect(masterGainNode);
masterGainNode.connect(analyserNode);
//other things could go here
analyserNode.connect(context.destination);

//creates variables to be used in the following functions
let oscillator;
let gainNode;

// variables to be used within other filter features
let release = .8; // keep for now
// CREATES OSCILLATOR AND SETS UP ROUTING FROM WITHIN EACH OSCILLATOR NOTE EVENT
function init(type) {
    oscillator = context.createOscillator();
    gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(biquadFilter);
    oscillator.type = type;
}

// LOWPASS FILTER PRESETS
biquadFilter.type = 'lowpass';
biquadFilter.frequency.value = 5000;

// STARTS OSCILLATOR WITH INTERNAL GAIN PRESETS (STARTS @ 1=full)
function startSound(value, time, waveform) {
    init(waveform);
    oscillator.frequency.value = value;
    gainNode.gain.setValueAtTime(.3, context.currentTime);
    oscillator.start(time);
}

// STOPS OSCILLATOR WITH BUILT_IN FADEOUT
// [STRETCH GOAL] FADEOUT CAN BE MODIFED (release)
function stopSound(time) {
    gainNode.gain.setTargetAtTime(0, time, 0.015);
}

// PREPARES THE AUDIO FILE (called within startDisco())
//connects URL link to ARRAY BUFFER, PREPARES to be sent to audioBufferSource
function loadDisco(url, context) {
    return fetch(url)
        .then(res => res.arrayBuffer())
        .then(buffer => context.decodeAudioData(buffer))
}
//ACCEPTS A PAD ELEMENT OBJECT PARAMETER
//"object" can be key[i]
function startDisco(object, context, time) {
    //CREATES A BUFFER SOURCE TO RECEIVE THE AUDIO
    let source = context.createBufferSource();
    // CONNECT THE BUFFER SOURCE NODE TO OUR GLOBAL AUDIO NODE CHAIN, WHICH BEGINS WITH THE analyserNode
    source.connect(biquadFilter);

    //SETS THE SOURCE PROPERTY TO MATCH THE VALUE OF HTML (data-sound)
    loadDisco(object.dataset.sound, context)
        //CONNECT THE AUDIO IN BUFFER TO the BUFFER SOURCE NODE
        .then((buffer) => source.buffer = buffer)
        // AND, FINALLY, PLAY THE AUDIO
        .then(() => source.start(time))
};
// CREATES OBJECTS TO BE USED IN EACH KEYBOARD EVENTLISTENER
let pitchModifier = 1; // (STRETCH) CAN BE AN OCTAVE SWITCHER BY MULTIPLYING
let resultsArray = [];

//CREATES EVENT LISTENERS FOR EACH KEY DEPRESSED (mousedown)
for (let i = 0; i < keys.length; i++) {
    keys[i].addEventListener('mousedown', (e) => {
        let now = context.currentTime;
        // CHOOSES BETWEEN OSCILLATOR OR SAMPLER SYNTHS
        if (waveform === 'discovibes') {
            startDisco(keys[i], context, now);
        } else {
            let currentPitch = pitchObject[keys[i].id] * pitchModifier;
            e.target.value = startSound(currentPitch, now, waveform);
        }
        let activeKey = e.target.getAttribute('id');
        // SENDS NOTE COUNT TO localSTORAGE
        addNewNote(resultsArray, activeKey);
        setInLocalStorage('NOTES', resultsArray);
    });

    //CREATES EVENTLISTENER TO CALL stopSound FUNCTION (mouseup)
    keys[i].addEventListener('mouseup', (e) => {
        let now = context.currentTime;
        if (waveform !== 'discovibes') {
            e.target.value = stopSound(now);
        }
    });
}

//EVENT LISTENER FOR GAIN (MAIN VOLUME) SLIDER
gainControl.addEventListener('mousemove', function (e) {
    masterGainNode.gain.setValueAtTime(e.target.value, context.currentTime);
});

//EVENT LISTENER FOR LOW PASS SLIDER
filterControl.addEventListener('mousemove', function (e) {
    biquadFilter.frequency.setValueAtTime(e.target.value, context.currentTime);
});

//CALL WAVEFORM RADIO FROM THE DOM
let waveform = document.querySelector(':checked').value;

//EVENT LISTENERS FOR SYNTH WAVESHAPE PARAMETER INTERFACE
waveformControlSine.addEventListener('click', function (event) {
    waveform = event.target.value;
});
waveformControlSquare.addEventListener('click', function (event) {
    waveform = event.target.value;

});
waveformControlTriangle.addEventListener('click', function (event) {
    waveform = event.target.value;

});
waveformControlSawtooth.addEventListener('click', function (event) {
    waveform = event.target.value;
});
waveformControlDiscovibes.addEventListener('click', function (event) {
    waveform = event.target.value;
});

const resetButton = document.getElementById('reset');

resetButton.addEventListener('click', () => {
    window.location = './index.html';
});

//PLAYS THE AUDIO FOR EACH OF THE DRUMPADS
for (let i = 0; i < pads.length; i++) {
    pads[i].addEventListener('mousedown', (e) => {
        let now = context.currentTime;
        console.log(pads[i]);
        startDisco(pads[i], context, now);
    });
}



// VISUALISER LEFT
const canvas = document.getElementById('visualiser-left');
const ctx = canvas.getContext('2d');

// SET FFT SIZE
analyserNode.fftSize = 256;
const bufferLength = analyserNode.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

ctx.clearRect(0, 0, 400, 150);

function draw() {
    const drawVisual = requestAnimationFrame(draw);
    analyserNode.getByteFrequencyData(dataArray);
    ctx.fillStyle = 'rgb(11, 19, 43)';
    ctx.fillRect(0, 0, 400, 150);

    const barWidth = (480 / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        ctx.fillStyle = 'rgb(' + (barHeight + 10) + ',255,233)';
        ctx.fillRect(x, 150 - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

draw();


// VISUALISER RIGHT
const canvasRight = document.getElementById('visualiser-right');
const ctxRight = canvasRight.getContext('2d');

// SET FFT SIZE
analyserNode.fftSize = 256;
const bufferRight = analyserNode.frequencyBinCount;
const dataArrayRight = new Uint8Array(bufferRight);

ctxRight.clearRect(0, 0, 400, 150);

function drawRight() {
    const drawVisual = requestAnimationFrame(drawRight);
    analyserNode.getByteFrequencyData(dataArrayRight);
    ctxRight.fillStyle = 'rgb(11, 19, 43)';
    ctxRight.fillRect(0, 0, 400, 150);

    const barWidth = (480 / bufferRight) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferRight; i++) {
        barHeight = dataArrayRight[i] / 2;

        ctxRight.fillStyle = 'rgb(' + (barHeight + 10) + ',255,233)';
        ctxRight.fillRect(x, 150 - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

drawRight();




// // SAMPLE PAD
// const pads = document.querySelectorAll('.pad');
// //const analyserNode = context.createAnalyser();
// // const context = new (window.AudioContext || window.webkitAudioContext)();
// function loadDisco(object, url, context) {
//     var request = new XMLHttpRequest();
//     request.open('GET', url, true);
//     request.responseType = 'arraybuffer';

//     request.onload = function () {
//         context.decodeAudioData(request.response, function (buffer) {
//             object.buffer = buffer;
//         });
//     };
//     request.send();
// }

// function startDisco(object, context) {

//     //SET VALUE FOR NAME SO THAT IT MATCHES THE ID
//     //const divData = document.querySelector('data-sound')
//     object.name = object.id;
//     //SETS THE SOURCE PROPERTY TO MATCH THE VALUE OF HTML (data-sound)
//     //do I need to chenge the () to {}?
//     //object.source = $(object).data('sound');
//     object.source = object.dataset.sound;
//     //loads sound file to the buffer
//     loadDisco(object, object.source, context);
//     //
//     //makes new audio source node
//     var s = context.createBufferSource();
//     //sets node's source property
//     s.buffer = object.buffer;
//     //connects audio to the computer's speakers --> we'll want to change this to analyser,not destination
//     s.connect(analyserNode);
//     //plays the sound
//     s.start(0);
//     // attach audio source to 
//     object.s = s;
// }

// for (let i = 0; i < pads.length; i++) {
//     pads[i].addEventListener('mousedown', (e) => {
//         let now = context.currentTime;
//         startDisco(pads[i]);
//     });
// }


