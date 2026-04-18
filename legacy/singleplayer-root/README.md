# Legacy Singleplayer

This folder contains the old pre-multiplayer singleplayer version of the game.

## Run locally

Do not open `index.html` directly with a `file://` URL. The page uses `<script type="text/babel" src="...">`, which makes the browser fetch local `.jsx` files, and most browsers block that under `file://` for CORS/security reasons.

Serve the folder over HTTP instead:

```powershell
cd C:\Users\Adrian\Develop\hackergame\legacy\singleplayer-root
python -m http.server 8080
```

Then open:

- [http://localhost:8080](http://localhost:8080)

## Notes

- `styles.css` is copied locally in this folder so the archived singleplayer UI does not depend on the multiplayer client styles.
- This is a legacy reference copy, not the active app. The current multiplayer game lives in `client/` and `server/`.
