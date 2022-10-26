#! /usr/bin/env node

import { program } from "commander"
import { globby } from "globby"
import path from "path"
import { createRequire } from "node:module"
import { dirname } from "path"
import { fileURLToPath } from "url"
import fs from "node:fs/promises"

const require = createRequire(import.meta.url)
const pkg = require("./package.json")
const __dirname = dirname(fileURLToPath(import.meta.url))
const tFilter = /\|(?:t|translate)(?:\(\)|\(['"\w]+|[\s%\}\|])/

const walkFiles = async (dir) => {
  const paths = await globby("**/*.twig", { cwd: path.resolve(__dirname, dir) })
  const strings = await Promise.all(
    paths.map((template) => extractStrings(template, dir))
  )
  const allStrings = strings.flat(Infinity).filter((s) => s !== "")
  // normalize quotes, i.e. "Robots" and 'Robots', accounting for escaped quotes inside the string
  // sort case insensitive avoiding the initial quote
  const uniqueSortedStrings = [
    ...new Set(
      allStrings
        .map(
          (s) =>
            `"` +
            s.replaceAll(/^['"](.*)['"]$/g, "$1").replaceAll(`"`, `\"`) +
            `"`
        )
        .sort(
          (a, b) =>
            a.toLowerCase().charCodeAt(1) - b.toLowerCase().charCodeAt(1)
        )
    ),
  ]
  console.log(
    `TOTAL ${allStrings.length} string found, ${uniqueSortedStrings.length} unique`
  )
  return uniqueSortedStrings
}

const escapeRevString = (str) => {
  return str
    .split("")
    .reverse()
    .join("")
    .replace(`'\\`, `\\'`)
    .replace(`"\\`, `\\"`)
    .replaceAll(/\}([^\{]+)\{/g, "{$1}")
    .replaceAll(/\]([^\[]+)\[/g, "($1)")
    .replaceAll(/\)([^\(]+)\(/g, "($1)")
}

const saveStrings = async (i18nStrings, rev) => {
  const filename = rev ? options.withReversedOutput : options.output
  const phpArray = i18nStrings
    .map((s) => (rev ? `\t${s} => ${escapeRevString(s)},` : `\t${s} => ${s},`))
    .join("\n")
  const template = `
<?php

return [
${phpArray}
];
`
  fs.writeFile(filename, template)
}

const extractStrings = async (template, dir) => {
  const twigFile = await fs.readFile(
    path.resolve(__dirname, dir, template),
    "utf-8"
  )
  const parts = twigFile.split(/\r?\n/)
  const strings = parts
    .filter((line) => tFilter.test(line))
    .map((line) => processLine(line))
  console.log(
    `processing ${template}: found ${strings.flat(Infinity).length} strings`
  )
  return strings.flat(Infinity)
}

const processLine = (line) => {
  const tFilterGlobal = new RegExp(tFilter.source, "g")
  const i18nStrings = []
  while (tFilterGlobal.test(line)) {
    // lastIndex matches the character at the end of the match
    const filterBarIdx = line.lastIndexOf("|", tFilterGlobal.lastIndex)
    let endQuoteIdx = filterBarIdx - 1
    const quote = line[endQuoteIdx]
    let startQuoteIdx = endQuoteIdx
    do {
      // walk back and find the start of the string
      startQuoteIdx = line.lastIndexOf(quote, startQuoteIdx - 1)
    } while (line[startQuoteIdx - 1] === "\\")
    i18nStrings.push(line.slice(startQuoteIdx, endQuoteIdx + 1))
  }
  return i18nStrings
}

program
  .name("twig-i18n-extractor")
  .description(
    "CLI to extract string for static message translation in Craft Twig files"
  )
  .version(pkg.version)

program
  .argument("<directory>", "template directory")
  .option("-o, --output <file>", "output file name", "./site.php")
  .option("-d, --debug", "print debug messages")
  .option(
    "-r, --withReversedOutput <file>",
    "output file name (with strings reverted)"
  )
  .action(async (dir) => {
    const i18nStrings = await walkFiles(dir)
    saveStrings(i18nStrings)
    if (options.withReversedOutput) {
      saveStrings(i18nStrings, true)
    }
  })

program.parse()
const options = program.opts()
