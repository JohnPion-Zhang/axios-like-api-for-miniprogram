// wxDeligate.js

// 特别指定的wx对象中不进行Promise封装的方法
const noPromiseMethods = {
  clearStorage: 1,
  hideToast: 1,
  showNavigationBarLoading: 1,
  hideNavigationBarLoading: 1,
  drawCanvas: 1,
  canvasToTempFilePath: 1,
  hideKeyboard: 1
}

const promisify = (func) => (options={}) => new Promise((resolve, reject) => {
  let successFilter = options.successFilter || (res => true)
  let mOptions = Object.keys(options).reduce((total, current) => { // 去除success和fail
    if ('success'===current || 'fail'===current) return total
    if ('successFilter'===current) return total
    return { ...total, [current]: options[current] }
  }, {})
  Object.assign(mOptions, {
    success: res => successFilter(res)? resolve(res): reject(res),
    fail: error => error&&error.errMsg&&reject(error.errMsg) || reject(error)
  }) // 注册特定的success和fail, 桥接promise
  return func(mOptions)
}) // end promise

const WXDeligation = new Proxy(promisify, {
  get: (target, prop) => {
    if ('app'===prop) return getApp() // 返回app实例 
    if ('currentPages'===prop) return getCurrentPages() // 返回页面堆赞
    if ('currentPage'===prop) {
      const pages = getCurrentPages()
      return pages[pages.length - 1]
    }
    if ('store'===prop) return getApp()? getApp()._globalData: new Error('failed to getApp and access _globalData of undefined, cause getApp can not be invoked in the hooks of app(not page)') // 返回store实例
    if (!wx.hasOwnProperty(prop)) throw new Error(`${prop}不是wx属性`) // 如果不是微信属性，直接返回
    // if (!(wx[prop]['success'] instanceof Function)) return wx.prop // 没有success方法的直接返回
    return promisify(wx[prop])
  } // end get
}) // end WXPromise

module.exports = WXDeligation
