import {socketUrl} from 'src/config/env';
import {LS, Util} from './util';
import ChatsMsg from 'src/proto/chatsmsg';
import PrivateMsg from 'src/proto/privateMsg';
import PushMsg from 'src/proto/pushMsg';
import ConnMsg from 'src/proto/connmsg';

let chatmsg = new ChatsMsg();
let pushMsg = new PushMsg();
let privateMsg = new PrivateMsg();
let connMsg = new ConnMsg();
const mySocket = {};

mySocket.STATUS = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 3,
}

mySocket.events_key = {
  PRIVATE_MSG: 0x2,  //私聊消息
  GROUP_MSG: 0x3, // 群聊消息
  PUSH_MSG: 0x4, // 发送消息
  MESSAGE_LIST: 0x1, // 首页消息列表
};

if (typeof mySocket.socket != 'object') {
  mySocket.socket = new WebSocket(socketUrl);
}

mySocket.socket.onopen = () => {
  //mySocket.connect();

  mySocket.socket.onmessage = async (evt) => {
    await parseMessage(evt, distribute);
  }

  mySocket.socket.onclose = (evt) => {
    LS.setItem(LS.constant.LOGIN_STATUS, '0');
    mySocket.socket = {};
  }

  mySocket.onerror = (event) => {
  };
}

mySocket.getConnected = function () {
  return mySocket.socket.readyState;
}

//链接socket
mySocket.connect = async () => {
  let token = LS.getItem(LS.constant.TOKEN);
  if (mySocket.getConnected == mySocket.STATUS.CLOSED) {
    mySocket.socket = new WebSocket(socketUrl);
  }

  if (token) {
    let buffer = await connMsg.encode({msg: {Token: token}, msgClass: connMsg.Clazz.CONN_MSG});
    mySocket.send(buffer);
  }
}

mySocket.events = {};
//trigger用来处理页面渲染
mySocket.on = function (key, cb) {
  mySocket.events[key] = cb;
}

//带 flag 发送消息
mySocket.flagSend = function ({buffer, flag}) {
  let flagBuffer = new Uint8Array(1);
  let bufferRes = new Uint8Array(buffer);
  let bufferFull = new Uint8Array(bufferRes.length + 1);
  flagBuffer[0] = flag;
  bufferFull.set(flagBuffer);
  bufferFull.set(bufferRes, 1);
  mySocket.send({buffer: bufferFull});
}

mySocket.send = function ({buffer}) {
  mySocket.socket.send(buffer);
}

//解析socket 消息
function parseMessage(evt, cb) {
  var blob = new Blob([evt.data], {type: 'text/plain'});
  var reader = new FileReader();
  reader.readAsArrayBuffer(blob);
  reader.onload = function () {
    let obj = mySocket.getFlagAndBuffer({buffer: reader.result});
    cb(obj.flag, obj.buffer);
  }
}

//发消息
const distribute = async function (flag, buff) {
  let obj = {};
  let clazz = '';
  switch (flag[0]) {
    case mySocket.events_key.MESSAGE_LIST:
      obj = chatmsg;
      clazz = chatmsg.Clazz.CHATS_MSG;
      break;
    case mySocket.events_key.PRIVATE_MSG:
      obj = privateMsg;
      clazz = privateMsg.Clazz.PRIVATE_MSG;
      break;
    case mySocket.events_key.PUSH_MSG:
      obj = pushMsg;
      clazz = pushMsg.Clazz.PUSH_MSG;
      break;
    case mySocket.events_key.GROUP_MSG:
      obj = pushMsg;
      clazz = pushMsg.Clazz.GROUP_MSG;
      break;
  }

  let result = await obj.decode({buffer: buff, msgClass: clazz});
  mySocket.events[flag[0]](result, flag[0]);
}

//拆分 buffer 里面的 flag 和 body
mySocket.getFlagAndBuffer = function ({buffer}) {
  let flag = new Uint8Array(buffer, 0, 1);
  let buff = new Uint8Array(buffer, 1);
  return {buffer: buff, flag:flag}
}

export default mySocket;
