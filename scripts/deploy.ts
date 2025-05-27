#!/usr/bin/env node

/**
 * Deployment script for creating and pushing branches
 */

import { execSync } from "child_process"

const args = process.argv.slice(2)
const environment = args[0]

if (!environment || !["staging", "production"].includes(environment)) {
  console.error("Usage: npm run deploy <staging|production>")
  process.exit(1)
}

try {
  console.log(`🚀 Deploying to ${environment}...`)

  // Check if we have uncommitted changes
  try {
    execSync("git diff-index --quiet HEAD --", { stdio: "inherit" })
  } catch (error) {
    console.error("❌ You have uncommitted changes. Please commit or stash them first.")
    process.exit(1)
  }

  // Create or switch to the branch
  try {
    execSync(`git checkout ${environment}`, { stdio: "inherit" })
    console.log(`✅ Switched to existing ${environment} branch`)
  } catch (error) {
    console.log(`📝 Creating new ${environment} branch...`)
    execSync(`git checkout -b ${environment}`, { stdio: "inherit" })
  }

  // Merge latest changes from main
  execSync("git merge main", { stdio: "inherit" })

  // Push to remote
  execSync(`git push origin ${environment}`, { stdio: "inherit" })

  console.log(`✅ Successfully deployed to ${environment} branch!`)
  console.log(`🔗 Your deployment platform should automatically deploy from the ${environment} branch.`)
} catch (error) {
  console.error(`❌ Deployment failed:`, error)
  process.exit(1)
}
