# EditionCrafter

Usage: editioncrafter \<command\> [parameters]

## Commands

EditionCrafter responds to the following commands:

### `iiif`

Process the IIIF Manifest into a TEI Document.

Usage: `editioncrafter iiif [-i iiif_url] [-o output_path]`

#### Required parameters:
* -i iiif_url
* -o output_path

#### Optional parameters:
* -t text_file_folder
* -c: Config file

### `images`

Process a list of images from a CSV file into a TEI Document.

Usage: `editioncrafter images [-i csv_path] [-o output_file]`

Required parameters:
* -i csv_path
* -o output_file

Optional parameters:
* -t text_file_folder
* -c: Config file

### `process`

Process the TEI Document into a manifest, partials, and annotations. These can then be used by the EditionCrafter viewer.

Usage: `editioncrafter process [-i tei_file] [-o output_path]`

Required parameters:
* -i tei_file
* -o output_path

Optional parameters:
* -u base_url
* -c: Config file

### `database`

Process the TEI document into a SQLite file containing a directory of categories and tags. This can be used with the Record List component from the EditionCrafter viewer package, or it can be browsed directly with a SQLite viewer.

Usage: `editioncrafter database [-i tei_file] [-o output_path]`

Required parameters:
* -i tei_file
* -o output_path (must end in .sqlite)

### help

Displays this help.
