# TouchGrass MVP - Burnout Prevention App
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
 You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).
  
This project is connected to the Convex deployment named [`perfect-setter-780`](https://dashboard.convex.dev/d/perfect-setter-780).
  
## Project structure
  
The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the `convex` directory.
  
`npm run dev` will start the frontend and backend servers.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Environment Setup

### GitHub Integration

To enable GitHub commit pattern analysis with higher rate limits, add a GitHub Personal Access Token:

1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Generate a new token (classic) with `public_repo` scope (or `repo` for private repositories)
3. Add it to your environment variables:

```bash
# In your .env.local file or deployment environment
GITHUB_TOKEN=ghp_your_token_here
```

**Rate Limits:**
- Without token: 60 requests/hour per IP
- With token: 5,000 requests/hour per user

The app will work without a token but may hit rate limits with frequent usage.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
