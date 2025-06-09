import { writeFile, readFile } from "fs/promises";
import path from "path";
import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";
import puppeteer, { CookieParam } from "puppeteer";

// --- Interfaces and Configuration ---
interface User {
  id: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  email: string | undefined;
}

const config = {
  domain: "https://challenge.sunvoy.com",
  loginUrl: "https://challenge.sunvoy.com/login",
  usersApiUrl: "https://challenge.sunvoy.com/api/users",
  settingsPageUrl: "https://challenge.sunvoy.com/settings",
  credentials: {
    username: "demo@example.org",
    password: "test",
  },
  cookieFilePath: "cookies.json",
  outputFilePath: path.join(process.cwd(), "users.json"),
};

// --- Main Application ---

let cookieJar = new CookieJar();

/**
 * Loads a previously saved session from a file to reuse authentication.
 */
async function loadCookies(): Promise<void> {
  try {
    const cookieFile = await readFile(config.cookieFilePath, "utf-8");
    cookieJar = await CookieJar.fromJSON(cookieFile);
  } catch (error) {
    // It's okay if the file doesn't exist on the first run.
  }
}

/**
 * Saves the current session cookies to a file for future use.
 */
async function saveCookies(): Promise<void> {
  await writeFile(config.cookieFilePath, JSON.stringify(cookieJar.toJSON()));
}

/**
 * Checks if the loaded session cookie is still valid and not expired.
 */
async function hasValidSession(): Promise<boolean> {
  const cookies = await cookieJar.getCookies(config.domain);
  const sessionCookie = cookies.find((c) => c.key?.includes("session"));
  // tough-cookie automatically handles expiration, so just checking for existence is enough.
  return !!sessionCookie;
}

/**
 * Performs the full two-step authentication process to establish a new session.
 * Step 1: Fetches the login page to get a CSRF-like 'nonce'.
 * Step 2: Posts the nonce with credentials to get a session cookie.
 */
async function authenticate(): Promise<void> {
  const loginPageRes = await fetch(config.loginUrl);
  const html = await loginPageRes.text();
  const $ = cheerio.load(html);
  const nonce = $('input[name="nonce"]').val();

  if (typeof nonce !== "string") {
    throw new Error("Could not find nonce value on the login page.");
  }

  const authRes = await fetch(config.loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ nonce, ...config.credentials }).toString(),
    redirect: "manual",
  });

  const cookieHeaders = authRes.headers.getSetCookie();
  if (authRes.status !== 302 || !cookieHeaders.length) {
    throw new Error(
      "Authentication failed. The server did not return a valid session."
    );
  }

  for (const cookie of cookieHeaders) {
    await cookieJar.setCookie(cookie, config.domain);
  }
}

/**
 * Fetches the list of users from the API and scrapes the current user's
 * details from the JavaScript-rendered settings page.
 * @returns A promise that resolves to an array of all 10 user objects.
 */
async function fetchData(): Promise<User[]> {
  const cookieString = await cookieJar.getCookieString(config.domain);
  const headers = { Cookie: cookieString };

  // Fetch the main user list from its dedicated API endpoint.
  const usersResponse = await fetch(config.usersApiUrl, {
    method: "POST",
    headers,
  });
  if (!usersResponse.ok) throw new Error(`Users API fetch failed.`);
  const userList: User[] = await usersResponse.json();

  // Launch a headless browser to render the JavaScript-dependent settings page.
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Convert tough-cookie format to the format Puppeteer expects.
  const toughCookies = await cookieJar.getCookies(config.domain);
  const puppeteerCookies: CookieParam[] = toughCookies.map((cookie) => ({
    name: cookie.key,
    value: cookie.value,
    domain: cookie.domain ?? undefined,
    path: cookie.path ?? undefined,
    expires:
      cookie.expires === "Infinity"
        ? -1
        : new Date(cookie.expires).getTime() / 1000,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
  }));

  // Set cookies in the browser instance to ensure an authenticated session.
  // The function expects a single cookie object at a time, so we loop.
  for (const cookie of puppeteerCookies) {
    await page.setCookie(cookie);
  }

  // Navigate to the settings page and wait for the form to be rendered by JavaScript.
  await page.goto(config.settingsPageUrl);
  await page.waitForSelector("form.space-y-4 input");

  const settingsHtml = await page.content();
  await browser.close();

  // Scrape the final, rendered HTML to get the current user's details.
  const $ = cheerio.load(settingsHtml);
  const inputs = $("form input");
  const currentUser: User = {
    id: inputs.eq(0).val() || "",
    firstName: inputs.eq(1).val() || "",
    lastName: inputs.eq(2).val() || "",
    email: inputs.eq(3).val() || "",
  };

  return [...userList, currentUser];
}

/**
 * Main function to orchestrate the script execution.
 */
async function main() {
  try {
    await loadCookies();

    if (!(await hasValidSession())) {
      console.log("No valid session found, performing new login...");
      await authenticate();
      await saveCookies();
    } else {
      console.log("✅ Reusing valid session from cookies.json.");
    }

    const allData = await fetchData();
    await writeFile(config.outputFilePath, JSON.stringify(allData, null, 2));

    console.log(
      `\n🎉 Success! All data has been saved to ${config.outputFilePath}`
    );
    console.log(`Total items in users.json: ${allData.length}`);
  } catch (error) {
    console.error("\n❌ An error occurred:", error);
    process.exit(1);
  }
}

main();
