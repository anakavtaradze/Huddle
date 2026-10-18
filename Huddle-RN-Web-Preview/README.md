# Huddle React Native Web preview

This project renders the **same `App.tsx` and `src/` React Native components** in a browser via `react-native-web`. It is a development preview, **not** a Vega OS app or build.

## Windows / VS Code

1. Extract the ZIP, then open the extracted `Huddle-RN-Web-Preview` folder in VS Code.
2. Open Terminal > New Terminal.
3. In PowerShell use `npm.cmd install` then `npm.cmd run dev`. In Command Prompt use `npm install` then `npm run dev`.
4. In VS Code press Ctrl+Shift+P, choose **Simple Browser: Show**, and enter `http://localhost:5173/`.
5. Edit `App.tsx` or files in `src/`, save, and Vite should refresh the preview.

If `npm` isn't found on Windows, restart VS Code after installing Node.js or run `set "PATH=C:\\Program Files\\nodejs;%PATH%"` in **Command Prompt**.

## Working with your teammate

Commit `App.tsx` and `src/` to GitHub. After your teammate pushes compatible shared UI changes, pull them to this project to preview them. Native Vega-only modules require browser mocks/adapters. Do not copy this package's web dependencies into the Vega SDK application; use the SDK's versions there.

## Notes

The UI has mock rooms, games, friends, and scheduling; it has no real multiplayer/backend. React Native Web approximates native layout but is not a substitute for testing on Vega hardware. The original source-only project is left untouched.
