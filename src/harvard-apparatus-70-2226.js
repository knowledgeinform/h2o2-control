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

const ui = require('./ui.js')
// const fs = require('fs')
const bkup = require('./backup.js')
const db = require('./database.js')
const ad = require('./abstract-driver.js')
var EventEmitter = require('events')

var haPumpID = 'HAPumps'
var haPumpsPath = 'config/' + haPumpID

var haPumpMap = {
  '01': {ID: '01', Description: 'H2O2', Details: '', setPoint: 0, gasType: 'Air'},
}

var stateDict = {
  ':': 'Stopped',
  '>': 'Running Forward',
  '<': 'Running Reverse',
  '*': 'Stalled',
  '*I': 'Infuse limit switch actuated',
  '*W': 'Withdraw limit switch actuated',
  '*D': 'Disabled by emergency stop',
  '*T': 'Target volume reached',
}

var rateUnits = {
  'uL/min': 'ULM',
  'mL/min': 'MLM',
  'uL/hr': 'ULH',
  'mL/hr': 'MLH',
}

class HAPump702226 extends EventEmitter {
  constructor({id = '01',
    router,
    testFlag = false,
    maxRefreshInterval = 1000,
    units = 'ml/min',
  }) {
    super()
    this.id = id
    this.router = router
    this.testFlag = testFlag

    this.firmware = ''
    this.state = 'undefined'

    this.hidden = {}
    this.hidden.rate = new ad.DataPoint({value: -1})
    this.hidden.rateWithdrawal = new ad.DataPoint({value: -1})
    this.hidden.diameter = new ad.DataPoint({value: -1, units: 'mm'})
    this.units = units

    this.lockRefreshInterval = false
    this.maxRefreshInterval = maxRefreshInterval
    this.lastReadTime = {}

    this.timeout = 500 // ms
    this.serialControl = new ad.SerialControl({
      router: this.router,
      testFlag: this.testFlag,
      timeout: this.timeout,
      // interMessageWait: 500,
      debugTest: false,
    })
  }

  async initialize() {
    try {
      await this.getVersion()
      await this.getRate()
      await this.getWithdrawalRate()
      await this.getDiameter()
      console.log('figure out what to do for units')
    } catch(error) {
      console.log('init error')
      console.log(error)
    }

    this.emit('initialized')
  }

