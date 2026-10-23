# Third-party components and assets

Huddle contributors license their original project code and documentation under the [MIT license](LICENSE). Third-party authors retain their copyrights and license terms for their components. The project license does not replace those terms or grant rights to third-party trademarks or media.

## Dependencies and Vega template

The package manifests and lockfiles identify the JavaScript dependencies and their versions. Dependency packages supply their own license files and notices. Amazon supplies the Vega SDK, native modules, generated project template, and template artwork in `Huddle-Vega/src/assets` under Amazon's applicable terms. The repository retains those template files, and the registered application entry point loads Huddle's screens from `Huddle-Vega/src/huddle`.

## Huddle artwork and catalog

OpenAI's image generation tool generated `Huddle-RN-Web-Preview/src/assets/rooftop-cinema.png` for Huddle. The [asset README](Huddle-RN-Web-Preview/src/assets/README.md) records the prompt and local bundling details. Huddle draws its catalog covers through React Native components and emoji. The repository includes no movie video files or commercial poster images.

The demonstration catalog contains sample titles and metadata. The Bedrock integration's `realFilms` list in `Huddle-RN-Web-Preview/src/ai.ts` records source URLs for its candidate film metadata. Huddle uses those candidates to constrain suggestions; the project grants no distribution rights to the films.

## External checkout

Huddle opens Amazon product or Grubhub storefront links on a participant's phone. Amazon and its partners operate those external services under their own terms. Huddle collects participant-reported food statuses and stores no Amazon payment or delivery-address data.
