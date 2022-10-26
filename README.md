# Twig i18n Extractor for Craft

This is a bare bone node script to find and extract all instances of strings that trigger static message translation in Craft Twig Templates.

The script will parse templates in a given directory (and subdirectory), and compile a sorted, deduped list of strings as a PHP file ready to be used in Craft.

E.g. running twig-i18n-extractor on:

```twig
{# template.twig #}
{{ 'a candidate for translation'|t() }}
{{ 'another'|t('category') }}
{{ 'yet another'|translate }}
{{ 'and {more} with params'|t('category', params: { more: 'MORE!' }) }}
```

would output:

```php
<?php

return [
  'a candidate for translation' => 'a candidate for translation',
  'another' => 'another',
  'yet another' => 'yet another',
  'and {more} with params' => 'and {more} with params',
];
```

## How to use

Clone the repository and install with `npm i -g`.

Run with

```sh
twig-i18n-extractor [options] <directory>
```

or

```sh
npx twig-i18n-extraxtor [options] <directory>
```

### Options

```
Arguments:
  directory                        template directory

Options:
  -V, --version                    output the version number
  -o, --output <file>              output file name (default: "./site.php")
  -r, --withReversedOutput <file>  output file name (with strings reverted)
                                   (default: "./site-rev.php")
  -h, --help                       display help for command
```

The option `withReversedOutput` will flip the translation for every string, easing the task of identifying missing translations in templates by looking at the published frontend (or control panel).

## License

This software is released under the terms of the MIT license.
