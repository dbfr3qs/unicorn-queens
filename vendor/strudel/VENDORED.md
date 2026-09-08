# Vendored: @strudel/web

    package:  @strudel/web
    version:  1.3.0
    licence:  AGPL-3.0-or-later (see ./LICENSE)
    source:   https://registry.npmjs.org/@strudel/web/-/web-1.3.0.tgz
    upstream: https://codeberg.org/uzu/strudel

Copied verbatim, unmodified:

    dist/index.js                        -> index.js          (UMD, 644 KB)
    dist/assets/clockworker-ZDiUtESR.js  -> assets/clockworker-ZDiUtESR.js

**The `assets/` path is load-bearing.** The UMD bundle builds its
SharedWorker URL as `new URL("assets/clockworker-ZDiUtESR.js", <this
script's src>)`, so the asset must stay in an `assets/` directory
directly beside `index.js`, under that exact filename.

AudioWorklets are inlined in the bundle as blob URLs — nothing else to
serve. No samples are fetched: `initStrudel()`'s default prebake calls
`registerSynthSounds()` only, so playback is fully offline.

To update: download the new tarball, copy the same two files, and check
whether the hashed clockworker filename changed.

See ../../MUSIC-PLAN.md §3.1 for the licence implications of shipping this.
