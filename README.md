
# hydra-everything

[![GitHub Actions](https://github.com/nack098/hydra-everything/.github/actions/workflows/build-release.yml/badge.svg)](https://github.com/nack098/.github/hydra-everything/actions) [![Releases](https://img.shields.io/github/release/nack098/hydra-everything.svg)](https://github.com/nack098/hydra-everything/releases)

Export Hydra to After Effects, PNG, or more.

* Export Hydra sketches to PNG and image sequences
* Export rendering data for Adobe After Effects workflows
* Live Hydra preview with configurable resolution
* Resolution-aware units such as `px`, `vw`, `vh`, `rem`, and `deg`
* Deterministic rendering with seeded random
* JavaScript parsing and analysis using Tree-sitter
* Standalone Windows executable
* Native rendering backend planned

## Getting started

---

`hydra-everything` is currently distributed as a standalone Windows application.

Download the latest release from [GitHub Releases](https://github.com/nack098/hydra-everything/releases).

For development, [Bun](https://bun.sh/) is required.

```bash
cd ui
bun install
bun run dev
```

To build the standalone executable:

```bash
bun run build
```

This produces:

```text
HydraExporter.exe
```

The executable contains the web application and its required assets.

## Hydra

---

`hydra-everything` is built around [Hydra](https://hydra.ojack.xyz/), a live-coding environment for realtime graphics.

Hydra code can be written directly in the editor:

```js
osc(10)
  .scrollX(0.1)
  .rotate(0.2)
  .out()
```

The live preview uses Hydra's existing renderer, which currently acts as the reference implementation for the exporter.

## Export

---

The current rendering pipeline is:

```text
Hydra Source
    ↓
Hydra Runtime
    ↓
Renderer
    ↓
Export
```

The renderer resolution can be changed independently from the editor preview.

For example:

```text
Preview
1280 × 720

    ↓

Export
3840 × 2160
```

This allows development at a lower resolution while producing a higher-resolution output.

Currently supported output includes:

* PNG
* PNG image sequences
* After Effects-oriented workflows

More output formats will be added as the rendering pipeline develops.

## Resolution-aware Units

---

Hydra normally works with normalized values.

`hydra-everything` provides additional unit functions which are resolved against the renderer/output dimensions.

```js
osc(10)
  .scrollX(px(100))
  .scrollY(vh(10))
  .rotate(deg(45))
  .out()
```

Available units:

| Unit     | Description                   |
| -------- | ----------------------------- |
| `px()`   | Pixel value                   |
| `vw()`   | Percentage of renderer width  |
| `vh()`   | Percentage of renderer height |
| `rem()`  | Root-relative size            |
| `em()`   | Font-relative size            |
| `deg()`  | Degrees                       |
| `rad()`  | Radians                       |
| `norm()` | Normalized value              |

For example, `px(100)` represents 100 pixels of the target renderer rather than a manually calculated normalized value.

The unit system is implemented as an extension layer and does not modify Hydra itself.

## Deterministic Rendering

---

The exporter provides seeded `Math.random()` execution.

```text
Seed
 ↓
Seeded Random
 ↓
Hydra Program
 ↓
Reproducible Output
```

This is useful for exporting image sequences and reproducing previous renders.

```js
osc(10)
  .color(
    Math.random(),
    Math.random(),
    Math.random()
  )
  .out()
```

Using the same seed produces the same random sequence.

## JavaScript Runtime

---

Hydra programs are JavaScript programs, so `hydra-everything` executes the source inside a JavaScript runtime rather than attempting to parse Hydra into a different language.

Tree-sitter is used for JavaScript parsing and editor functionality.

```text
Hydra JavaScript
      ↓
JavaScript Runtime
      ↓
Hydra
```

This allows normal JavaScript features and Hydra's existing programming model to remain available.

## Extensions

---

Extensions are implemented independently from Hydra whenever possible.

For example, the unit system is provided by:

```text
extensions/
└── unit-converter.ts
```

The functions are temporarily injected into the execution environment:

```text
Create Renderer Context
        ↓
Create Extensions
        ↓
Inject Globals
        ↓
Execute Hydra
        ↓
Restore Globals
```

This avoids modifying Hydra internals and keeps extensions portable.

## Architecture

---

The current architecture is intentionally an intermediate step.

### Current

```text
                    Hydra
                      ↓
                Browser Runtime
                      ↓
                   Renderer
                      ↓
                    Export
```

The browser renderer provides a known implementation against which future rendering implementations can be compared.

### Future

```text
                    Hydra
                      ↓
              Rendering Pipeline
                      ↓
              Renderer Interface
                 ↙          ↘
            Browser        Native
             Renderer      Renderer
```

The goal is to separate the description and semantics of a Hydra program from the implementation of its renderer.

## Native Renderer

---

The current project is primarily an exporter.

The next major stage is a native renderer.

The purpose of the exporter is therefore not only to produce files, but also to establish a reference for Hydra's rendering behavior before replacing the browser renderer.

The intended direction is:

```text
Hydra Program
      ↓
Rendering Representation
      ↓
Native Renderer
      ↓
GPU
      ↓
Output
```

This should eventually allow Hydra programs to be rendered without requiring a browser.

Potential uses include:

* Offline rendering
* High-resolution rendering
* Frame-by-frame rendering
* Video rendering
* Native GPU rendering
* Integration with creative software
* Native preview

The browser renderer will remain useful as a reference implementation for validating the native renderer.

## Roadmap

---

### Export

* [x] Hydra live preview
* [x] Hydra code execution
* [x] JavaScript syntax highlighting
* [x] Tree-sitter integration
* [x] Configurable render resolution
* [x] Deterministic random seed
* [x] PNG export
* [x] Image sequence export
* [x] Resolution-aware units
* [x] Standalone executable

### After Effects

* [ ] After Effects export
* [ ] Frame sequence workflow
* [ ] Composition generation
* [ ] Project generation

### Native Renderer

* [ ] Rendering abstraction
* [ ] Renderer interface
* [ ] Formalize draw space/output buffer
* [ ] Native GPU renderer
* [ ] Native shader pipeline
* [ ] Native texture pipeline
* [ ] Browser/native rendering parity

### Future

* [ ] Video export
* [ ] Offline rendering
* [ ] Native preview
* [ ] Additional creative-tool integrations

## License

---

This project is licensed under the MIT License.
