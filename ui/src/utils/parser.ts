import {
  Language,
  Parser,
  Query,
} from 'web-tree-sitter'

import JAVASCRIPT_HIGHLIGHTS from 'tree-sitter-javascript/queries/highlights.scm?raw'
import WEB_TREE_SITTER_WASM from 'web-tree-sitter/web-tree-sitter.wasm?url'

await Parser.init({
  locateFile: () =>
    WEB_TREE_SITTER_WASM,
})

export function highlightCode(
  source: string,
  language: Language,
): HighlightCapture[] {
  const parser = new Parser()

  parser.setLanguage(language)

  const tree = parser.parse(source)

  if (!tree) {
    parser.delete()
    return []
  }

  const query = new Query(
    language,
    JAVASCRIPT_HIGHLIGHTS,
  )

  const matches =
    query.matches(tree.rootNode)

  const captures: HighlightCapture[] = []

  for (const match of matches) {
    for (const capture of match.captures) {
      captures.push({
        name: capture.name,
        start: capture.node.startIndex,
        end: capture.node.endIndex,
      })
    }
  }

  captures.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start
    }

    return b.end - a.end
  })

  query.delete()
  tree.delete()
  parser.delete()

  return captures
}
