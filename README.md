# editioncrafter-cli

This is the command line tool to take a TEI XML file and turn it into a IIIF Manifest and the necessary Web Annotations to display the text in EditionCrafter.

## Installing

### Node

EditionCrafter CLI requires Node. To check if Node is installed, open your terminal or command line and type:

```bash
node --version
```

If the output is a number, you already have Node installed. If the output is an error like "Command not found", you need to install Node.

To install Node, visit https://nodejs.org/en/download and follow the instructions for your operating system.

### Installing EditionCrafter

To install the latest version, run:

`npm install -g @cu-mkp/editioncrafter-cli`

The `editioncrafter` command will now be available. If it doesn't work right away, try restarting your terminal program.

## Usage

Usage: `editioncrafter <command> [-c config_path]|[<tei_path> <output_path> <base_url>]`

Edition Crafter responds to the following `<command>`s:
* process: Process the TEI Document into a manifest, partials, and annotations.
* server: Run in server mode (WIP)
* help: Displays this help.

The optional configuration file is a JSON file with the following options:

```
{
    "targetPath": "myfile.xml",
    "outputPath": ".",
    "baseURL": "http://localhost:8080",
    "thumbnailWidth": 124,
    "thumbnailHeight": 192
}
```

## Generates the following files:

tei_document_id/tei/index.xml
tei_document_id/tei/resource_id/index.xml
tei_document_id/tei/resource_id/surface_id/index.xml

tei_document_id/iiif/manifest.json

tei_document_id/html/index.html
tei_document_id/html/resource_id/index.html
tei_document_id/html/resource_id/surface_id/index.html

## Running Locally

The first time you run this program, you'll need to install its dependencies with `npm install`.

Within the root folder, run `npm link` to make the repo available as a global command. The entry point is configured by the `bin` property in `package.json`.

Open a new terminal session and type `which editioncrafter` to verify that it linked correctly.
