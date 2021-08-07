const socket = io();
const myvideo = document.querySelector("#vd1");
const roomid = params.split('/')[params.split('/').length - 1].replace(/\?.+/, '');
let usernick=document.querySelector('.mynick').dataset.mynick;
const chatRoom = document.querySelector('.chat-cont');
const sendButton = document.querySelector('.chat-send');
const chatField = document.querySelector('.chat-input');
const videoContainer = document.querySelector('#vcont');
const overlayContainer = document.querySelector('#overlay');
const videoButt = document.querySelector('.novideo');
const cutCall = document.querySelector('.cutcall');
const screenShareButt = document.querySelector('.screenshare');

let videoAllowed = 1;
let videoInfo = {};
let videoTrackReceived = {};

let myvideooff = document.querySelector("#myvideooff");
myvideooff.style.visibility = 'hidden';

const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] }
const mediaConstraints = { video: true, audio: false};

let connections = {};
let cName = {};
let videoTrackSent = {};

let mystream, myscreenshare;

document.querySelector('.roomcode').innerHTML = `${roomid}`
socket.emit("join", roomid, usernick);

function CopyClassText() {
    var textToCopy = document.querySelector('.roomcode');
    var currentRange;
    if (document.getSelection().rangeCount > 0) {
        currentRange = document.getSelection().getRangeAt(0);
        window.getSelection().removeRange(currentRange);
    }
    else {
        currentRange = false;
    }
    var CopyRange = document.createRange();
    CopyRange.selectNode(textToCopy);
    window.getSelection().addRange(CopyRange);
    document.execCommand("copy");

    window.getSelection().removeRange(CopyRange);
    if (currentRange) {
        window.getSelection().addRange(currentRange);
    }
    document.querySelector(".copycode-button").textContent = "Copied!"
    setTimeout(()=>{
        document.querySelector(".copycode-button").textContent = "Copy Code";
    }, 5000);
}
/*
continueButt.addEventListener('click', () => { //이름칸
    overlayContainer.style.visibility = 'hidden';
    document.querySelector("#myname").innerHTML = `${usernick} (You)`;
    socket.emit("joinRoom", roomid, usernick);
})

nameField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        continueButt.click();
    }
});
*/
let participant_num;
socket.on('userCount', count => {
    if (count > 1) {
        videoContainer.className = 'video-cont';
    }
    else {
        videoContainer.className = 'video-cont-single';
    }
    participant_num = count ;
})

let peerConnection;

// error.js로 옮김

function startCall() {
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(localStream => {
            myvideo.srcObject = localStream;
            myvideo.muted = true;

            localStream.getTracks().forEach(track => {
                for (let key in connections) {
                    connections[key].addTrack(track, localStream);
                    if (track.kind === 'video')
                        videoTrackSent[key] = track;
                }
            })
        })
        .catch(handleGetUserMediaError);
}

function handleVideoOffer(offer, sid, cname, vidinf) {
    cName[sid] = cname;
    videoInfo[sid] = vidinf;
    connections[sid] = new RTCPeerConnection(configuration);

    connections[sid].onicecandidate = function (event) {
        if (event.candidate) {
            socket.emit('newIcecandidate', event.candidate, sid);
        }
    };

    connections[sid].ontrack = function (event) {
        if (!document.getElementById(sid)) {
            console.log('track event fired')
            let vidCont = document.createElement('div');
            let newvideo = document.createElement('video');
            let name = document.createElement('div');
            let videoOff = document.createElement('div');
            
            videoOff.classList.add('video-off');
            name.classList.add('nametag');
            name.innerHTML = `${cName[sid]}`;
            vidCont.id = sid;
            videoOff.id = `vidoff${sid}`;
            videoOff.innerHTML = 'Video Off'
            vidCont.classList.add('video-box');
            newvideo.classList.add('video-frame');
            newvideo.autoplay = true;
            newvideo.playsinline = true;
            newvideo.id = `video${sid}`;
            newvideo.srcObject = event.streams[0];

            if (videoInfo[sid] == 'on')
                videoOff.style.visibility = 'hidden';
            else
                videoOff.style.visibility = 'visible';

            vidCont.appendChild(newvideo);
            vidCont.appendChild(name);
            vidCont.appendChild(videoOff);

            videoContainer.appendChild(vidCont);
        }
    };

    connections[sid].onremovetrack = function (event) {
        if (document.getElementById(sid)) {
            document.getElementById(sid).remove();
        }
    };

    connections[sid].onnegotiationneeded = function () {
        connections[sid].createOffer()
            .then(function (offer) {
                return connections[sid].setLocalDescription(offer);
            })
            .then(function () {
                socket.emit('video-offer', connections[sid].localDescription, sid);
            })
            .catch(reportError);
    };

    let desc = new RTCSessionDescription(offer);

    connections[sid].setRemoteDescription(desc)
        .then(() => { return navigator.mediaDevices.getUserMedia(mediaConstraints) })
        .then((localStream) => {
            localStream.getTracks().forEach(track => {
                connections[sid].addTrack(track, localStream);
                console.log('added local stream to peer')
                if (track.kind === 'video') {
                    videoTrackSent[sid] = track;
                    if (!videoAllowed)
                        videoTrackSent[sid].enabled = false
                }
            })
        })
        .then(() => {
            return connections[sid].createAnswer();
        })
        .then(answer => {
            return connections[sid].setLocalDescription(answer);
        })
        .then(() => {
            socket.emit('video-answer', connections[sid].localDescription, sid);
        })
        .catch(handleGetUserMediaError);

}

