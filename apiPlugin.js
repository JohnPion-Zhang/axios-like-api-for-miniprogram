// apiPlugin.js
const WXDeligate = require('wxDeligate')
const login = require('login')

exports.addTokenToRequestHeader = ({ data, header }) => ({ data, header: { ...header, Authorization: WXDeligate.store.user.token || null } })

exports.checkSessionBeforeRequest = async ({data, header}) => {
  if ('UNDEFINED'===WXDeligate.store['&_WXSESSION_VALID']) {
    let mCheckResult = await WXDeligate.checkSession()
    WXDeligate.store['&_WXSESSION_VALID'] = 'checkSession:ok'===mCheckResult['errMsg']? 'YES': 'NO'
  } // end if
  if ('NO'===WXDeligate.store['&_WXSESSION_VALID']) {
    let {
      code
    } = await WXDeligate.login()
    WXDeligate.store.code = code
  } // end if
  WXDeligate.store['&_WXSESSION_VALID'] = 'YES'
  return { data, header }
}
/**
* 重新登录该在这里设下逻辑, 两种情况
* 1. 授权登录
* 2. 重新登录, 直接调用wx.login
*/
exports.checkTokenBeforeRequest = async ({ data, header }) => {
  console.log('check token is valid', header.Authorization)
  if (null == header.Authorization || 'defaultToken'===header.Authorization) {
    await login()
  }
  return ({ data, header })
} // end checkTokenBeforeRequest

exports.responseNetworkOrServerErrorFilter = response => 'request:ok'===response.errMsg? response: new Error('Network Error or Server shutdown') 

exports.response404Filter = response => 404 !== response.statusCode? response: new Error('not found')

exports.response401Filter = response => 401 !== response.statusCode? response: new Error('require to login')

exports.response407Filter = response => 407 !== response.statusCode? response: new Error('require to relogin')

exports.response500Filter = response => 500 !== response.statusCode? response: new Error(`server error: ${response.data.message}`)

// 这个过滤器将过滤掉基础的对象，只剩下{ code, message, data }
exports.response200_300Filter = response => response.statusCode < 200? new Error(`filed to request, cause response status is ${response.statusCode}`): response.statusCode >= 300? new Error(`filed, cause response status is ${response.statusCode}`): response.data

/**
* @see 这个写法依赖比较严重，建议直接在每个service里面自己写不同的code相应的处理逻辑，更加灵活
* @paramter codeMapper可以声明mapper, 自动匹配相应的code的**错误提示语**. eg: { 1: 'xxx', 2: 'yyyy' }
* 这个过滤器过滤掉code, message
* 过滤掉code不为0的
*/ 
exports.responseCodeFilter = (codeMapper={}) => ({ code, message, data }) => 0 === code ?data: codeMapper[code]? new Error(`failed to request, cause business eror: ${codeMapper[code]}`): new Error(`failed to request, cause business eror: ${message}`) 

exports.response0CodeFilter = ({ code, message, data }) => 0 === code? data: new Error(`failed to request, cause business erorr`) 
