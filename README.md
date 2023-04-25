# editioncrafter-cli

This is the command line tool to take a TEI XML file and turn it into a IIIF Manifest and the necessary Web Annotations to display the text in EditionCrafter.

Usage: `edition_crafter <command> <tei_path> <output_path>`

Edition Crafter responds to the following `<command>`s:
* process: Process the TEI Document into a manifest, partials, and annotations.
* help: Displays this help.

## Generates the following files:

tei_document_id/tei/index.xml
tei_document_id/tei/resource_id/index.xml
tei_document_id/tei/resource_id/surface_id/index.xml

tei_document_id/iiif/manifest.json

tei_document_id/html/index.html
tei_document_id/html/resource_id/index.html
tei_document_id/html/resource_id/surface_id/index.html

## Running Locally

Within the root folder, run `npm link` to make the repo available as a global command. The entry point is configured by the `bin` property in `package.json`.

Open a new terminal session and type `which editioncrafter` to verify that it linked correctly.