function handleNewIceCandidate(candidate, sid) {
    console.log('new candidate recieved')
    var newcandidate = new RTCIceCandidate(candidate);
    connections[sid].addIceCandidate(newcandidate)
        .catch(reportError);
}

function handleVideoAnswer(answer, sid) {
    console.log('answered the offer')
    const ans = new RTCSessionDescription(answer);
    connections[sid].setRemoteDescription(ans);
}

// 화면공유 버튼 관련
screenShareButt.addEventListener('click', () => {
    screenShareToggle();
});
let screenshareEnabled = false;
function screenShareToggle() {
    let screenMediaPromise;
    if (!screenshareEnabled) {
        if (navigator.getDisplayMedia) {
            screenMediaPromise = navigator.getDisplayMedia({ video: true });
        } else if (navigator.mediaDevices.getDisplayMedia) {
            screenMediaPromise = navigator.mediaDevices.getDisplayMedia({ video: true });
        } else {
            screenMediaPromise = navigator.mediaDevices.getUserMedia({
                video: { mediaSource: "screen" },
            });
        }
    } else {
        screenMediaPromise = navigator.mediaDevices.getUserMedia({ video: true });
    }
    screenMediaPromise
        .then((myscreenshare) => {
            screenshareEnabled = !screenshareEnabled;
            for (let key in connections) {
                const sender = connections[key]
                    .getSenders()
                    .find((s) => (s.track ? s.track.kind === "video" : false));
                sender.replaceTrack(myscreenshare.getVideoTracks()[0]);
            }
            myscreenshare.getVideoTracks()[0].enabled = true;
            const newStream = new MediaStream([
                myscreenshare.getVideoTracks()[0], 
            ]);
            myvideo.srcObject = newStream;
            myvideo.muted = true;
            mystream = newStream;
            screenShareButt.innerHTML = (screenshareEnabled 
                ? `<i class="fas fa-desktop"></i><span class="tooltiptext">Stop Share Screen</span>`
                : `<i class="fas fa-desktop"></i><span class="tooltiptext">Share Screen</span>`
            );
            myscreenshare.getVideoTracks()[0].onended = function() {
                if (screenshareEnabled) screenShareToggle();
            };
        })
        .catch((e) => {
            alert("Unable to share screen:" + e.message);
            console.error(e);
        });
}

socket.on('video-offer', handleVideoOffer);
socket.on('newIcecandidate', handleNewIceCandidate);
socket.on('video-answer', handleVideoAnswer);

