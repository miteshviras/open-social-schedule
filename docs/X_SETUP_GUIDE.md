# X (Twitter) Developer App Setup Guide

This guide walks you through setting up your X (formerly Twitter) Developer App to enable OAuth 2.0 with PKCE authentication and automated tweet scheduling with **Open Social Scheduler**.

---

## Prerequisites

1. An active personal or business X (Twitter) account.
2. Access to the **[X Developer Portal](https://developer.x.com/en/portal/dashboard)**.
3. A Free or Basic tier developer account on X.

---

## Step-by-Step Instructions

### Step 1: Open Developer Portal & Verify Project Association

> [!IMPORTANT]
> In X's API v2 architecture, all apps **MUST be attached to a Project**. Standalone apps that reside outside of a project cannot access Twitter API v2 endpoints and will fail with authorization errors.

1. Navigate to **[developer.x.com](https://developer.x.com/en/portal/dashboard)** and sign in.
2. Under the **Projects & Apps** menu on the left sidebar:
   - If you already have a Project (e.g. *Default Project*), select your existing app or click **Add App**.
   - If you do not have a Project, click **+ Add Project**, give it a name, select your use case, and create an app inside it.
3. Open your app's **Settings** tab.

---

### Step 2: Configure User Authentication Settings (OAuth 2.0 PKCE)

1. In your App's **Settings** tab, scroll down to the **User authentication settings** section.
2. Click **Set up** (or **Edit** if already configured).
3. Configure the following fields:

#### App Permissions
- Select: **Read and write**
  - *Why:* Read-only permission prevents Open Social Scheduler from publishing tweets to your feed. If left on "Read", publishing will fail with `403 Forbidden`.

#### Type of App
- Select: **Web App, Automated App or Bot**
  - *Why:* This configures OAuth 2.0 confidential client authentication with PKCE support.

---

### Step 3: Configure Callback URI & Website URL

Under the **App info** section on the same page, enter the exact URLs below:

#### Callback URI / Redirect URL
```text
http://localhost:3000/api/auth/x/callback
```
*(Optional backup: You can also add `http://localhost:4000/api/auth/x/callback` on a new line)*.

#### Website URL
```text
http://localhost:3000
```
*(Or your project homepage, company URL, or GitHub repository URL)*.

#### Terms of Service & Privacy Policy (Optional for development)
- You may enter `http://localhost:3000` or leave blank if permitted.

Click **Save** at the bottom of the page.

---

### Step 4: Add Credentials to your `.env` File

> [!CAUTION]
> **Do NOT copy Consumer Keys (API Key & Secret)!**
> You must copy the **OAuth 2.0 Client ID** and **OAuth 2.0 Client Secret** generated specifically under User Authentication Settings.

1. Immediately upon saving the User Authentication Settings, X displays your:
   - **OAuth 2.0 Client ID**
   - **OAuth 2.0 Client Secret**
2. In the root directory of `open-social-schedule`, open your `.env` file and add:
   ```env
   # X (Twitter) Developer Credentials
   X_CLIENT_ID=your_oauth2_client_id_here
   X_CLIENT_SECRET=your_oauth2_client_secret_here
   X_REDIRECT_URI=http://localhost:3000/api/auth/x/callback
   X_SCOPES=tweet.read,tweet.write,users.read,offline.access
   ```

> [!TIP]
> **Why `offline.access` is essential:**
> Standard X access tokens expire in 2 hours. Including the `offline.access` scope instructs X to issue a `refresh_token`, allowing Open Social Scheduler's background worker to seamlessly refresh expired tokens without requiring you to log in again.

---

### Step 5: Connect in Open Social Scheduler

1. Open **[http://localhost:3000/accounts](http://localhost:3000/accounts)**.
2. On the **X (Twitter)** card, click **Connect 𝕏**.
3. You will be redirected to X's official OAuth 2.0 consent screen displaying requested permissions:
   - Read your profile information (`users.read`)
   - Read your Tweets (`tweet.read`)
   - Post Tweets on your behalf (`tweet.write`)
   - Stay connected in the background (`offline.access`)
4. Click **Authorize app**.
5. You will be redirected back to Open Social Scheduler with your handle (e.g. `@username`) connected and encrypted locally via AES-256-GCM.

---

## Troubleshooting Common Errors

### Error: `403 Forbidden` / `You are not allowed to create a Tweet`
- **Cause**: Your app permissions in X Developer Portal are set to **Read** instead of **Read and write**.
- **Fix**: Open **User authentication settings** in the X Developer Portal, change App Permissions to **Read and write**, save changes, and reconnect your account.

### Error: `invalid_request` / `redirect_uri_mismatch`
- **Cause**: The redirect URL configured in X Developer Portal does not match `http://localhost:3000/api/auth/x/callback` character-for-character.
- **Fix**: Verify there are no trailing slashes or typos in the portal's Callback URI.

### Error: `unauthorized_client` / `Invalid client_id`
- **Cause**: You pasted the Consumer API Key instead of the **OAuth 2.0 Client ID**.
- **Fix**: In the X portal, go to your app settings &rarr; User authentication settings, and copy the OAuth 2.0 Client ID and Secret.

### Error: App Not in a Project
- **Cause**: The app was created at the root level without being assigned to a project.
- **Fix**: In X Developer Portal, drag or assign the app into an active Project.