  async setMaxRate() {
    var command = this.id + 'MAX\r'
    var ret
    console.log('set rate')
    console.log(command)
    try {
      ret = await this.serialControl.serial(command, false, 2000)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      this.getState(parts1[1])
    } catch (error) {
      console.log('set max rate error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async setMaxWithdrawRate() {
    var command = this.id + 'MAXW\r'
    var ret
    console.log('set rate')
    console.log(command)
    try {
      ret = await this.serialControl.serial(command, false, 2000)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      this.getState(parts1[1])
    } catch (error) {
      console.log('set max withdraw rate error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async setRateWithdrawal(val) {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + rateUnits[this.units] + 'W ' + Number(val) + '\r'
    var ret
    console.log('set rate')
    console.log(command)
    try {
      ret = await this.serialControl.serial(command, false, 1000)
      this.getState(ret[0])
    } catch (error) {
      console.log('set withdrawal rate error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async setRate(val) {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + rateUnits[this.units] + ' ' + Number(val) + '\r'
    var ret
    console.log('set rate')
    console.log(command)
    try {
      ret = await this.serialControl.serial(command, true, 2000)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      this.getState(parts1[1])
    } catch (error) {
      console.log('set infuse rate error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  set rate(val) {
    this.setRate(val).catch(error => {
      console.log('Set Rate error')
      console.log(error)
    })
  }

  get rate() {
    this.getRate().catch(error => {
      console.log('Rate error')
      console.log(error)
    })
    return this.hidden.rate
  }

  set rateWithdrawal(val) {
    this.setRateWithdrawal(val).catch(error => {
      console.log('Set Withdrawal Rate error')
      console.log(error)
    })
  }

  get rateWithdrawal() {
    this.getWithdrawalRate().catch(error => {
      console.log('Withdrawal rate error')
      console.log(error)
    })
    return this.hidden.rateWithdrawal
  }

  async getWithdrawalRate() {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'RATW\r'
    var ret
    try {
      ret = await this.serialControl.serial(command, true)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      var parts = parts1[1].split(/[ ]+/)
      this.hidden.rateWithdrawal.value = Number(parts[1])
      this.hidden.rateWithdrawal.units = parts[2]
      this.hidden.rateWithdrawal.time = Date.now()
      this.getState(parts1[2])
      console.log(this.hidden.rateWithdrawal)
    } catch (error) {
      console.log('get withdrawal rate error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async getRate() {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'RAT\r'
    var ret
    try {
      ret = await this.serialControl.serial(command, true)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      var parts = parts1[1].split(/[ ]+/)
      this.hidden.rate.value = Number(parts[1])
      this.hidden.rate.units = parts[2]
      this.hidden.rate.time = Date.now()
      this.getState(parts1[2])
      console.log(this.hidden.rate)
    } catch (error) {
      console.log('get infuse rate error')
      console.log(error)
      throw error
    }
    // console.log('ret')
    // console.log(ret)
    return
  }

  async getWithdrawUnits() {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'RNG\r'
    var ret
    try {
      ret = await this.serialControl.serial(command, true)
      this.hidden.rateWithdrawal.units = ret[1]
      this.getState(ret[0])
      console.log(this.hidden.rateWithdrawal)
    } catch (error) {
      console.log('get withdrawal units error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async getInfuseUnits() {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'RNG\r'
    var ret
    try {
      ret = await this.serialControl.serial(command, true)
      this.hidden.rate.units = ret[1]
      this.getState(ret[0])
      console.log(this.hidden.rate)
    } catch (error) {
      console.log('get infuse units error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async getUnits() {
    try {
      this.getInfuseUnits()
      this.getWithdrawUnits()
    } catch (error) {
      console.log('get units error')
      console.log(error)
      throw error
    }
    return
  }

  async getDiameter() {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'DIA\r'
    var ret
    try {
      ret = await this.serialControl.serial(command, true)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      var parts = parts1[1].split(/[ ]+/)
      this.hidden.diameter.time = Date.now()
      this.hidden.diameter.value = Number(parts1[1])
      this.getState(parts1[2])
      console.log(this.hidden.diameter)
    } catch (error) {
      console.log('get diameter error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async setDiameter(val) {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'MMD ' + Number(val) + '\r'
    var ret
    try {
      ret = await this.serialControl.serial(command, true, 2000)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      this.getState(parts1[1])
    } catch (error) {
      console.log('set diameter error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  set diameter(val) {
    this.setDiameter(val).catch(error => {
      console.log('set diameter error')
      console.log(error)
    })
  }

  get diameter() {
    this.getDiameter().catch(error => {
      console.log('get diameter error')
      console.log(error)
    })
    return this.hidden.diameter
  }

  getState(idString) {
    var state = idString.replace(this.id, '')
    console.log('state')
    console.log(state)
    this.state = stateDict[state]
    console.log(this.state)
  }

  async run() {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'RUN\r'
    var ret
    try {
      ret = await this.serialControl.serial(command, false)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      this.getState(parts1[1])
    } catch (error) {
      console.log('run error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async runWithdraw() {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'RUNW\r'
    var ret
    try {
      ret = await this.serialControl.serial(command, false)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      this.getState(parts1[1])
    } catch (error) {
      console.log('runWithdraw error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async stop() {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'STP\r'
    var ret
    try {
      ret = await this.serialControl.serial(command, false)
      ret = ret.toString()
      console.log('ret')
      console.log(ret)
      var parts1 = ret.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      this.getState(parts1[1])
    } catch (error) {
      console.log('stop error')
      console.log(error)
      throw error
    }
    console.log('ret')
    console.log(ret)
    return
  }

  async getVersion() {
    // return new Promise(async (resolve, reject) => {
    var command = this.id + 'VER\r'
    var firmware
    try {
      firmware = await this.serialControl.serial(command, true, 2000)
      firmware = firmware.toString()
      console.log('firmware')
      console.log(firmware)
      var parts1 = firmware.split('\r\n')
      console.log('parts1')
      console.log(parts1)
      this.firmware = parts1[1]
      // this.getState(parts1[2])
    } catch (error) {
      console.log('getVersion error')
      console.log(error)
      throw error
    }
    console.log('firmware')
    console.log(firmware)
    return
  }
}

class HAPump {
  constructor({id,
    router,
    testFlag,
    Description,
    Details,
    thisHAPumpsPath = haPumpsPath,
    thisHAPumpmap = haPumpMap,
    units,
    // apiReinit,
  }) {
    this.ID = new ui.ShowUser({value: id.toString()})
    Object.defineProperty(this, 'hidden', {
      value: new HAPump702226({id: id, router: router, testFlag: testFlag, debugTest: false, units: units}),
    })
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    // console.log(this.hidden)
    Object.defineProperty(this, 'Units', {
      enumerable: true,
      get: () => {
        var units = this.hidden.units
        // var val = this.hidden.gas.value
        // if (this.testFlag) console.log(gas)
        // if (this.testFlag) console.log(val)

        return (new ui.ShowUser({value: units, type: ['output', 'list']}))
      },
      set: (val) => {
        console.log('Units setter')
        if (Object.keys(rateUnits).includes(val)) {
          console.log('Setting units to: ' + val)
          this.hidden.units = val
        }
      },
    })
    this.datastreams = {refreshRate: 7000}
    this.Description = new ui.ShowUser({value: Description})
    this.Details = new ui.ShowUser({value: Details})
    this.updateable = ['Units', 'Syringe Diameter', 'Rate', 'Withdraw Rate']
    this.nonupdateable = ['Firmware']
    Object.defineProperty(this, 'Unitslist', {
      get: function () {
        return Object.keys(rateUnits)
      },
    })
    Object.defineProperty(this, 'State', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hidden.state, type: ['input', 'string']})
      },
    })

    Object.defineProperty(this, 'Syringe Diameter', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hidden.diameter, type: ['output', 'datapoint']})
      },
      set: (val) => {
        console.log('Inside syringe diameter setter')
        this.hidden.diameter = val
      },
    })

    Object.defineProperty(this, 'Rate', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hidden.rate, type: ['output', 'datapoint']})
      },
      set: (val) => {
        console.log('Inside rate setter')
        this.hidden.rate = val
      },
    })

    Object.defineProperty(this, 'Withdraw Rate', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hidden.rateWithdrawal, type: ['output', 'datapoint']})
      },
      set: (val) => {
        console.log('Inside rateWithdrawal setter')
        this.hidden.rateWithdrawal = val
      },
    })

    Object.defineProperty(this, 'Run', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: new ui.Action({name: 'post', data: ''}), type: ['output', 'button']}))
      },
      set: ({res}) => {
        this.hidden.run().catch(error => {
          console.log('Run error')
          console.log(error)
        })
        res.json({type: ['nothing']})
        // res.json(this.Sequence)
      },
    })

    Object.defineProperty(this, 'Withdraw', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: new ui.Action({name: 'post', data: ''}), type: ['output', 'button']}))
      },
      set: ({res}) => {
        this.hidden.runWithdraw().catch(error => {
          console.log('Run withdrawal error')
          console.log(error)
        })
        res.json({type: ['nothing']})
        // res.json(this.Sequence)
      },
    })

    Object.defineProperty(this, 'Stop', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: new ui.Action({name: 'post', data: ''}), type: ['output', 'button']}))
      },
      set: ({res}) => {
        this.hidden.stop().catch(error => {
          console.log('stop error')
          console.log(error)
        })
        res.json({type: ['nothing']})
        // res.json(this.Sequence)
      },
    })

    Object.defineProperty(this, 'Max Run Rate', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: new ui.Action({name: 'post', data: ''}), type: ['output', 'button']}))
      },
      set: ({res}) => {
        this.hidden.setMaxRate().catch(error => {
          console.log('Max Run Rate error')
          console.log(error)
        })
        res.json({type: ['nothing']})
        // res.json(this.Sequence)
      },
    })

    Object.defineProperty(this, 'Max Withdraw Rate', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: new ui.Action({name: 'post', data: ''}), type: ['output', 'button']}))
      },
      set: ({res}) => {
        this.hidden.setMaxWithdrawRate().catch(error => {
          console.log('Max Withdraw Rate error')
          console.log(error)
        })
        res.json({type: ['nothing']})
        // res.json(this.Sequence)
      },
    })

    Object.defineProperty(this, 'Firmware', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hidden.firmware, type: ['input', 'string']})
      },
    })

    // this.Database = new ui.ShowUser({
    //   value: [{
    //     id: 'Settings',
    //     obj: {0: new db.GUI({
    //       measurementName: 'haPump_basic_port',
    //       fields: [
    //         'Gas Type',
    //         'Mass Flow',
    //         'Volumetric Flow',
    //         'Pressure',
    //         'Temperature',
    //         'Set Point',
    //       ],
    //       tags: ['portPath'],
    //       obj: this,
    //       testFlag: true,
    //       objPath: thisHAPumpsPath,
    //     })},
    //     path: thisHAPumpsPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
    //   }],
    //   type: ['output', 'link'],
    // })
  }
}

