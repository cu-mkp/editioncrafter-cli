import { exit } from 'node:process'
import { displayTargetedHelp } from './help.js'

const optionInfo = [
  {
    abbrev: '-c',
    long: '--config',
    key: 'configPath',
  },
  {
    abbrev: '-t',
    long: '--text',
    key: 'textPath',
  },
  {
    abbrev: '-c',
    long: '--config',
    key: 'configPath',
  },
  {
    abbrev: '-o',
    long: '--ouput',
    key: 'outputPath',
  },
  {
    abbrev: '-i',
    long: '--input',
    key: 'inputPath',
    multiple: true,
  },
  {
    abbrev: '-u',
    long: '--base-url',
    key: 'baseUrl',
  },
]

export function parseOptions(args, requiredArgs) {
  const mode = args[2]

  const options = {
    configPath: null,
    textPath: null,
    outputPath: null,
    inputPath: null,
    baseUrl: null,
    mode,
  }

  let currentArg = null

  // skip the first three args
  // (Node, EC itself, and the name of the script)
  for (let i = 3; i < args.length; i++) {
    if (args[i].startsWith('-')) {
      const argMatch = optionInfo.find(opt => opt.abbrev === args[i] || opt.long === args[i])
      if (argMatch) {
        currentArg = argMatch
      }
    }
    else if (currentArg) {
      if (options[currentArg.key]) {
        if (currentArg.multiple) {
          if (Array.isArray(options[currentArg.key])) {
            options[currentArg.key].push(args[i])
          }
          else {
            options[currentArg.key] = [options[currentArg.key], args[i]]
          }
        }
        else {
          console.error(`${currentArg.key} does not support multiple values.`)
          exit(1)
        }
      }
      else {
        options[currentArg.key] = args[i]
      }
    }
    else {
      console.error(`Unknown option: ${args[i]}`)
    }
  }

  const missingArgs = []

  if (requiredArgs) {
    requiredArgs.forEach((arg) => {
      if (!options[arg]) {
        const match = optionInfo.find(opt => opt.key === arg)

        if (match) {
          missingArgs.push(match.abbrev)
        }
      }
    })
  }

  if (missingArgs.length > 0) {
    displayTargetedHelp(options.mode, missingArgs)
    exit(1)
  }

  options.mode = mode

  return options
}
