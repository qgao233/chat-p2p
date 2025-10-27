/**
 * WebRTC 配置
 * TURN 服务器用于在无法直连时中继连接
 */

export const rtcConfig: RTCConfiguration = {
  iceServers: [
    // 公共 STUN 服务器（用于发现公网 IP）
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    // 公共 TURN 中继服务器（用于无法直连时的中继）
    {
      urls: ['turn:relay1.expressturn.com:3478'],
      username: 'efQUQ79N77B5BNVVKF',
      credential: 'N4EAUgpjMzPLrxSS',
    },
  ],
}

