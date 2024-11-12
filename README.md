# editioncrafter-cli

This is the command line tool to take a TEI XML file and turn it into a IIIF Manifest and the necessary Web Annotations to display the text in EditionCrafter.

## Installing

### Node

EditionCrafter CLI requires Node. To check if Node is installed, open your terminal or command line and type:

```bash
node --version
```

If the output is a number, you already have Node installed. If the output is an error like "Command not found", you need to install Node.

Please note that EditionCrafter CLI supports Node 14 and higher. If your version of Node is below 14, you'll need to upgrade.

To install or upgrade Node, visit https://nodejs.org/en/download and follow the instructions for your operating system. Alternatively, if you're using the Windows Subsystem for Linux, you should upgrade the version of Linux you're running to one that comes with a newer version of Node.

### Installing EditionCrafter

To install the latest version, run:

`npm install -g @cu-mkp/editioncrafter-cli`

The `editioncrafter` command will now be available. If it doesn't work right away, try restarting your terminal program.

## Usage

The following commands are available to the EditionCrafter CLI. Note that you may optionally pass the path of a configuration file as `-c config_path` rather than passing individual parameters. The optional configuration file is a JSON file with the following options:

```
{
    "inputPath": "myfile.xml",
    "outputPath": ".",
    "baseUrl": "http://localhost:8080",
    "thumbnailWidth": 124,
    "thumbnailHeight": 192
}
```

### help

Usage:
```
editioncrafter help
```
This will display information on the syntax for passing commands to the CLI as well as a list of available commands.

### iiif

Usage:
```
editioncrafter iiif -i <iiif_url> -o <output_path>
```
This will create an XML file at the location of the provided `<output_path>` based on the information in the IIIF manifest supplied. Note that in this case the `<output_path>` should be a single XML File, e.g. `/MyFiles/TEI/index.xml`.

### images

Usage:
```
editioncrafter images -i <csv path> -o <output file>
```
This will create an XML file at the location of the provided `<output_path>` based on the image data in the CSV file supplied. Note that in this case the `<output_path>` should be a single XML File, e.g. `/MyFiles/TEI/index.xml`.

The CSV file should be in the following format:

```csv
url,label,xml_id
"https://mywebsite/foo.jpg","My first page","f000"
"https://mywebsite/foo2.jpg","My second page","f001"
```

### process

Usage:
```
editioncrafter process -i <tei_file> -o <output_path> -u <base_url>
```
This will create all of the artifacts that EditionCrafter needs in order to display your document on the web, and place them in the specified `<output_path>` folder. The `<base_url>` parameter should be the URL at which you intend to host these artifacts.

## Generates the following files:

tei_document_id/tei/index.xml
tei_document_id/tei/resource_id/index.xml
tei_document_id/tei/resource_id/surface_id/index.xml

tei_document_id/iiif/manifest.json

tei_document_id/html/index.html
tei_document_id/html/resource_id/index.html
tei_document_id/html/resource_id/surface_id/index.html

## Running a development build

The first time you run this program, you'll need to install its dependencies with `npm install`.

Within the root folder, run `npm link` to make the repo available as a global command. The entry point is configured by the `bin` property in `package.json`.

Open a new terminal session and type `which editioncrafter` to verify that it linked correctly.
