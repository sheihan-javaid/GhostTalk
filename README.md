
# How to Build a Clone of GhostTalk

This document provides a comprehensive, step-by-step guide to building a full-stack, anonymous, end-to-end encrypted chat application, just like this one.

## Table of Contents

1.  [Part 1: Project Setup & Core Technologies](#part-1-project-setup--core-technologies)
2.  [Part 2: Firebase Backend Configuration](#part-2-firebase-backend-configuration)
3.  [Part 3: Core Firebase Integration (Frontend)](#part-3-core-firebase-integration-frontend)
4.  [Part 4: End-to-End Encryption (E2EE) Logic](#part-4-end-to-end-encryption-e2ee-logic)
5.  [Part 5: Core UI & Layout Components](#part-5-core-ui--layout-components)
6.  [Part 6: Building the Home Page](#part-6-building-the-home-page)
7.  [Part 7: Building the Real-time Chat](#part-7-building-the-real-time-chat)
8.  [Part 8: Building the Ghost Lounge Features](#part-8-building-the-ghost-lounge-features)
9.  [Part 9: Backend Cloud Function for Room Cleanup](#part-9-backend-cloud-function-for-room-cleanup)
10. [Part 10: Automatic Data Deletion (TTL Policy)](#part-10-automatic-data-deletion-ttl-policy)
11. [Part 11: AI Integration for Anonymization & Content Moderation](#part-11-ai-integration)

---

## Part 1: Project Setup & Core Technologies

### 1.1. Initialize a Next.js Project

Start by creating a new Next.js application with TypeScript and Tailwind CSS.

```bash
npx create-next-app@latest ghosttalk-clone --typescript --tailwind --eslint
```

### 1.2. Install Core Dependencies

Navigate into your project and install all the necessary packages for UI, state management, and Firebase.

```bash
cd ghosttalk-clone
npm install \
  @hookform/resolvers@4.1.3 @radix-ui/react-accordion@1.2.3 @radix-ui/react-alert-dialog@1.1.6 \
  @radix-ui/react-avatar@1.1.3 @radix-ui/react-checkbox@1.1.4 @radix-ui/react-collapsible@1.1.11 \
  @radix-ui/react-dialog@1.1.6 @radix-ui/react-dropdown-menu@2.1.6 @radix-ui/react-label@2.1.2 \
  @radix-ui/react-menubar@1.1.6 @radix-ui/react-popover@1.1.6 @radix-ui/react-progress@1.1.2 \
  @radix-ui/react-radio-group@1.2.3 @radix-ui/react-scroll-area@1.2.3 @radix-ui/react-select@2.1.6 \
  @radix-ui/react-separator@1.1.2 @radix-ui/react-slider@1.2.3 @radix-ui/react-slot@1.2.3 \
  @radix-ui/react-switch@1.1.3 @radix-ui/react-tabs@1.1.3 @radix-ui/react-toast@1.2.6 \
  @radix-ui/react-tooltip@1.1.8 class-variance-authority@0.7.1 clsx@2.1.1 date-fns@3.6.0 \
  dotenv@16.5.0 embla-carousel-react@8.6.0 firebase@11.9.1 lucide-react@0.475.0 next@14.2.3 \
  openai@4.52.7 react@18.3.1 react-day-picker@8.10.1 react-dom@18.3.1 react-hook-form@7.54.2 \
  recharts@2.15.1 tailwind-merge@3.0.1 tailwindcss-animate@1.0.7 zod@3.24.2
```

### 1.3. Set up ShadCN/UI

Initialize ShadCN/UI for your component library. This will create your `components.json` file and the `src/lib/utils.ts` file. Choose the "Default" style and "Neutral" base color.

```bash
npx shadcn-ui@latest init
```

After initialization, add all the components used in the project.

```bash
npx shadcn-ui@latest add accordion alert-dialog avatar button card carousel checkbox collapsible dialog dropdown-menu form input label menubar popover progress radio-group scroll-area select separator sheet skeleton slider switch table tabs textarea toast tooltip
```

### 1.4. Configure Tailwind CSS

Update `tailwind.config.ts` to include custom fonts, colors, and animations. The `globals.css` file should be updated to define the theme variables. *Refer to the project files for the exact contents.*

### 1.5. Directory Structure

Create the following directory structure inside the `src/` folder:
- `src/ai/flows`
- `src/app/chat/[roomId]`
- `src/app/lounge/...`
- `src/components/ghosttalk`
- `src/components/ui` (managed by ShadCN)
- `src/firebase/firestore`
- `src/functions`
- `src/hooks`
- `src/lib`
- `docs` (at the root level)

---

## Part 2: Firebase Backend Configuration

### 2.1. Create a Firebase Project

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click "Add project" and follow the setup steps.
3.  Once created, go to **Project Settings > General**. Under "Your apps," click the web icon (`</>`) to register a new web app.
4.  Copy the `firebaseConfig` object provided.

### 2.2. Enable Firebase Services

In the Firebase Console, navigate to the "Build" section:
1.  **Authentication**: Click "Get started" and enable the **Anonymous** sign-in provider.
2.  **Firestore Database**: Click "Create database."

> **CRITICAL:** You must create the database in **Native Mode**. Do NOT select Datastore mode, as features like TTL (Time-to-Live) are only available in Native Mode. Start in **production mode** and choose a location.

> **⚠️ Important Warning on Datastore Mode:** If you have already created a database in "Datastore Mode" (e.g., you don't see a "TTL" tab), you **cannot** switch it. You must create a new database in the correct "Native Mode" by following the steps below. Doing so means your app will connect to a new, empty database, and **all data from your old database will be lost.** This is a necessary one-time step to ensure all app features work correctly.

### How to Create a New Database in Native Mode

1.  **Go to the Firestore Database section** in your Firebase project.
2.  At the top of the data viewer, you'll see a dropdown menu that likely shows your current database ID (e.g., "(default)"). Click it and select **"Create new database"**.
3.  You will now see the "Create a database" screen. This is the most critical step.
    *   For the database type, select **Cloud Firestore in Native Mode**.
    *   Choose a location for your database.
    *   You can give it a unique Database ID (e.g., `ghosttalk-native`) or use the one provided.
4.  Click **"Create"**. Your project will now have a new, empty database instance running in the correct mode. Your app will automatically connect to it.

### 2.3. Define the Data Model (`docs/backend.json`)

Create a `docs/backend.json` file to define all the data entities and Firestore paths. This serves as a blueprint for your app's data structure. *Refer to the project file for the exact contents.*

### 2.4. Set Up Security Rules (`firestore.rules`)

Create a `firestore.rules` file. These rules are critical for securing your database. They define who can read, write, update, or delete data in your Firestore collections. The rules for GhostTalk are designed to be secure and private. *Refer to the project file for the exact contents.*

---

## Part 3: Core Firebase Integration (Frontend)

This part involves creating the files that connect your Next.js app to Firebase.

1.  **`src/firebase/config.ts`**: Paste the `firebaseConfig` object from Step 2.1 here.
2.  **`src/firebase/index.ts`**: Create this "barrel" file to initialize Firebase and export all necessary hooks and providers.
3.  **`src/firebase/provider.tsx`**: This component provides the Firebase services (app, auth, firestore) and user authentication state to the entire app. It also includes the `useFirebase`, `useUser`, `useAuth` hooks.
4.  **`src/firebase/client-provider.tsx`**: A client-side wrapper around `FirebaseProvider` to ensure Firebase is only initialized in the browser.
5.  **`src/firebase/errors.ts` & `error-emitter.ts`**: These files set up a global error handling system, specifically for catching and formatting Firestore permission errors in a developer-friendly way.
6.  **`src/components/FirebaseErrorListener.tsx`**: An invisible component that listens for the permission errors and throws them to be caught by Next.js's error overlay during development.
7.  **`src/firebase/non-blocking-updates.tsx` & `non-blocking-login.tsx`**: These files contain functions for performing Firestore writes and authentication without blocking the UI thread (`await`), which leads to a more responsive user experience.
8.  **`src/firebase/firestore/use-collection.tsx` & `use-doc.tsx`**: These are custom React hooks for subscribing to real-time updates from Firestore collections and documents, respectively.

*For all files in this section, copy the exact contents from the provided project files.*

---

## Part 4: End-to-End Encryption (E2EE) Logic

The E2EE is the core privacy feature. All cryptographic operations are handled in `src/lib/crypto.ts`.

-   **Key Generation (`generateKeyPair`)**: Uses the Web Crypto API (`crypto.subtle`) to generate an `ECDH P-256` key pair for each user.
-   **Key Storage (`storeMyKeyPair`, `getMyPrivateKey`, etc.)**: The user's key pair is stored in `localStorage`. This is not the most secure method for a production app (a browser extension wallet or a server-based vault would be better), but it is sufficient for this project.
-   **Encryption (`encrypt`)**: To send a message, the app performs Elliptic Curve Diffie-Hellman (ECDH) key exchange. It generates a temporary (ephemeral) key pair, derives a shared secret with the recipient's public key, and uses that secret to encrypt the message with `AES-GCM`. The ephemeral public key is bundled with the ciphertext so the recipient can derive the same secret.
-   **Decryption (`decrypt`)**: The recipient uses the sender's ephemeral public key and their own private key to derive the same shared secret, which is then used to decrypt the ciphertext.

*Copy the contents of `src/lib/crypto.ts` exactly.*

---

## Part 5: Core UI & Layout Components

1.  **`src/app/layout.tsx`**: The root layout for the entire application. It sets up the font, `FirebaseClientProvider`, and the `Toaster` component for notifications.
2.  **`src/app/lounge/layout.tsx`**: A shared layout for all "Lounge" feature pages, providing a consistent "Back to Home" link and centered content styling.
3.  **`src/components/ghosttalk/loading-ghost.tsx`**: A reusable loading component displayed while fetching data or waiting for Firebase to initialize.
4.  **`src/hooks/use-mobile.tsx`**: A simple hook to detect if the user is on a mobile device.

---

## Part 6: Building the Home Page (`src/app/page.tsx`)

The home page is the main entry point. It handles:
-   **Anonymous Sign-In**: On first load, it initiates an anonymous sign-in with Firebase.
-   **Room Creation**:
    -   **Public Lobby**: Joins a public chat room based on the selected region.
    -   **Private Room**: Opens a dialog to create a new private room (with an optional name).
-   **Ghost Lounge**: A dialog that provides access to the experimental features (Whisper, Confession, Poll, AI).
-   **UI**: Built with ShadCN `Card` and `Dialog` components to create an interactive dashboard.

![Home Page](https://picsum.photos/seed/homepage/800/500)

*Copy the contents of `src/app/page.tsx`.*

---

## Part 7: Building the Real-time Chat

This is the most complex part of the application.

![Chat Interface](https://picsum.photos/seed/chat/800/600)

### 7.1. Chat Components

-   **`src/app/chat/[roomId]/page.tsx`**: The entry page for a chat room, which simply renders the `ChatLayout`.
-   **`src/components/ghosttalk/chat-layout.tsx`**: The main chat component. It manages all core logic:
    -   User initialization and key management.
    -   Joining rooms and fetching participant keys.
    -   Fetching and decrypting messages in real-time using `useCollection`.
    -   Sending encrypted messages via `handleSendMessage`.
    -   Deleting and editing messages.
    -   Applying UI settings.
-   **`src/components/ghosttalk/chat-header.tsx`**: Displays the room name/invite link and provides access to settings.
-   **`src/components/ghosttalk/message-list.tsx`**: Renders the list of messages, handling display logic for the current user vs. others.
-   **`src/components/ghosttalk/message-input.tsx`**: The text area for typing messages, including the "AI Anonymizer" switch.
-   **`src/components/ghosttalk/chat-settings.tsx` & `privacy-settings.tsx`**: Dialogs for customizing the chat appearance and privacy options.
-   **`src/lib/types.ts`**: Defines the TypeScript interfaces (`Message`, `ChatMessage`, `UiSettings`) used throughout the chat components.

### 7.2. Chat Logic Flow (in `chat-layout.tsx`)

1.  **Init User**: Generate/load crypto keys and get the user's anonymous name.
2.  **Join Room**: Add the user's UID and public key to the room's `participants` map in Firestore.
3.  **Fetch Messages**: `useCollection` subscribes to the `messages` subcollection.
4.  **Decrypt & Display**: As encrypted messages arrive, they are decrypted in a `useEffect` hook and displayed.
5.  **Send Message**: When a message is sent, it's encrypted for all participants (using their public keys) and written to Firestore.

---

## Part 8: Building the Ghost Lounge Features

These are standalone features accessible from the home page.

### 8.1. Whisper Mode (`src/app/lounge/whisper/page.tsx`)

-   **Functionality**: Creates a new private, temporary chat room (`isWhisper: true`).
-   **Logic**:
    1.  On button click, creates a new `chatRoom` document in Firestore.
    2.  Adds the current user as the first participant.
    3.  Generates a unique invite link (`/chat/<roomId>`).
    4.  Automatically redirects the user to the new room.

![Whisper Mode](https://picsum.photos/seed/whisper/800/400)

### 8.2. Confession Wall (`src/app/lounge/confession/page.tsx`)

-   **Functionality**: An anonymous public board where users can post text and images.
-   **Logic**:
    1.  Uses `useCollection` to fetch all documents from the `confessions` collection.
    2.  On "Post," it first sends the text to the `moderateConfession` AI flow.
    3.  If the content is appropriate, it creates a new document in the `confessions` collection with the text, timestamp, and optional media (as a Base64 data URL).
    4.  Allows users to "like" confessions, which increments a `likes` counter on the document.

![Confession Wall](https://picsum.photos/seed/confession/800/500)

### 8.3. Anonymous Poll (`src/app/lounge/poll/page.tsx`)

-   **Functionality**: Allows users to create and vote on anonymous polls.
-   **Logic**:
    1.  Fetches all polls from the `polls` collection.
    2.  Form for creating a new poll (question + options). A new document is added to the `polls` collection.
    3.  When a user votes, it increments the count for the chosen option in the `votes` map of the poll document.

![Anonymous Poll](https://picsum.photos/seed/poll/800/500)

### 8.4. Ghost AI Chat (`src/app/lounge/ghost-ai/page.tsx`)

-   **Functionality**: A private chatbot interface.
-   **Logic**:
    1.  Maintains a `history` of the conversation in its local state.
    2.  When the user sends a message, it calls the `ghostChat` server flow with the entire history.
    3.  The AI's response is added to the history, and the UI re-renders.

![Ghost AI](https://picsum.photos/seed/ghostai/800/600)

---

## Part 9: Backend Cloud Function for Room Cleanup

-   **File**: `src/functions/index.js` (and its `package.json`)
-   **Trigger**: `onDocumentUpdated` on the `chatRooms` collection.
-   **Logic**:
    1.  The function checks if a change occurred in a non-public room's `participants` map.
    2.  If the number of participants has dropped to zero, it means the last person has left.
    3.  It then deletes the entire chat room document from Firestore, effectively deleting the room and making its messages inaccessible.

---

## Part 10: Automatic Data Deletion (TTL Policy)

A core privacy promise of GhostTalk is that data is ephemeral. This is achieved using Firestore's built-in **Time-to-Live (TTL)** feature, which automatically deletes data after a specified duration. This is a **server-side configuration** and cannot be set from the app's code.

### 10.1. How to Set Up the 15-Day Message Deletion Policy

1.  Open your project in the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Build > Firestore Database**.
3.  In the top tabs (below the "Cloud Firestore" title), click on the **TTL** tab. If you do not see this tab, it means your database was created in "Datastore Mode" instead of "Native Mode". You must use Native Mode for this feature (see Part 2).
4.  Click the **"Create policy"** button.
5.  For the **Collection Path**, enter `chatRooms/{roomId}/messages`. This targets the `messages` subcollection within every chat room.
6.  For the **Time Field**, select `timestamp` from the dropdown. This is the field the policy will use to determine the age of a message.
7.  Set the **TTL Period** to **15 Days**.
8.  Click **"Save"**.

Once this policy is active, Firestore will automatically delete any message document 15 days after it was created. This ensures user data is not stored indefinitely.

---

## Part 11: AI Integration

The AI flows add intelligence to the app. They are all defined in the `src/ai/flows` directory.

-   **`generate-anonymous-name.ts`**: Called when a new user joins. It asks a free Mistral model on OpenRouter to generate a creative, anonymous username.
-   **`anonymize-message-metadata.ts`**: Called when the "AI Anonymizer" switch is on. It uses an AI prompt to find and remove any personally identifiable information (PII) from a message before it's encrypted and sent.
-   **`moderate-confession.ts`**: Called before posting to the Confession Wall. It uses an AI prompt to check for inappropriate content and responds with a JSON object indicating if the content is safe.
-   **`ghost-chat.ts`**: Powers the Ghost AI feature. It takes the chat history and generates a conversational response.

**To make these work, you must:**
1.  Get an API key from [OpenRouter.ai](https://openrouter.ai/).
2.  Create a `.env` file in the root of your project.
3.  Add your key to the `.env` file: `OPENROUTER_API_KEY=your_key_here`.

This comprehensive guide covers every piece of the puzzle. By following these steps and referring to the provided source code for each file, you will be able to build a complete, functional clone of GhostTalk.