module.exports = {
  initialize: async function (test, reinit) {
    console.log('intializing haPumps')
    // test = false
    var router = new ad.Router({
      portPath: '/dev/ttyUSB3',
      testFlag: false,
      maxQueueLength: 100,
      baud: 9600,
      stopBits: 2,
      // manufacturer: 'FTDI',
      manufacturer: 'Prolific Technology Inc.',
      // seriallineSerial: 'AK04YSXA',
      delimiter: '\r\n',
      timing: true,
      timeInterval: 200,
    })
    if (!test) {
      try {
        await router.openPort()
      } catch (error) {
        console.log('BIG OPEN PORT ERROR--Should NEVER reach here')
        throw error
      }
    }

    if (bkup.configExists(haPumpsPath)) {
      // this should eventually be in a try-catch with a default config
      var loadMap = bkup.load(haPumpsPath)
      Object.entries(loadMap).forEach(([key, value]) => {
        // specify bare-minimum amount that the config should have
        if (value.ID) {
          console.log(key)
          if (haPumpMap[value.ID.value]) {
            // just overwrite it
            console.log('overwriting it')
          } else {
            // add the key
            console.log('Adding it')
          }
          haPumpMap[value.ID.value] = new HAPump({id: value.ID.value,
            router: router,
            testFlag: test,
            Description: value.Description.value,
            Details: value.Details.value,
            apiReinit: reinit,
            thisHAPumpsPath: haPumpsPath,
            thisHAPumpmap: haPumpMap,
            units: value.Units.value,
          })
          haPumpMap[key].hidden.once('initialized', () => {
            bkup.save(haPumpMap[key], haPumpsPath)
          })
        } else {
          // did not have bare minimum so fail out loudly
          console.log('Configuration missing critical component(s):')
          console.log('value.ID')
          console.log(value)
        }
      })
    } else {
      // re-write haPumpMap object into object of HAPump classes
      Object.entries(haPumpMap).forEach(([key, value]) => {
        haPumpMap[key] = new HAPump({id: value.ID,
          router: router,
          testFlag: test,
          Description: value.Description,
          Details: value.Details,
          thisHAPumpsPath: haPumpsPath,
          thisHAPumpmap: haPumpMap,
        })
        haPumpMap[key].hidden.once('initialized', () => {
          bkup.save(haPumpMap[key], haPumpsPath)
        })
        // this one is useful for debugging
        // bkup.save(haPumpMap[key], haPumpsPath)
        // console.log(haPumpMap[key])
      })
    }
    // console.log('haPumpMap')
    // console.log(haPumpMap)
    for (var [key] of Object.entries(haPumpMap)) {
      try {
        await haPumpMap[key].hidden.initialize()
      } catch (error) {
        console.log('HAPump init ERROR')
        console.log('HAPump: ' + key)
        console.log(error)
      }
    }
    return
  },
  setOutput: function () {

  },
  id: haPumpID,
  obj: haPumpMap,
  path: haPumpsPath,
  Device: HAPump,
}

