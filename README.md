<div align="center">
    <img src="frontend/public/turbine_banner.png">
    <h1>Turbine</h1>
    <p>
        <sup>A modern and open-source twist to classic pastebin sites.</sup>
    </p>
</div>

## What is this?
Turbine originally started out as a simple pastebin idea so I could have a nice place to host
all of my long messages and source code files. In other words, something similar to [Hastebin](https://hastebin.com):
a simple and minimalistic paste site. It comes with simple features but nothing too advanced, such as accounts or theme
customization.

And so why not create something similar to [GitHub Gist](https://gist.github.com)? It has features like secret gists
and because it's a mini-git repository, you're able to view past revisions on those gists. I strive Turbine to
have many of these features inspired by GitHub Gist while still maintaining a clear and straightforward UI.

*TL;DR: It's a pastebin.*

## Features:
- A modern and straightforward UI
- Password-protected and private pastes
- Public, discoverable pastes
- User accounts
- Automatic (and manually selected) code highlighting
- Theme and font customization

### TODO:
- Ratelimiting
- Expiring pastes
- Store paste creation dates
- Store paste view counts
- Paste "stars", like GitHub repository stars

## Contributing
If you'd like to contribute to Turbine, make sure you meet the following requirements:

### For the Rust backend:
- Code has been built and checked with `cargo check`
- Code is formatted with `cargo fmt`

### For the Next.js frontend:
- Code works properly

### As a general rule of thumb:
- Commit messages should be in present tense, e.g. `Add feature` instead of `Added feature`
- Keep lines of code under 120 characters long

## Self-hosting?
I don't plan on providing instructions or support for anyone who tries to self-host this.
I would prefer you don't self-host your own instance of Turbine and instead use the official instance
[here](https://turbine-b.in).

There is nothing stopping you from self-hosting, though. But please abide by the license.
