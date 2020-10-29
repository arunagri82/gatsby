import report from "gatsby-cli/lib/reporter"
import { trackCli } from "gatsby-telemetry"

import { findPageByPath } from "../find-page-by-path"
import { renderDevHTML } from "./render-dev-html"

export const route = ({ app, program, store }): any =>
  // Render an HTML page and serve it.
  app.get(`*`, async (req, res, next) => {
    trackCli(`GATSBY_EXPERIMENTAL_DEV_SSR`)

    const pathObj = findPageByPath(store.getState(), req.path)

    if (!pathObj) {
      return next()
    }

    const htmlActivity = report.phantomActivity(`building HTML for path`, {})
    htmlActivity.start()

    try {
      const renderResponse = await renderDevHTML({
        path: pathObj.path,
        htmlComponentRendererPath: `${program.directory}/public/render-page.js`,
        directory: program.directory,
      })
      res.status(200).send(renderResponse)
    } catch (error) {
      report.error({
        id: `11614`,
        filePath: error.filename,
        location: {
          start: {
            line: error.line,
            column: error.row,
          },
        },
        context: {
          path: pathObj.path,
          filePath: error.filename,
          line: error.line,
          column: error.row,
        },
      })
      res.status(500).send(`<title>Develop SSR Error</title><h1>Error<h1>
        <h2>The page didn't SSR correctly</h2>
        <ul>
          <li><strong>URL path:</strong> <code>${req.path}</code></li>
          <li><strong>File path:</strong> <code>${error.filename}</code></li>
        </ul>
        <h3>error message</h3>
        <p><code>${error.message}</code></p>
        <pre style="background:#fdfaf6;padding:8px;">${error.codeFrame}</pre>`)
    }

    // TODO add support for 404 and general rendering errors
    htmlActivity.end()

    // Make eslint happy
    return null
  })
