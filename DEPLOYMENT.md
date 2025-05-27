# Deployment Guide

This project can be deployed to multiple environments using different branches.

## Branch Strategy

- `main` - Development branch (this fork)
- `staging` - Staging environment for testing
- `production` - Production environment

## Environment Variables

Make sure to set these environment variables in your deployment platform:

### Required for Spotify Integration
- `SPOTIFY_CLIENT_ID` - Your Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Your Spotify app client secret  
- `SPOTIFY_REDIRECT_URI` - Your app's callback URL

## Deployment Commands

### Create and deploy to staging
\`\`\`bash
git checkout -b staging
git push origin staging
\`\`\`

### Create and deploy to production
\`\`\`bash
git checkout -b production  
git push origin production
\`\`\`

## Platform-Specific Instructions

### Vercel
1. Connect your GitHub repository
2. Set environment variables in project settings
3. Deploy from your chosen branch

### Netlify
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Set environment variables

### Railway/Render
1. Connect your GitHub repository
2. Set environment variables
3. Deploy from your chosen branch

## Spotify App Configuration

Make sure your Spotify app (at https://developer.spotify.com/dashboard) has the correct redirect URIs configured:

- Development: `http://localhost:3000/spotify-callback`
- Staging: `https://your-staging-url.vercel.app/spotify-callback`
- Production: `https://your-production-url.com/spotify-callback`

## Features

All features are enabled by default:
- Beat Analyzer - Real-time BPM detection and visualization
- Full Track Player - Premium Spotify playback with Web Playback SDK
- AI Playlist Generation - Smart playlist creation based on workout preferences
- Time Markers - Custom workout cue points for tracks
