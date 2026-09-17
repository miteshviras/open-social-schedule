# LinkedIn Developer App Setup Guide

This guide walks you through setting up your LinkedIn Developer App to enable OAuth 2.0 authentication and scheduled publishing with **Open Social Scheduler**.

---

## Prerequisites

1. A personal LinkedIn account.
2. A LinkedIn Company Page or Showcase Page (required by LinkedIn to create and verify a developer application).
3. Access to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps).

---

## Step-by-Step Instructions

### Step 1: Create a LinkedIn App
1. Navigate to the **[LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)** and log in.
2. Click **Create App** in the top right.
3. Fill out the application details:
   - **App name**: e.g., `Open Social Scheduler`
   - **LinkedIn Page**: Search and select your company or showcase page.
   - **Privacy policy URL**: Any valid URL or your company page.
   - **App logo**: Upload any square logo image (minimum 100x100px).
4. Check the legal agreement checkbox and click **Create app**.

---

### Step 2: Request Required Products (Crucial!)

> [!IMPORTANT]
> By default, newly created LinkedIn apps have **ZERO permissions**. You must explicitly add the two products below. Without these, LinkedIn will throw the error:
> *"Bummer, something went wrong. In five seconds, you will be redirected to: localhost"*.

1. In your app's dashboard, click the **Products** tab.
2. Find and request access to these **two products**:
   - **"Share on LinkedIn"**
     - Click **Request access** and accept terms.
     - **Grants Scope:** `w_member_social` (required to create and publish posts to your feed).
   - **"Sign In with LinkedIn using OpenID Connect"**
     - Click **Request access** and accept terms.
     - **Grants Scopes:** `openid`, `profile` (required to retrieve your display name and profile picture).
3. Both products are approved **instantly** for personal developer apps. Verify that both products display a green **"Added"** status.

---

### Step 3: Configure Authorized Redirect URL

1. In your app dashboard, go to the **Auth** tab.
2. Scroll to the **OAuth 2.0 settings** section.
3. Next to **Authorized redirect URLs for your app**, click the **+ (Add redirect URL)** icon.
4. Paste the following URL:
   ```text
   http://localhost:3000/api/auth/linkedin/callback
   ```
   *(Optional backup: You can also add `http://localhost:4000/api/auth/linkedin/callback`)*.
5. **CRITICAL:** Click the **Update** (or checkmark) button! If you do not click Update, the portal will not save the URL.

---

### Step 4: Add Credentials to your `.env` File

1. On the **Auth** tab, copy:
   - **Client ID**
   - **Primary Client Secret**
2. In the root directory of `open-social-schedule`, open your `.env` file and add:
   ```env
   # LinkedIn Developer Credentials
   LINKEDIN_CLIENT_ID=your_client_id_here
   LINKEDIN_CLIENT_SECRET=your_client_secret_here
   LINKEDIN_REDIRECT_URI=http://localhost:3000/api/auth/linkedin/callback
   LINKEDIN_SCOPES=openid,profile,w_member_social
   ```

> [!TIP]
> The default scopes are configured as `openid,profile,w_member_social`. If your app only has `openid,profile` or custom permissions, you can customize `LINKEDIN_SCOPES` at any time.

---

### Step 5: Connect in Open Social Scheduler

1. Open [http://localhost:3000/accounts](http://localhost:3000/accounts).
2. Click **Connect LinkedIn**.
3. You will be redirected to LinkedIn's official OAuth consent screen.
4. Click **Allow** / **Authorize**.
5. You will be redirected back to Open Social Scheduler with your profile connected and ready for automated publishing!

---

## Troubleshooting Common Errors

### Error: "Bummer, something went wrong"
This is LinkedIn's generic OAuth failure page. It happens for three reasons:
1. **Unapproved Scopes**: You requested a scope that has not been approved in your app's **Products** tab. Make sure **Share on LinkedIn** (`w_member_social`) and **Sign In with LinkedIn using OpenID Connect** (`openid`, `profile`) both show as **"Added"**.
2. **Redirect URL Mismatch**: The redirect URI in `.env` must match character-for-character with what is saved in the LinkedIn Portal under **Auth -> Authorized redirect URLs**.
3. **Unsaved URL**: Verify that you clicked **Update** in the LinkedIn Portal after pasting the callback URL.