// for actual physical device testing

async function f() {
  var router = new ad.Router({
    portPath: '/dev/ttyUSB3',
    testFlag: false,
    maxQueueLength: 100,
    baud: 9600,
    stopBits: 2,
    // manufacturer: 'FTDI',
    manufacturer: 'Prolific Technology Inc.',
    // seriallineSerial: 'AK04YSXA',
    delimiter: '\r\n',
    timing: true,
    timeInterval: 100,

  })

  try {
    await router.openPort()
  } catch (error) {
    console.log('BIG OPEN PORT ERROR--Should NEVER reach here')
    throw error
  }

  var pump = new HAPump702226({id: '01', router: router, testFlag: false, debugTest: true})

  // setInterval(() => {
  //   console.log(pump.diameter)
  //   // pump.rate = 3
  //   // console.log(pump.rate)
  //     // pump.getWithdrawalRate().then(() => {
  //     //   console.log('success')
  //     // }).catch((error) => {
  //     //   console.log('error')
  //     //   console.log(error)
  //     // })
  // }, 1000)

  setInterval(() => {

    pump.run().then(() => {
      console.log('success')
    }).catch((error) => {
      console.log('error')
      console.log(error)
    })
    setTimeout(() => {
      pump.stop().then(() => {
        console.log('success')
      }).catch((error) => {
        console.log('error')
        console.log(error)
      })

      setTimeout(() => {
        pump.runWithdraw().then(() => {
          console.log('success')
        }).catch((error) => {
          console.log('error')
          console.log(error)
        })
      }, 1000)
    }, 1000)
  }, 3000)

}

// console.log('Waiting 4 seconds for serial')
// setTimeout(() => {
//   f()
// }, 4000)
