/// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2019 The Johns Hopkins University Applied Physics Laboratory LLC (JHU/APL).  All Rights Reserved.
//
// This material may be only be used, modified, or reproduced by or for the U.S. Government pursuant to the license
// rights granted under the clauses at DFARS 252.227-7013/7014 or FAR 52.227-14. For any other permission, please
// contact the Office of Technology Transfer at JHU/APL: Telephone: 443-778-2792, Internet: www.jhuapl.edu/ott
//
// NO WARRANTY, NO LIABILITY. THIS MATERIAL IS PROVIDED "AS IS." JHU/APL MAKES NO REPRESENTATION OR WARRANTY WITH
// RESPECT TO THE PERFORMANCE OF THE MATERIALS, INCLUDING THEIR SAFETY, EFFECTIVENESS, OR COMMERCIAL VIABILITY, AND
// DISCLAIMS ALL WARRANTIES IN THE MATERIAL, WHETHER EXPRESS OR IMPLIED, INCLUDING (BUT NOT LIMITED TO) ANY AND ALL
// IMPLIED WARRANTIES OF PERFORMANCE, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT OF
// INTELLECTUAL PROPERTY OR OTHER THIRD PARTY RIGHTS. ANY USER OF THE MATERIAL ASSUMES THE ENTIRE RISK AND LIABILITY
// FOR USING THE MATERIAL. IN NO EVENT SHALL JHU/APL BE LIABLE TO ANY USER OF THE MATERIAL FOR ANY ACTUAL, INDIRECT,
// CONSEQUENTIAL, SPECIAL OR OTHER DAMAGES ARISING FROM THE USE OF, OR INABILITY TO USE, THE MATERIAL, INCLUDING,
// BUT NOT LIMITED TO, ANY DAMAGES FOR LOST PROFITS.
/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const ui = require('./ui.js')
const bkup = require('./backup.js')
const ad = require('./abstract-driver.js')
const assert = require('assert').strict
const fs = require('fs')

var limitsID = 'limits'
var limitsPath = 'config/' + limitsID

class LimitEvent {
  constructor({
    ioCall = '',
    interval = 1000,
    value = '',
    state = false,
    condition = '',
    callTrue = '',
    callFalse = '',
  }) {
    this.ioCall = ioCall
    this.condition = condition
    this.value = value
    this.ifTrue = callTrue
    this.ifFalse = callFalse
    this.interval = interval
    this.state = state
  }
}

