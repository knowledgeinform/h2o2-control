/// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2019 The Johns Hopkins University Applied Physics Laboratory LLC (JHU/APL).  All Rights Reserved.
//
// This material may be only be used, modified, or reproduced by or for the U.S. Government pursuant to the license
// rights granted under the clauses at DFARS 252.227-7013/7014 or FAR 52.227-14. For any other permission, please
// contact the Office of Technology Transfer at JHU/APL: Telephone: 443-778-2792, Internet: www.jhuapl.edu/ott
//
// NO WARRANTY, NO LIABILITY. THIS MATERIAL IS PROVIDED 'AS IS.' JHU/APL MAKES NO REPRESENTATION OR WARRANTY WITH
// RESPECT TO THE PERFORMANCE OF THE MATERIALS, INCLUDING THEIR SAFETY, EFFECTIVENESS, OR COMMERCIAL VIABILITY, AND
// DISCLAIMS ALL WARRANTIES IN THE MATERIAL, WHETHER EXPRESS OR IMPLIED, INCLUDING (BUT NOT LIMITED TO) ANY AND ALL
// IMPLIED WARRANTIES OF PERFORMANCE, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT OF
// INTELLECTUAL PROPERTY OR OTHER THIRD PARTY RIGHTS. ANY USER OF THE MATERIAL ASSUMES THE ENTIRE RISK AND LIABILITY
// FOR USING THE MATERIAL. IN NO EVENT SHALL JHU/APL BE LIABLE TO ANY USER OF THE MATERIAL FOR ANY ACTUAL, INDIRECT,
// CONSEQUENTIAL, SPECIAL OR OTHER DAMAGES ARISING FROM THE USE OF, OR INABILITY TO USE, THE MATERIAL, INCLUDING,
// BUT NOT LIMITED TO, ANY DAMAGES FOR LOST PROFITS.
/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// hello world
// manufacturer: 'Digi International'
//  constructor({portPath, testFlag=true, baud=9600, timing=false, maxQueueLength=100, delimiter='\r', manufacturer, seriallineSerial}) {

const ad = require('./abstract-driver.js')
const Controller = require('./node-pid.js')
const vaisala = require('./vaisala-hpp272.js')
const ui = require('./ui.js')
const db = require('./database.js')
const bkup = require('./backup.js')

