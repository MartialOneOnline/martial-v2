declare module 'ua-parser-js' {
  interface UAParserResult {
    browser: { name?: string; version?: string }
    os: { name?: string; version?: string }
    device: { type?: string; model?: string; vendor?: string }
  }

  export default class UAParser {
    constructor(uastring?: string)
    getResult(): UAParserResult
  }
}
