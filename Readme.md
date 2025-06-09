# Full Stack Engineer Challenge Solution

## Description

This script is a solution for the Full Stack Engineer challenge. [cite_start]Its purpose is to programmatically reverse-engineer the legacy web application at `challenge.sunvoy.com`. [cite_start]It fetches a list of users and the details of the currently authenticated user, then saves the combined results into a single `users.json` file.

## Features

- **Two-Step Authentication:** Successfully authenticates into the web application by first fetching a unique `nonce` from the login page and then using it in the credential `POST` request.
- [cite_start]**API Data Fetching:** Retrieves a list of users from the internal `POST /api/users` endpoint.
- [cite_start]**Headless Browser Scraping:** Uses Puppeteer to launch a headless browser, ensuring that the JavaScript-rendered `/settings` page is fully loaded before scraping the currently logged-in user's details from the page's HTML.
- [cite_start]**Session Persistence:** Saves session cookies to a `cookies.json` file and reuses them on subsequent runs if the session is still valid, as required by the challenge.
- [cite_start]**JSON Output:** Generates a clean, pretty-formatted `users.json` file containing exactly 10 user items.

## Requirements

- [cite_start]Node.js (Current LTS version)

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone <https://github.com/Lokeshwar28/sunvoy-challenge>
    ```

2.  **Navigate into the project directory:**

    ```bash
    cd <project-directory>
    ```

3.  **Install dependencies:**
    This project requires `cheerio`, `tough-cookie`, and `puppeteer`. Install them by running:
    ```bash
    npm install
    ```

## Usage

[cite_start]To run the script, execute the following command from the root of the project directory:

```bash
npm run start
```

Upon successful completion, a `users.json` file will be created or updated in the project root.

## Demonstration

[cite_start]As required, here is a short Loom video showing the script in action.

My Loom video link : https://www.loom.com/share/5fc06492076d4319bc847fea12025d8e?sid=5fc227a6-7bc8-4366-bc78-193c3198951d
