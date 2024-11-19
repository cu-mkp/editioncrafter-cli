# EditionCrafter

Usage: editioncrafter \<command\> [parameters]

## Commands

EditionCrafter responds to the following commands:

### `iiif`

Process the IIIF Manifest into a TEIDocument.

Usage: `editioncrafter iiif [-i iiif_url] [-o output_path]`

#### Required parameters:
* -i iiif_url
* -o output_path

#### Optional parameters:
* -t text_file_folder
* -c: Config file

### `images`

Process a list of images from a CSV file into a TEIDocument.

Usage: `editioncrafter images [-i csv_path] [-o output_file]`

Required parameters:
* -i csv_path
* -o output_file

Optional parameters:
* -t text_file_folder
* -c: Config file

### `process`

Process the TEI Document into a manifest, partials, and annotations.

Usage: `editioncrafter process [-i tei_file] [-o output_path]`

Required parameters:
* -i tei_file
* -o output_path

Optional parameters:
* -u base_url
* -c: Config file

### help

Displays this help.
