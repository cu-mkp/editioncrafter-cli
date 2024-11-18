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
  const options = {
    configPath: null,
    textPath: null,
    outputPath: null,
    inputPath: null,
    baseUrl: null,
  }

  const mode = args[2]

  // skip the first three args
  // (Node, EC itself, and the name of the script)
  for (let i = 3; i < args.length - 1; i = i + 2) {
    const value = args[i + 1]

    const match = optionInfo.find(opt => opt.abbrev === value || opt.long === value)

    if (!match) {
      console.error(`Unknown option: ${value}`)
    }

    options[match.key] = value
  }

  const missingArgs = requiredArgs
    ? requiredArgs.filter(name => !options[name])
    : []

  if (missingArgs.length > 0) {
    displayTargetedHelp(mode, missingArgs)
    exit(1)
  }

  return options
}
