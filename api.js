// api.js
const WXDeligate = require('./wxDeligate')
const Plugins = require('./apiPlugin')
const Errors = require('error')

const options = {
  baseURL: 'https://private-1affbb-ballheaven.apiary-mock.com/weapp',
  url: '',
  params: null,
  data: null,
  header: { accept: 'application/json' },
  method: 'GET',
  dataType: 'json',
  responseType: 'text',
  paramsSerializer: (params => ''),
  transformRequest: [({data, header}) => ({data, header}), Plugins.addTokenToRequestHeader],
  transformResponse: [
    response => response, 
    Plugins.responseNetworkOrServerErrorFilter,
    Plugins.response500Filter,
    Plugins.response404Filter,
    Plugins.response401Filter,
    Plugins.response407Filter,
    Plugins.response200_300Filter,
    // Plugins.responseCo deFilter()
  ] // end transformResponse
} // end options

/**
* @params functions 由function构成的数组
* @return function, tips: 传参要求{data: xxx, header: yyy}格式
*/
const compose = funcs => {
  if (funcs.length === 0) {
    return arg => arg // 返回一个无意义的function, 即返回原值，什么都不做
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduceRight((a, b) => (...args) => a(b(...args)))
} // end compose

const composePromises = funcs => {
  if (funcs.length === 0) {
    return arg => Promise.resolve(arg) // 返回一个无意义的function, 即返回原值，什么都不做
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduceRight((a, b) => (...args) => b(...args).then(a))
} // end composePromises

const composeAsync = funcs => {
  if (funcs.length === 0) {
    return arg => Promise.resolve(arg) // 返回一个无意义的function, 即返回原值，什么都不做
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduceRight((a, b) => async (...args) => a(await b(...args)) )
} // end composeAsync

const delay = second => new Promise(resolve => {
  setTimeout(second => resolve(second), second * 1000)
})


const defaultOptionSet = (newOption, defaultOption) => newOption || defaultOption

const additiveOptionArraySet = (newOptions, defaultOptions) => newOptions instanceof Array? defaultOptions.concat(newOptions): defaultOptions

/**
* @params options
* @return {promise of get/post/put/delete}
*/
const api = (pOptions={}) => {
  let baseURL = defaultOptionSet(pOptions.baseURL, options.baseURL),
      params = defaultOptionSet(pOptions.params, options.params),
      data = defaultOptionSet(pOptions.data, options.data),
      header = defaultOptionSet(pOptions.header, options.header),
      dataType = defaultOptionSet(pOptions.dataType, options.dataType),
      responseType = defaultOptionSet(pOptions.responseType, options.responseType),
      paramsSerializer = defaultOptionSet(pOptions.paramsSerializer, options.paramsSerializer),
      transformRequest = additiveOptionArraySet(pOptions.transformRequest, options.transformRequest),
      transformResponse = additiveOptionArraySet(pOptions.transformResponse, options.transformResponse)

  const mDataAndHeaderFunc = composeAsync(transformRequest)

  const buildRequest = method => async url => WXDeligate.request({ 
    method, 
    url: baseURL + url + paramsSerializer(params), // 构造url paramters拼接
    dataType,
    responseType,
    ...await mDataAndHeaderFunc({ header, data }),
  }) // end request
    .then(response => compose(transformResponse) (response))

  return {
    get: url => buildRequest('GET') (url),
    post: url => buildRequest('POST') (url),
    put: url => buildRequest('PUT') (url),
    delete: url => buildRequest('DELETE') (url)
  } // end return
} // end api

const apiWithToken = (pOptions={}) => api({
  transformRequest: [ Plugins.checkSessionBeforeRequest, Plugins.checkTokenBeforeRequest ],
  ...pOptions
}) 

const apiWithoutToken = (pOptions=undefined) => api(pOptions)

exports.apiWithToken = apiWithToken
exports.apiWithoutToken = apiWithoutToken
