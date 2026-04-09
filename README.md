# FilmFiesta

## Deploy on Netlify (Frontend)

This repository is pre-configured for Netlify with `netlify.toml`.

### Netlify settings

- **Base directory:** `film-fiesta` (if your Git repo root is one level above this app)
- **Build command:** `npm run build`
- **Publish directory:** `build`

If this folder itself is the Git root, leave **Base directory** empty.

### Required environment variable

Set this in Netlify Site Settings → Environment Variables:

- `REACT_APP_API_URL=/api`
- `TMDB_API_KEY=your_tmdb_v3_api_key`
- `MONGO_URI=your_mongodb_connection_string`
- `JWT_SECRET=your_long_random_secret`
- `CORS_ORIGIN=https://your-site.netlify.app`

Optional alternative to `TMDB_API_KEY`:

- `TMDB_READ_ACCESS_TOKEN=your_tmdb_v4_read_access_token`

This makes the frontend call `/api/...`, which is handled by Netlify Function `/.netlify/functions/api`.
TMDB requests are routed through `/.netlify/functions/tmdb`, so credentials stay server-side.

No separate backend host is required for auth/comments/ratings when using this Netlify setup.

### SPA routing

SPA fallback is already configured in both:

- `netlify.toml`
- `public/_redirects`

So client-side routes like `/movies/123` load correctly after refresh.

---

## Local development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
