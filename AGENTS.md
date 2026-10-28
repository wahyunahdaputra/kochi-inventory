<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep private screens under the authenticated layout and fetch through authenticated server functions; database RLS is the authorization boundary.
- Stock and purchase writes use database RPCs only; do not update balances from application code.
- Store file objects in division-prefixed private paths and issue signed URLs only after access checks.
- Bootstrap the first administrator through an owner-authorized database operation, never a public self-promotion button.
- Reusable inventory screens share a validated page registry; each named screen has a URL and unique metadata.