class H2O2Class {
  constructor({testFlag = false,
    services,
    serverInstance,
    router,
    restartWait = 1000 * 60 * 60 * 4,
    h2o2DriverPath,
    server,
    index,
  }) {
    server = serverInstance
    this.ID = new ui.ShowUser({value: router}) // for database backup purposes
    this.index = index
    this.h2o2DriverPath = h2o2DriverPath
    this.server = server
    this.testFlag = testFlag
    this.services = services
    this.dflow = 0
    this.CO0 = new ad.DataPoint({units: 'SLPM'})
    this.hflow = 0
    this.numberPVs = 4
    this.numberSPs = 2
    this.device = new vaisala.Device({rtuAddress: 240, router: router, testFlag: this.testFlag, debugTest: false})

    Object.defineProperty(this, 'PV0', {
      enumerable: true,
      get: () => {
        return this.device.PV0
      },
    })

    this.PV1 = new ad.DataPoint({value: this.dflow + this.hflow, units: 'SLPM'}) // process variable

    Object.defineProperty(this, 'PV2', {
      enumerable: true,
      get: () => {
        return this.device.PV1
      },
    })

    Object.defineProperty(this, 'PV3', {
      enumerable: true,
      get: () => {
        return this.device.PV2
      },
    })

    this.ctr = new Controller({
      kp: -0.00000000935,
      ki: 0.005,
      kd: 0,
      dt: 1000, // milliseconds
      outMin: 0,
      outMax: 5,
    })
    this.hSP0 = new ad.DataPoint({value: 0, units: 'ppm'})
    Object.defineProperty(this, 'SP0', {
      enumerable: true,
      get: () => {
        return this.hSP0
      },
      set: val => {
        this.hSP0.value = val
        this.hSP0.time = Date.now()
        this.ctr.setTarget(this.hSP0.value)
      },
    })
    this.hSP1 = new ad.DataPoint({value: 2, units: 'SLPM'})
    Object.defineProperty(this, 'SP1', {
      enumerable: true,
      get: () => {
        return this.hSP1
      },
      set: val => {
        this.hSP1.value = val
        this.hSP1.time = Date.now()
      },
    })

    this.ctr.setTarget(this.hSP0.value) // % Relative Humidity
    this.checkInterval = 3000 // interval (ms) to wait before checking lastRead

    this.AdditionalFields = {Enable: new ui.ShowUser({value: false, type: ['output', 'binary']})}
    if (this.h2o2DriverPath !== undefined) {
      this.getStaticSettings()
    }
    Object.defineProperty(this.AdditionalFields, 'k_p', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.ctr.kp, type: ['output', 'number']})
      },
      set: val => {
        this.ctr.kp = val
      },
    })
    Object.defineProperty(this.AdditionalFields, 'k_i', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.ctr.ki, type: ['output', 'number']})
      },
      set: val => {
        this.ctr.ki = val
      },
    })
    Object.defineProperty(this.AdditionalFields, 'k_d', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.ctr.kd, type: ['output', 'number']})
      },
      set: val => {
        this.ctr.kd = val
      },
    })
    // this.initialize()
  }

  getStaticSettings() {
    var cMap = bkup.load(this.h2o2DriverPath)
    console.log('Loaded controller map')
    console.log(cMap)
    if (Object.prototype.hasOwnProperty.call(cMap, this.index)) {
      var thisObj = cMap[this.index]
      console.log('Loading static settings')
      console.log(thisObj)
      if (Object.prototype.hasOwnProperty.call(thisObj, 'k_p')) this.ctr.kp = thisObj.k_p.value
      if (Object.prototype.hasOwnProperty.call(thisObj, 'k_i')) this.ctr.ki = thisObj.k_i.value
      if (Object.prototype.hasOwnProperty.call(thisObj, 'k_d')) this.ctr.kd = thisObj.k_d.value
    }
  }

  Read() {
    // placeholder for now
    // contents got moved to this.connect
  }

  process() {
    console.log('pid processing')
    this.lastRead = Date.now()
    // console.log(d)
    var tempPV = this.PV0.value
    if (isNaN(tempPV)) {
      return
    }
    console.log('pid got here 1')
    this.CO0.value = this.ctr.update(this.PV0.value)
    this.CO0.time = Date.now()
    console.log('pid got here 2')
    if (!isNaN(this.CO0.value)) {
      console.log('pid got here 3')
      this.hflow = this.CO0.value
      if (this.hflow > this.SP1.value) {
        this.hflow = this.SP1.value
      }
      if (this.hflow < 0) {
        this.hflow = 0
      }
      this.dflow = this.SP1.value - this.hflow
      if (this.AdditionalFields.Enable.value) {
        this.dryMFCsp(this.dflow)
        this.wetMFCsp(this.hflow)
      }
    }

    console.log('pid got here 4')

    this.PV1.value = this.dryMFCmassFlow() + this.wetMFCmassFlow()
    this.PV1.time = Date.now()

    console.log(tempPV)
    console.log('PV: '+this.PV0.value.toString())
    console.log('MV: '+this.CO0.value.toString())
    console.log('dflow: '+this.dflow.toString())
    console.log('hflow: '+this.hflow.toString())
  }

  dryMFCsp(val) {
    var call = 'api/MFCs/A/Set Point'
    if (!this.testFlag) {
      this.postVal(call, val)
    }
  }

  wetMFCsp(val) {
    var call = 'api/MFCs/B/Set Point'
    if (!this.testFlag) {
      this.postVal(call, val)
    }
  }

  dryMFCmassFlow() {
    return this.services[3].obj.A['Mass Flow'].value.value
  }

  wetMFCmassFlow() {
    return this.services[3].obj.B['Mass Flow'].value.value
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

  postVal(call, val) {
    var callParts = call.split('/')
    if (this.testFlag) console.log(callParts)
    // callParts[0] == 'api'
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

  initialize() {
    // nothing for now
    console.log(this.PV0)
    console.log(this.PV1)
    console.log(this.PV2)
    console.log(this.PV3)
    setInterval(this.process.bind(this), this.checkInterval)
  }
}

// setTimeout(() => {
//     console.log('Starting')
// },4000)

module.exports = {
  Device: H2O2Class,
}
