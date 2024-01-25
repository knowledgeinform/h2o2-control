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
const bkup = require('./backup.js')

var othersID = 'Others'
var othersPath = 'config/' + othersID

// function isSetter (obj, prop) {
//   return Boolean(Object.getOwnPropertyDescriptor(obj, prop).set)
// }

function isSetter(obj, prop) {
  return Boolean(Object.getOwnPropertyDescriptor(obj, prop).set)
}

class OthersC {
  constructor({index, ipAddress, basePath = '/api', Description, Details, testFlag = true, services, serverInstance}) {
    this.Index = new ui.ShowUser({value: index})
    Object.defineProperty(this, 'hiddenIPAddress', {
      writable: true,
      value: ipAddress,
    })
    Object.defineProperty(this, 'IP Address', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hiddenIPAddress})
      },
      set: val => {
        if (this.validateIP(val)) {
          this.hiddenIPAddress = val
        }
      }
    })
    this['Base Path'] = new ui.ShowUser({value: basePath})
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    Object.defineProperty(this, 'services', {
      writable: true,
      value: services,
    })
    Object.defineProperty(this, 'serverInstance', {
      value: serverInstance,
    })
    this.Description = new ui.ShowUser({value: Description})
    this.Details = new ui.ShowUser({value: Details})

    this.datastreams = {refreshRate: 1000}
    this.updateable = []

    Object.defineProperty(this, 'hiddenStatus', {
      writable: true,
      value: 'Offline',
    })
    Object.defineProperty(this, 'Status', {
      enumerable: true,
      get: () => {
        return new ui.ShowUser({value: this.hiddenStatus, type: ['input', 'string']})
      }
    })
    Object.defineProperty(this, 'hiddenEnter', {
      writable: true,
      value: true,
    })
    Object.defineProperty(this, 'Enter', {
      writable: true,
      enumerable: this.hiddenEnter,
      get: () => {
        return this.buildLink()
      },
      set: val => {
        console.log('Hitting enter')
      }
    })
    setInterval(this.check.bind(this), this.datastreams.refreshRate)
  }

  buildLink() {
    return new ui.ShowUser({
        value: [this.getOtherServices()],
        type: ['output', 'link'],
      })
  }

  validateIP(ip) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) {
      return (true)
    }
    console.log('You have entered an invalid IP address!')
    return (false)
  }

  check() {
    console.log('checking')
    if (this.validateIP(this.hiddenIPAddress)) {
      console.log(this['IP Address'].value + this['Base Path'].value)
    }
  }
}

var othersMap = {
  0: {'IP Address': '192.168.0.101', Description: 'Temperature Monitoring and Cutoff', Details: ''},
}

module.exports = {
  initialize: async function (test, reinit, services, serverInstance) {
    console.log('Initializing Others in others js')
    // test = false
    if (test === undefined) {
      test = false
    }

    if (bkup.configExists(othersPath)) {
      // this should eventually be in a try-catch with a default config
      var loadMap = bkup.load(othersPath)
      Object.entries(loadMap).forEach(([key, value], i) => {
        // specify bare-minimum amount that the config should have
        // console.log(value)
        if (value['IP Address'].value) {
          console.log(key)
          othersMap[key] = new OthersC({
            index: value.Index.value,
            ipAddress: value['IP Address'].value,
            basePath: value['Base Path'].value,
            Description: value.Description.value,
            Details: value.Details.value,
            testFlag: test,
            services: services,
            serverInstance: serverInstance,
          })

          // othersMap[key] = new MFC({id: value.ID.value,router: router, testFlag: test,Description: value.Description.value,Details: value.Details.value})
        } else {
          // did not have bare minimum so fail out loudly
          console.log('Configuration missing critical component(s):')
          console.log('value[\'IP Address\'].value')
          console.log(value)
        }
      })
    } else {
      // add details to valve map
      Object.entries(othersMap).forEach(([key, value], i) => {
        console.log(value)
        // var router = selectRouter({controlSystem: value.type.value, test: test})
        othersMap[key] = new OthersC({
          index: i,
          ipAddress: value['IP Address'],
          Description: value.Description,
          Details: value.Details,
          testFlag: test,
          services: services,
          serverInstance: serverInstance,
        })
        console.log(othersMap[key])
        bkup.save(othersMap[key], othersPath)
      })
    }
    return
  },
  id: othersID,
  obj: othersMap,
  path: othersPath,
}
