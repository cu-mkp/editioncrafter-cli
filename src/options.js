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

  // skip the first three args
  // (Node, EC itself, and the name of the script)
  for (let i = 3; i < args.length - 1; i = i + 2) {
    const argName = args[i]
    const value = args[i + 1]

    const match = optionInfo.find(opt => opt.abbrev === argName || opt.long === argName)

    if (match) {
      options[match.key] = value
    }
    else {
      console.error(`Unknown option: ${argName}`)
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