socket.on('join', async (conc, cnames,videoinfo) => {
    socket.emit('getCanvas');
    console.log(usernick);
    if (cnames)
        cName = cnames;

    if (videoinfo)
        videoInfo = videoinfo;

    if (conc) {
        await conc.forEach(sid => {
            connections[sid] = new RTCPeerConnection(configuration);

            connections[sid].onicecandidate = function (event) {
                if (event.candidate) {
                    socket.emit('newIcecandidate', event.candidate, sid);
                }
            };

            connections[sid].ontrack = function (event) {
                if (!document.getElementById(sid)) {
                    let vidCont = document.createElement('div');
                    let newvideo = document.createElement('video');
                    let name = document.createElement('div');
                    let videoOff = document.createElement('div');

                    videoOff.classList.add('video-off');
                    name.classList.add('nametag');
                    name.innerHTML = `${cName[sid]}`;
                    vidCont.id = sid;
                    videoOff.id = `vidoff${sid}`;
                    videoOff.innerHTML = 'Video Off'
                    vidCont.classList.add('video-box');
                    newvideo.classList.add('video-frame');
                    newvideo.autoplay = true;
                    newvideo.playsinline = true;
                    newvideo.id = `video${sid}`;
                    newvideo.srcObject = event.streams[0];

                    if (videoInfo[sid] == 'on')
                        videoOff.style.visibility = 'hidden';
                    else
                        videoOff.style.visibility = 'visible';

                    vidCont.appendChild(newvideo);
                    vidCont.appendChild(name);
                    vidCont.appendChild(videoOff);
                    videoContainer.appendChild(vidCont);
                }
            };
            connections[sid].onremovetrack = function (event) {
                if (document.getElementById(sid)) {
                    document.getElementById(sid).remove();
                }
            }

            connections[sid].onnegotiationneeded = function () {
                connections[sid].createOffer()
                    .then(function (offer) {
                        return connections[sid].setLocalDescription(offer);
                    })
                    .then(function () {
                        socket.emit('video-offer', connections[sid].localDescription, sid);
                    })
                    .catch(reportError);
            };

        });
        console.log('added all sockets to connections');
        startCall();

    }
    else {
        console.log('waiting for someone to join');
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localStream => {
                myvideo.srcObject = localStream;
                myvideo.muted = true;
                mystream = localStream;
            })
            .catch(handleGetUserMediaError);
    }
})

socket.on('enterRoom',(usernick)=>{
    //참가자 들어옴
    console.log('enterRoom');
    document.querySelector('#attendies').textContent=`참가자들 (${participant_num})`;
    let div1 = document.createElement('div');
    div1.classList.add('user');
    let nick = document.createElement('span');
    div1.textContent=`${usernick}`;
    div1.setAttribute('data-nick',usernick);
    nick.setAttribute('data-nick',usernick);
    div1.appendChild(nick);
    document.querySelector('#attendies-list').appendChild(div1); 
});


socket.on('removePeer', sid => {
    if (document.getElementById(sid)) {
        document.getElementById(sid).remove();
    }
    delete connections[sid];
})

sendButton.addEventListener('click', () => {
    const chatting = chatField.value;
    chatField.value = '';
    socket.emit('chat', chatting, usernick, roomid);
})

chatField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        sendButton.click();
    }
});

socket.on('chat', (chatting, sendername, time) => {
    chatRoom.scrollTop = chatRoom.scrollHeight;
    if (sendername=='System'){
        chatRoom.innerHTML += `<div class="chat chat-system">
            <div class="info">
                <div class="usernick">${sendername}</div>
            </div>
            <div class="content">
                ${chatting}
            </div>
            <br>
        </div>`
    }
    else if (sendername==usernick) {
        chatRoom.innerHTML += `<div class="chat chat-mine">
            <div class="info">
                <span class="usernick">${sendername}</span>
                <span class="time time-mine">${time}</span>
            </div>
            <div class="content">
                ${chatting}
            </div>
        </div>`
    }
    else{
       chatRoom.innerHTML += `<div class="chat chat-other">
            <div class="info">
                <span class="time time-other">${time}</span>
                <span class="usernick">${sendername}</span>
            </div>
            <div class="content">
                ${chatting}
            </div>
        </div>`
    }
    
});

videoButt.addEventListener('click', () => {
    if (videoAllowed) {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = false;
        }
        videoButt.innerHTML = `<i class="fas fa-video-slash"></i>`;
        videoAllowed = 0;
        videoButt.style.backgroundColor = "#b12c2c";

        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'video') {
                    track.enabled = false;
                }
            })
        }
        myvideooff.style.visibility = 'visible';
        socket.emit('action', 'videooff');
    }
    else {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = true;
        }
        videoButt.innerHTML = `<i class="fas fa-video"></i>`;
        videoAllowed = 1;
        videoButt.style.backgroundColor = "#4ECCA3";
        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'video')
                    track.enabled = true;
            })
        }

        myvideooff.style.visibility = 'hidden';
        socket.emit('action', 'videoon');
    }
})

socket.on('action', (msg, sid) => { 
    if (msg == 'videooff') {
        console.log(sid + 'turned video off');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'visible';
        videoInfo[sid] = 'off';
    }
    else if (msg == 'videoon') {
        console.log(sid + 'turned video on');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'hidden';
        videoInfo[sid] = 'on';
    }
})


cutCall.addEventListener('click', () => {
    location.href = '/';
})
