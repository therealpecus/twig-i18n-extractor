import path from "node:path"
import fs from "node:fs/promises"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cwd = process.cwd()

const tFilter = /(?:\|t$)|(?:\|t[^r])|\|translate/g

/**
 * loads a template
 *
 * @param {string} template the path of the twig template to process
 * @param {string} dir the parent path of the template
 * @returns array of strings for static translation
 *
 */
export const loadTemplate = async (template, dir) => {
  const twigFile = await fs.readFile(path.resolve(cwd, dir, template), "utf-8")
  return twigFile
}

/**
 * filters line in a template matching the filter pattern and passes
 * them to the line extractor function
 *
 * @param {string} twigFile the twig template to process
 * @param {string} template the path of the twig template to process
 * @returns array of strings for static translation
 *
 */
export const processTwigFile = async (twigFile, template) => {
  const parts = twigFile.split(/\r?\n/)
  if (options.debug) {
    console.debug(`processing ${template}`)
  }

  // testing the regExp via string.prototype.test(RegExp) failed on multiple lines matching
  // because .test() needs a false match to reset the search
  const strings = parts
    .filter((line) => line.match(tFilter))
    .map((line, idx) => processLine(line, idx))
  console.log(
    `processing ${template}: found ${strings.flat(Infinity).length} strings`
  )
  return strings.flat(Infinity)
}

/**
 *
 * @param {string} line the line of the twig template to extract strings from
 * @param {number} idx the line number (filtered)
 * @returns array of strings for static translation
 */
export const processLine = (line, idx) => {
  const i18nStrings = []
  if (options.debug) {
    console.group(`L${idx}`)
  }
  Array.from(line.matchAll(tFilter)).map((match) => {
    const filterBarIdx = line.lastIndexOf("|", match.index)
    let endQuoteIdx = filterBarIdx - 1
    const quote = line[endQuoteIdx]
    if (quote !== `"` && quote !== `'`) {
      // bail out when filter argument does not look like a string
      if (options.debug) {
        console.debug("BAILING OUT")
        console.debug("line", line)
        console.debug("quote", quote)
        console.debug("endQuoteIdx", endQuoteIdx)
        console.groupEnd()
      }
      return []
    }
    let startQuoteIdx = endQuoteIdx
    if (options.debug) {
      console.debug("line", line)
      console.debug("startQuoteIdx", startQuoteIdx)
      console.debug("quote", quote)
      console.debug("endQuoteIdx", endQuoteIdx)
    }
    do {
      // walk back and find the start of the string
      startQuoteIdx = line.lastIndexOf(quote, startQuoteIdx - 1)
      if (options.debug) {
        console.debug(
          `looking backwards for beginning of string starting from ${startQuoteIdx} (char "${
            line[startQuoteIdx]
          }", prev. char is ${line[startQuoteIdx - 1]}`
        )
      }
    } while (line[startQuoteIdx - 1] === "\\")
    if (options.debug) {
      console.debug("extracted", line.slice(startQuoteIdx, endQuoteIdx + 1))
    }
    i18nStrings.push(line.slice(startQuoteIdx, endQuoteIdx + 1))
  })
  if (options.debug) {
    console.groupEnd()
  }
  return i18nStrings
}
