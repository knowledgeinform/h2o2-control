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

const pinMap = require('./pin-map.js')
const rpio = require('rpio')
const ui = require('./ui.js')
const bkup = require('./backup.js')
// const db = require('./database.js')
// const ad = require('./abstract-driver.js')

var pwmUtilitiesID = 'pwmUtilities'
var pwmUtilitiesPath = 'config/' + pwmUtilitiesID

class pwmUtilityC {
  constructor({GPIO, UtilityNumber, Description, Details, testFlag, divider, range}) {
    this.Utility = new ui.ShowUser({value: UtilityNumber.toString()})
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    this.GPIO = new ui.ShowUser({value: GPIO, type: ['output', 'number']})
    this.Description = new ui.ShowUser({value: Description})
    this.Details = new ui.ShowUser({value: Details})
    Object.defineProperty(this, 'hiddenRange', {
      value: 1024,
      writable: true,
    })
    Object.defineProperty(this, 'Range', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hiddenRange, type: ['output', 'number']})
      },
      set: val => {
        var n_val = Number(val)
        if (n_val != NaN) {
          this.hiddenRange = n_val
          var pinMapIndex = pinMap.getIndexFromGPIO(this.GPIO.value)
          rpio.pwmSetRange(pinMap.HeaderNumber[pinMapIndex], this.hiddenRange);
        }
      },
    })
    Object.defineProperty(this, 'hiddenDivider', {
      value: 1024,
      writable: true,
    })
    Object.defineProperty(this, 'Divider', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hiddenDivider, type: ['output', 'number']})
      },
      set: val => {
        var n_val = Number(val)
        if (n_val != NaN) {
          if (n_val < 4096) {
            this.hiddenDivider = n_val
            rpio.pwmSetClockDivider(this.hiddenDivider)
          }
        }
      },
    })
    Object.defineProperty(this, 'Frequency', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: new ad.DataPoint({value: (19200 / this.hiddenDivider), units: 'kHz'}), type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'hiddenData', {
      value: 0,
      writable: true,
    })
    Object.defineProperty(this, 'Data', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hiddenData, type: ['output', 'number']})
      },
      set: val => {
        var n_val = Number(val)
        if (n_val != NaN) {
          if (n_val <= this.hiddenRange) {
            this.hiddenData = n_val
            var pinMapIndex = pinMap.getIndexFromGPIO(this.GPIO.value)
            rpio.pwmSetData(pinMap.HeaderNumber[pinMapIndex], this.hiddenData);
          }
        }
      },
    })

    this.datastreams = {refreshRate: 300}
    this.updateable = []
  }
}

var pwmUtilityMap = {
  1: new pwmUtilityC({GPIO: 3, UtilityNumber: 1, Description: 'Heater PWM', Details: '', Divider: 4096, Range: 1024, Data: 0}),
}

function lookupPins(vMap) {
  var pins = []
  // console.log(typeof vMap)
  Object.entries(vMap).forEach(([, value]) => {
    pins.push(pinMap.HeaderNumber[pinMap.getIndexFromGPIO(value.GPIO.value)])
  })
  // console.log(pins)
  return pins
}

function pullDownPins() {
  var pins = lookupPins(pwmUtilityMap)
  // var state = rpio.PULL_DOWN
  for (var pin of pins) {
    /* Configure pin as output with the initiate state set low */
    rpio.open(pin, rpio.OUTPUT, rpio.LOW)
  }
}

module.exports = {
  initialize: function (test) {
    // test = true
    return new Promise(resolve => {
      // test = false
      console.log('intializing pwmUtilities')
      console.log(test)
      // intialize pins
      this.pinInit(test)

      // initialize modes
      // state.on('Mode1',mode1Settings)
      // state.on('Mode2',mode2Settings)
      // state.on('Mode3',mode3Settings)
      // state.on('Mode4',mode4Settings)

      if (bkup.configExists(pwmUtilitiesPath)) {
        // this should eventually be in a try-catch with a default config
        var loadMap = bkup.load(pwmUtilitiesPath)
        Object.entries(loadMap).forEach(([key, value]) => {
          // specify bare-minimum amount that the config should have
          if (value.GPIO.value) {
            // console.log(key)
            if (pwmUtilityMap[key]) {
              // just overwrite it
              console.log('overwriting it')
            } else {
              // add the key
              console.log('Adding it')
            }
            // console.log(value)
            pwmUtilityMap[key] = new pwmUtilityC({
              GPIO: value.GPIO.value,
              UtilityNumber: value.Utility.value,
              Description: value.Description.value,
              Details: value.Details.value,
              State: value.State.value,
            })
            // pwmUtilityMap[key] = new MFC({id: value.ID.value,router: router, testFlag: test,Description: value.Description.value,Details: value.Details.value})
          } else {
            // did not have bare minimum so fail out loudly
            console.log('Configuration missing critical component(s):')
            console.log('value.GPIO.value')
            console.log(value)
          }
        })
      } else {
        // add details to utility map
        Object.entries(pwmUtilityMap).forEach(([key, value]) => {
          var pinMapIndex = pinMap.getIndexFromGPIO(pwmUtilityMap[key].GPIO.value)
          value.Details.value = 'GPIO ' + pwmUtilityMap[key].GPIO.value + ' Header: ' + pinMap.HeaderNumber[pinMapIndex] + ' Info: ' + pinMap.Name[pinMapIndex]
          // console.log(value)
          bkup.save(pwmUtilityMap[key], pwmUtilitiesPath)
        })
      }
      console.log('utilitymap')
      console.log(pwmUtilityMap)
      return resolve()
    })
  },
  pinInit: function (test) {
    if (test) {
      console.log('Operating in test-mode')
      /*
       * Explicitly request mock mode to avoid warnings when running on known
       * unsupported hardware, or to test scripts in a different hardware
       * environment (e.g. to check pin settings).
       */
      rpio.init({mock: 'raspi-3'})

      /* Override default warn handler to avoid mock warnings */
      rpio.on('warn', function () {})
    } else {
      rpio.init({gpiomem: false})
    }
    pullDownPins()
  },
  id: pwmUtilitiesID,
  obj: pwmUtilityMap,
  path: pwmUtilitiesPath,
}
