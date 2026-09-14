# Let Me GitHub Search That For You

> For colleagues who keep asking questions a three-second search would have answered.

A passive-aggressive **"Let Me GitHub Search That For You"** generator — the GitHub-flavored cousin of LMGTFY. Type the thing someone *absolutely could not* look up themselves, generate a link, and send it. When they open it, an animated cursor slowly types out their query while snarky captions roll, then redirects them to the real GitHub search results.

Live at **[lmgstfy.fun](https://lmgstfy.fun)**.

## Features

- **Two scopes** — search all of GitHub, or choose an organization (`org:acme`), user (`user:octocat`), or repository (`repo:acme/project`). GitHub URLs work too.
- **Validated scope** — empty or invalid scoped input shows an error instead of silently searching all of GitHub. The generated link includes a visible GitHub destination; editing the form hides stale output.
- **All search types** — Code, Repositories, Issues, PRs, Commits, Discussions, Wikis, Packages, Users.
- **Self-contained** — one `index.html`, no server, no build, no tracking. The query is encoded entirely in the link.
- **Deterministic snark** — the passive-aggressive lines are picked from the query, so a given link always plays the same.
- **Preview & Skip** — preview the animation before sending; victims get a Skip button (begrudgingly).
- **Social cards** — Open Graph / Twitter meta so the link looks good pasted in Slack, Discord, or Twitter.

## How it works

The generated link looks like:

```
https://lmgstfy.fun/?q=how+does+auth+work&u=acme-corp&s=org&t=code
```

| Param | Meaning |
|-------|---------|
| `q`   | the search query |
| `u`   | (optional) organization, username, or owner/repository; omit for all of GitHub |
| `s`   | scope kind: `org`, `user`, or `repo`. Old links without `s` retain `user:` behavior |
| `t`   | GitHub search type (`code`, `repositories`, `issues`, …) |

Open with no `q` → the **creator** UI. Open with a `q` → the **player** animation, then a redirect to `github.com/search`.

Choose **Repositories** to find repositories by name, description, or topics; choose **Code** to search inside files. Code search requires the recipient to sign in to GitHub. Private repository results depend on that person's existing access.

## Checks

Run `node --test tests/search.test.cjs` for URL construction, input validation, and legacy-link regressions. For browser checks, serve the folder locally and exercise generation, preview, invalid input, and a shared-link redirect.

## Files

| File | Purpose |
|------|---------|
| `index.html`   | the entire app (creator + player) |
| `og-image.svg` | source for the social card |
| `og-image.png` | rendered 1200×630 card referenced by the meta tags |
| `CNAME`        | custom domain for GitHub Pages (`lmgstfy.fun`) |

### Regenerating the OG image

```sh
rsvg-convert -w 1200 -h 630 og-image.svg -o og-image.png
```

## License

MIT — go forth and shame responsibly.