class LimitC {
  constructor({services, id, limitEvent, description = '', testFlag, server}) {
    this.Limit = new ui.ShowUser({value: id})

    this.Description = new ui.ShowUser({value: description})
    // var options = this.generateOptions(services)
    var options
    Object.defineProperty(this, 'services', {
      writable: true,
      value: services,
    })
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    Object.defineProperty(this, 'server', {
      writable: true,
      value: server,
    })

    Object.defineProperty(this, 'limitEvent', {
      writable: true,
      value: limitEvent
    })

    Object.defineProperty(this, 'Check Interval', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.limitEvent.interval, type: ['output', 'number']})
      },
      set: val => {
        var nval = Number(val)
        if (nval != NaN) {
          this.limitEvent.interval = nval
          // restart timer with new interval
        }
      }
    })
    Object.defineProperty(this, 'IO Call', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.limitEvent.ioCall})
      },
      set: val => {
        if (this.validateCall({call: val})) {
          this.limitEvent.ioCall = val
        }
      }
    })
    Object.defineProperty(this, 'Threshold', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.limitEvent.value}) // will parse number depending on io call type
      },
      set: val => {
        if (this.validateThreshold(val)) {
          this.limitEvent.value = val
        }
      }
    })

    Object.defineProperty(this, 'If TRUE Post', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.limitEvent.ifTrue})
      },
      set: val => {
        if (this.validatePost(val)) {
          this.limitEvent.ifTrue = val
        }
      }
    })

    Object.defineProperty(this, 'If FALSE Post', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.limitEvent.ifFalse})
      },
      set: val => {
        if (this.validatePost(val)) {
          this.limitEvent.ifFalse = val
        }
      }
    })

    Object.defineProperty(this, 'Condition', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.limitEvent.condition})
      },
      set: val => {
        if (this.validCondition(val)) {
          this.limitEvent.condition = val
        }
      }
    })

    this.datastreams = {refreshRate: 500}
    this.updateable = []
    Object.defineProperty(this, 'Summary', {
      enumerable: true,
      get: () => {
        var summary = this.getGenerateSummary()
        return new ui.ShowUser({value: summary, type: ['input', 'string']})
      },
      set: val => {
        // empty method in case someone tries to post to temperature
        console.log('cannot set property to')
        console.log(val)
      },
    })

    Object.defineProperty(this, 'Valid Limit', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.checkLimitEvent(), type: ['input', 'binary']})
      },
      set: val => {
        // empty method in case someone tries to post to temperature
        console.log('cannot set property to')
        console.log(val)
      },
    })
    setInterval(this.loopCheck.bind(this), this.limitEvent.interval)
  }

  loopCheck() {
    if (this['Valid Limit'].value) {
      this.checkCondition()
      this.executeCondition()
    }
  }

  // casts the threshold to be the same type as the ioCall
  castThreshold(strValue, dtype) {
    var ret
    switch (dtype) {
      case 'binary':
        if (strValue === 'true' || strValue === 'TRUE' || strValue === 'True') {
          ret = true
        } else if (val === 'false' || val === 'FALSE' || val === 'False') {
          return false
        } else {
          console.log('Unknown boolean value')
          console.log(strValue)
          console.log('valid booleans are: true TRUE True false FALSE False')
          ret = undefined
        }
        return ret
      case 'number':
        ret = Number(strValue)
        return ret
      case 'string':
        ret = strValue
        return ret
      default:
        console.log('INVALID type')
        return ret
    }
  }

  checkCondition() {
    var obj = {}
    var checkValue
    this.validateCall({call: this.limitEvent.ioCall, obj})
    var dtype = {type: ''} // put this in the limitEvent
    this.typeMatch({apiObj: obj.paramObj, dtype})
    if (obj.paramObj.type[1] === 'datapoint') {
      checkValue = obj.paramObj.value.value
    } else {
      checkValue = obj.paramObj.value
    }

    var threshold = this.castThreshold(this.limitEvent.value, dtype.type)
    if (this.limitEvent.condition === '==') {
      this.limitEvent.state = (checkValue == threshold)

    } else if (this.limitEvent.condition === '>=') {
      this.limitEvent.state = (checkValue >= threshold)

    } else if (this.limitEvent.condition === '<=') {
      this.limitEvent.state = (checkValue <= threshold)

    } else if (this.limitEvent.condition === '>') {
      this.limitEvent.state = (checkValue > threshold)

    } else if (this.limitEvent.condition === '<') {
      this.limitEvent.state = (checkValue < threshold)

    } else if (this.limitEvent.condition === '!=') {
      this.limitEvent.state = (checkValue != threshold)

    } else {
      console.log('Should never be here!!!')
    }
  }

  executeCondition() {
    if (this.limitEvent.state) {
      this.postTrue()
    } else {
      this.postFalse()
    }
  }

  postTrue() {
    var postParts = this.limitEvent.ifTrue.split(' ')
    var apiCall = postParts.slice(0, postParts.length - 1).join(' ')
    var val = postParts[postParts.length - 1]
    this.postVal(apiCall, val)
  }

  postFalse() {
    var postParts = this.limitEvent.ifFalse.split(' ')
    var apiCall = postParts.slice(0, postParts.length - 1).join(' ')
    var val = postParts[postParts.length - 1]
    this.postVal(apiCall, val)
  }

  postVal(call, val) {
    var callParts = call.split('/')
    if (this.testFlag) console.log(callParts)
    // callParts[0] === 'api'
    var topObj
    // var path
    var serviceIndex
    this.services.forEach((item, i) => {
      if (this.testFlag) console.log(item.id)
      if (item.id === callParts[1]) {
        serviceIndex = i
        topObj = item.obj
        // path = item.path
      }
    })
    if (this.testFlag) console.log(topObj)
    var componentObj = this.findSubObj(callParts[2], topObj) // e.g. valves -> 0
    if (this.testFlag) console.log(componentObj)
    var paramObj = this.findSubObj(callParts[3], componentObj) // e.g. valves -> 0 -> State
    if (this.testFlag) console.log(paramObj)
    if (paramObj === undefined) {
      console.log('Invalid API call!')
      console.log('NOT EXECUTING!')
      console.log(call)
      console.log(val)
      return
    }
    if (this.server) {
      this.server.handlePost({
        key: callParts[2],
        value: componentObj,
        subkey: callParts[3],
        subvalue: paramObj,
        service: this.services[serviceIndex],
        body: val,
        res: {
          send: () => {},
          json: () => {},
          status: () => {
            console.log('Mode Post Error')
            return {
              send: error => {
                console.log(error)
              },
            }
          },
        },
        basePath: '', // note: this would need to be filled in to use links
      })
    }
  }

  checkLimitEvent() {
    if (this.validateCall({call: this.limitEvent.ioCall}) &&
      this.validateThreshold(this.limitEvent.value) &&
      this.validCondition(this.limitEvent.condition) &&
      (this.validatePost(this.limitEvent.ifTrue) || this.validatePost(this.limitEvent.ifFalse))
    ) {
      return true
    } else {
      return false
    }
  }

  translateCall(call) {
    var callParts = call.slice().split('/')
    console.log(callParts)
    if (callParts.length >= 4) {
      var ret = callParts[1].charAt(0).toUpperCase() + callParts[1].slice(1)
      ret += ' ' + callParts[2]
      return ret
    } else {
      return ''
    }
  }

  translatePostCall(call) {
    var callParts = call.slice().split('/')
    console.log(callParts)
    if (callParts.length >= 4) {
      var ret = callParts[1].charAt(0).toUpperCase() + callParts[1].slice(1)
      ret += ' ' + callParts[2] + ' ' + callParts[3]
      return ret
    } else {
      return ''
    }

  }

  getGenerateSummary() {
    var summary = 'If ' + this.translateCall(this.limitEvent.ioCall) + ' ' +
                  this.limitEvent.condition + ' ' + this.limitEvent.value +
                  ', then post ' + this.translatePostCall(this.limitEvent.ifTrue) +
                  ' or else post ' + this.translatePostCall(this.limitEvent.ifFalse) + '.'
    return summary
  }

  validCondition(val) {
    if (val === '==') {
      return true
    } else if (val === '>=') {
      return true
    } else if (val === '<=') {
      return true
    } else if (val === '>') {
      return true
    } else if (val === '<') {
      return true
    } else if (val === '!=') {
      return true
    } else {
      return false
    }
  }

  findSubObj(callkey, obj) {
    var retObj
    // console.log('find subobj')
    if (obj === undefined) {
      return undefined
    }
    Object.entries(obj).forEach(([key, value]) => {
      // console.log(key)
      if (callkey === key) {
        retObj = value
      }
    })
    return retObj
  }

  validateCall({call, obj = {}}) {
    var callParts = call.split('/')
    if (this.testFlag) console.log(callParts)
    // callParts[0] === 'api'
    var topObj
    // var path
    var serviceIndex
    this.services.forEach((item, i) => {
      if (this.testFlag) console.log(item.id)
      if (item.id === callParts[1]) {
        serviceIndex = i
        topObj = item.obj
        // path = item.path
      }
    })
    if (this.testFlag) console.log(topObj)
    var componentObj = this.findSubObj(callParts[2], topObj) // e.g. valves -> 0
    if (this.testFlag) console.log(componentObj)
    var paramObj = this.findSubObj(callParts[3], componentObj) // e.g. valves -> 0 -> State
    if (this.testFlag) console.log(paramObj)
    if (paramObj === undefined) {
      console.log('Invalid API call!')
      console.log(call)
      return false
    } else {
      obj.paramObj = paramObj
      return true
    }
  }

  validatePost(postExpression) {
    var postParts = postExpression.split(' ')
    var apiCall = postParts.slice(0, postParts.length - 1).join(' ')
    var val = postParts[postParts.length - 1]
    var paramObj = {}
    if (this.validateCall({call: apiCall, obj: paramObj})) {
      console.log('validate Post obj')
      console.log(paramObj)
      if (this.typeMatch({apiObj: paramObj.paramObj, val})) {
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  }

  checkBoolean(val) {
    if (val === 'true' || val === 'TRUE' || val === 'True') {
      return true
    } else if (val === 'false' || val === 'FALSE' || val === 'False') {
      return true
    } else {
      return false
    }
  }

  typeMatch({apiObj, val, dtype = {type: ''}}) {
    // figure this out
    switch (apiObj.type[1]) {
      case 'binary':
        dtype.type = 'binary'
        return this.checkBoolean(val)
      case 'number':
        dtype.type = 'number'
        return (Number(val) !== NaN)
      case 'string':
        dtype.type = 'string'
        return (typeof val === 'string')
      case 'datapoint':
        var datapointType = typeof apiObj.value.value
        if (datapointType === 'boolean') {
          datapointType = 'binary'
        }
        var tempObj = {value: apiObj.value.value, type: ['na', datapointType]}
        console.log('tempObj')
        console.log(tempObj)
        console.log(dtype)
        return this.typeMatch({apiObj: tempObj, val, dtype})
      case 'list':
        return false
      case 'link':
        return false
      case 'dateRange':
        return false
      case 'button':
        return false
      default:
        return false
    }
  }

  validateThreshold(val) {
    var paramObj = {}
    if (this.validateCall({call: this.limitEvent.ioCall, obj: paramObj})) {
      console.log(paramObj)
      if (this.typeMatch({apiObj: paramObj.paramObj, val})) {
        console.log('threshold validated')
        return true
      } else {
        console.log('threshold NOT validated')
        return false
      }
    } else {
      return false
    }
  }
}

var limitsMap = {}

module.exports = {
  initialize: async function (test, services, serverInstance) {
    // test = true
    console.log('intializing limits')
    if (bkup.configExists(limitsPath)) {
      var loadMap = bkup.load(limitsPath)
      console.log('Loading from files')
      Object.entries(loadMap).forEach(([key, value]) => {
        if (value.Limit) {
          console.log(key)
          limitsMap[value.Limit.value] = (new LimitC({
            services: services,
            id: value.Limit.value,
            limitEvent: new LimitEvent({
              ioCall: value['IO Call'].value,
              interval: value['Check Interval'].value,
              value: value.Threshold.value,
              state: false,
              condition: value['Condition'].value,
              callTrue: value['If TRUE Post'].value,
              callFalse: value['If FALSE Post'].value,
            }),
            testFlag: test,
            server: serverInstance,
          }))
          if (value.Sequence !== undefined) {
            limitsMap[value.Limit.value].Sequence.value = value.Sequence.value
          }
          if (value.Description !== undefined) {
            limitsMap[value.Limit.value].Description.value = value.Description.value
          }
        } else {
          // did not have bare minimum so fail out loudly
          console.log('Configuration missing critical component(s):')
          console.log('value.Limit')
          console.log(value)
        }
      })
    } else {
      for (var i = 1; i <= 2; i++) {
        // limitsMap.push(new Timeline({services: services, id: i}))
        limitsMap[i.toString()] = (new LimitC({
          services: services,
          id: i,
          limitEvent: new LimitEvent({}),
          testFlag: test,
          server: serverInstance,
        }))
        bkup.save(limitsMap[i.toString()], limitsPath)
      }
    }
    //
    console.log('limitsMap')
    console.log(limitsMap)
    return
  },
  id: limitsID,
  obj: limitsMap,
  path: limitsPath,
}
