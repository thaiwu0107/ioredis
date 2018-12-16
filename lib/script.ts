import {createHash} from 'crypto'
import {isPromise} from './promiseContainer'
import Command from './command'
import * as asCallback from 'standard-as-callback'

export default class Script {
  private sha: string

  constructor (
    private lua: string,
    private numberOfKeys: number = null,
    private keyPrefix: string = ''
  ) {
    this.sha = createHash('sha1').update(lua).digest('hex')
  }

  execute (container: any, args: any[], options: any, callback?: Function) {
    if (typeof this.numberOfKeys === 'number') {
      args.unshift(this.numberOfKeys)
    }
    if (this.keyPrefix) {
      options.keyPrefix = this.keyPrefix
    }

    const evalsha = new Command('evalsha', [this.sha].concat(args), options)
    evalsha.isCustomCommand = true

    const result = container.sendCommand(evalsha)
    if (isPromise(result)) {
      return asCallback(
        result.catch((err) => {
          if (err.toString().indexOf('NOSCRIPT') === -1) {
            throw err
          }
          return container.sendCommand(
            new Command('eval', [this.lua].concat(args), options)
          )
        }),
        callback
      )
    }

    // result is not a Promise--probably returned from a pipeline chain; however,
    // we still need the callback to fire when the script is evaluated
    asCallback(evalsha.promise, callback)

    return result
  }
}