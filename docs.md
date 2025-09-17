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

Process the TEI Document(s) into a manifest, partials, and annotations. These can then be used by the EditionCrafter viewer. Requires EITHER an input file or an input folder.

Usage: `editioncrafter process [-i tei_file] [-o output_path]` OR `editioncrafter process [-f tei_folder] [-o output_path]`

Required parameters:
* -i tei_file OR -f tei_folder
* -o output_path

Optional parameters:
* -u base_url
* -c: Config file

### `database`

Process one or more TEI documents into a SQLite file containing a directory of categories and tags. This can be used with the Record List component from the EditionCrafter viewer package, or it can be browsed directly with a SQLite viewer.

Usage: `editioncrafter database [-i tei_file(s)] [-o output_path]` OR `editioncrafter database [-f tei_folder] [-o output_path]`

You can pass as many TEI documents as you want by writing them all after the `-i`. For example:

`editioncrafter database -i data/my_first_doc.xml data/my_second_doc.xml -o output_folder`

Required parameters:
* -i tei_file(s) OR -f tei_folder
* -o output_path (must end in .sqlite)

### help

Displays this help.
