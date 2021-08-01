const socket = io();
let roomid;
let usernick = document.querySelector('.usernick').dataset.usernick;

function addBtnEvent(e) { // 방 입장 클릭 시
    if (e.target.dataset.password == 'true') {
      const password = prompt('비밀번호를 입력하세요');
      location.href = '/library/' + e.target.dataset.id + '?password=' + password;
    } else {
      location.href = '/library/' + e.target.dataset.id;
    }
    roomid = e.target.dataset.id;
}
  
document.querySelectorAll('.join-btn').forEach(function (btn) {
    btn.addEventListener('click', addBtnEvent);
});
 

