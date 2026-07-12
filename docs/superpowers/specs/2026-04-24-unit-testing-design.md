# Unit Testing Design — ScaleForge Website
**Date:** 2026-04-24
**Status:** Approved

## Goal
Add proactive unit test coverage using Jest to prevent future regressions. No existing behavior is changed. No existing files are damaged. Tests run entirely in isolation.

## Scope

### In scope
- Backend: `/submit` route validation, Google Sheets forwarding, error handling (`server.js`)
- Frontend: form validation logic, `animateCount`, `buildSlots`, `rollTo` (`script.js`)

### Out of scope
- GSAP / Lenis / Spline (third-party libraries)
- IntersectionObserver (browser-only, not worth mocking)
- Google Sheets API (mocked at the fetch boundary)
- End-to-end or integration tests

## Framework
**Jest** with:
- `node` environment for backend tests
- `jsdom` environment for frontend tests
- `jest-environment-jsdom` package for DOM simulation

## File Changes

| File | Change | Risk |
|------|--------|------|
| `server.js` | Wrap `app.listen()` in `require.main === module` guard + `module.exports = app` | Zero — standard Node.js pattern, no behavior change |
| `package.json` | Add `jest`, `jest-environment-jsdom`, `babel-jest`, `@babel/core`, `@babel/preset-env` as `devDependencies` | Zero — dev only, not loaded in production |
| `jest.config.js` | New file — test runner config only | Zero — new file |
| `babel.config.js` | New file — transpiles `require` for Jest | Zero — new file |
| `__tests__/server.test.js` | New file — backend tests | Zero — new file |
| `__tests__/script.test.js` | New file — frontend tests | Zero — new file |
| `index.html`, `style.css`, `script.js`, `photos/` | **No changes** | None |

## Backend Tests (`__tests__/server.test.js`)

Environment: `node`

### Group 1 — Validation (400 responses)
- Missing `name` → 400 + `"Name, email and phone are required."`
- Missing `email` → 400 + same message
- Missing `phone` → 400 + same message
- All three present → does not return 400

### Group 2 — Happy path
- Valid payload → `fetch` called once with correct Google Sheets URL
- URL contains all params: `name`, `email`, `phone`, `businessName`, `service`, `budget`, `goals`, `timestamp`
- Returns `{ success: true, message: 'Lead saved to Google Sheets.' }`

### Group 3 — Error handling
- `fetch` throws → returns 500 + `{ success: false, message: 'Server error. Please try again.' }`

**Mocking strategy:** `jest.mock('node-fetch')` — no real HTTP calls made.

## Frontend Tests (`__tests__/script.test.js`)

Environment: `jsdom`

The functions under test (`handleForm`, `animateCount`, `buildSlots`, `rollTo`) are called directly by setting up the required DOM elements in jsdom before each test. `script.js` is loaded via `require` after setting up globals (`gsap`, `lenis`, `ScrollTrigger`, etc.) as jest mocks.

### Group 1 — `handleForm` validation
- Empty `name` → `alert` called, `fetch` not called
- Empty `email` → `alert` called, `fetch` not called
- Empty `phone` → `alert` called, `fetch` not called
- All fields filled → `fetch` called once, button disabled during request

### Group 2 — `animateCount`
- Starts at 0 and reaches target value
- Appends correct suffix (`+`, `×`, `%`, etc.)
- Clears interval after reaching target (no infinite loop)

### Group 3 — `toggleFaq`
- Clicking a closed FAQ item opens it and sets icon to `−`
- Clicking an open FAQ item closes it and sets icon to `+`
- Opening a new item closes any previously open item

**Note:** `buildSlots` and `rollTo` live inside a pricing IIFE in `script.js` and are not top-level — they are excluded from unit tests to avoid any change to `script.js`. If they need tests in future, they can be extracted to a `utils.js` at that point.

**Mocking strategy:** `global.fetch = jest.fn()`, `global.alert = jest.fn()`, GSAP/Lenis/ScrollTrigger mocked as no-op objects.

## Running Tests

```bash
npm test              # run all tests
npm test -- --watch   # watch mode during development
```

## Success Criteria
- All tests pass with `npm test`
- Zero changes to the website's visible behavior
- Coverage includes all validation branches and happy paths
