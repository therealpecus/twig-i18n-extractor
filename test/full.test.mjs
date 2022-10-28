import { fileURLToPath } from "node:url"
import path from "node:path"
import { loadTemplate, processTwigFile } from "../src/lib.mjs"

let twigFile
const __dirname = path.dirname(fileURLToPath(import.meta.url))
global.options = {
  debug: true, // allows coverage to touch all code blocks
}

describe("Object variables", () => {
  beforeAll(async () => {
    twigFile = await loadTemplate(
      "object.variable.twig",
      path.resolve(__dirname, "./fixtures/")
    )
  })

  test("do not match variables", async () => {
    const i18nStrings = await processTwigFile(twigFile)
    expect(i18nStrings).toHaveLength(0)
  })
})

describe("Strings", () => {
  beforeAll(async () => {
    twigFile = await loadTemplate(
      "strings.twig",
      path.resolve(__dirname, "./fixtures/")
    )
  })

  test("match strings", async () => {
    const i18nStrings = await processTwigFile(twigFile)
    expect(i18nStrings).toHaveLength(144)
  })
})

describe("Additional cases", () => {
  beforeAll(async () => {
    twigFile = await loadTemplate(
      "additional-cases.twig",
      path.resolve(__dirname, "./fixtures/")
    )
  })

  test("additional cases", async () => {
    const i18nStrings = await processTwigFile(twigFile)
    expect(i18nStrings).toHaveLength(5)
  })
})
