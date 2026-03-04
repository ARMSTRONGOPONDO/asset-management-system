Asset Management System (Node.js / MongoDB)
==========================================

Overview
--------

Web-based Asset Management System built with Node.js, Express, and MongoDB. It provides secure user authentication and a dashboard to register, track, transfer, dispose, and maintain organizational assets, with basic reporting summaries.

Tech Stack
---------

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication (JSON Web Tokens)
- Vanilla HTML/CSS/JS frontend (served from `public/`)

Project Structure
-----------------

- `server.js` – Express app setup, MongoDB connection, route mounting, static files.
- `config/db.js` – MongoDB connection helper.
- `middleware/auth.js` – JWT verification middleware.
- `models/` – Mongoose models:
  - `User.js` – user accounts (username, email, password hash).
  - `Asset.js` – core asset info (name, category, status, value, location, assignedTo, department, disposalReason, dateAcquired).
  - `Acquisition.js` – acquisition log entries.
  - `Disposal.js` – disposal log entries.
  - `Maintenance.js` – maintenance records linked to assets.
- `routes/` – API endpoints:
  - `auth.js` – register/login.
  - `assets.js` – asset CRUD, transfer, dispose; logs acquisitions/disposals.
  - `acquisitions.js` – acquisition listing/creation.
  - `disposals.js` – disposal listing/creation.
  - `maintenance.js` – maintenance logging and listing (optionally by asset).
  - `reports.js` – summary counts and breakdowns for the dashboard.
- `public/` – frontend pages and scripts:
  - `login.html`, `register.html`, `dashboard.html`.
  - `app.js` – all browser-side logic (auth, asset operations, maintenance, reports).
  - `style.css` – layout and styling.

Setup
-----

1. Install dependencies:

```bash
cd "test project"
npm install
```

2. Configure environment variables in `.env` (create if missing):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/asset-management
JWT_SECRET=your_jwt_secret_here
```

3. Start the server:

```bash
npm start
```

The app listens on `http://localhost:5000/` and redirects `/` to the login page.

Usage
-----

1. Registration and Login

- Visit `http://localhost:5000/register.html` to create an account.
- Then log in at `http://localhost:5000/login.html`.
- On successful login, a JWT and username are stored in `localStorage`, and you are redirected to `dashboard.html`.

2. Dashboard Features (`dashboard.html`)

- Add Asset
  - Fill in name, category, status, value, assigned person, department, and date acquired.
  - Submitting creates a new `Asset` and an `Acquisition` log entry.

- View / Edit / Delete Assets
  - The table lists all assets with key details.
  - `Edit` uses simple prompts to change name and status.
  - `Delete` removes the asset record.

- Transfer Assets
  - Choose an asset and enter a new location.
  - Updates the asset `location` field.

- Dispose Assets
  - Choose an asset and enter a disposal reason.
  - Sets status (e.g. `Disposed`), stores `disposalReason`, and records a `Disposal` log entry.

- Maintenance
  - Log maintenance for a selected asset (description, optional date and cost).
  - View maintenance history in the table; entries are linked to assets.

- Reports / Summary
  - Summary section shows total counts:
    - Total assets, acquisitions, disposals, maintenance records.
  - Tables show breakdowns by status, category, and department.

Notes
-----

- All asset, maintenance, and report endpoints are protected by JWT middleware; requests without a valid token are redirected back to login on the frontend.
- There is currently no role-based access control; all authenticated users can perform asset operations.
