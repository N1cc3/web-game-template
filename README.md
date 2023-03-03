# web-game-template

Template for making a multiplayer browser game

## Get started

### Server

Check `src/game.ts` for an example on how to use the server. Includes logic for a chat with public and private messages. There should be no need to understand what's going on in `server.ts`. Just call `createServer()` and provide the required callbacks to get started. More explanations in jsdoc.

### Client

Check `front/src/App.tsx` for an example on how to connect to the server. Includes unstyled components required for hosting and joining a game, and chatting.

## Development

Run `npm run start` in root folder to start the development server and same command in `front/` folder to start a dev client with auto-reload.

## Production

Run `npm run build` in `front/` folder to build the client for production. Then run `npm run production` in root folder to start production server which serves the built client from the default build output folder `front/dist`.
