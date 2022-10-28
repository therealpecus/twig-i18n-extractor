#! /usr/bin/env node

import { program } from "commander"
import { globby } from "globby"
import path from "node:path"
import fs from "node:fs/promises"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

import { loadTemplate, processTwigFile } from "./lib.mjs"

const require = createRequire(import.meta.url)
const pkg = require("../package.json")
const cwd = process.cwd()

const walkFiles = async (dir) => {
  let isDir = false
  try {
    const fstat = await fs.stat(dir)
    isDir = fstat.isDirectory()
  } catch (err) {
    console.error("File or directory not found")
    process.exit(1)
  }
  const paths = isDir
    ? await globby("**/*.twig", { cwd: path.resolve(cwd, dir) })
    : [path.resolve(cwd, dir)]
  const strings = await Promise.all(
    paths.map((template) => {
      if (options.debug) {
        console.debug("loading template", template)
      }
      return loadTemplate(template, dir).then((twigFile) =>
        processTwigFile(twigFile, template)
      )
    })
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

program
  .name("twig-i18n-extractor")
  .description(
    "CLI to extract string for static message translation in Craft Twig files"
  )
  .version(pkg.version)

program
  .argument("<file or directory>", "template or template directory")
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
    if (options.debug) {
      console.debug(i18nStrings)
    }
  })

program.parse()
global.options = program.opts()
