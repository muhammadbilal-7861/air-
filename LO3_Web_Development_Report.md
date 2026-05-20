# Web Development: Design, Develop and Manage Website 

## Project Overview

Project: Multi-page airline information and booking portal
Website brand: SkyWay Airlines

This report documents the design, implementation, justification, and evaluation of the multipage website created in the `flight-info` project. It includes the required design document material, implementation evidence, and an evaluation of the development process.

---

## 1. Design Document 

### 1.1 Client needs

- A branded multipage website for TechHub to demonstrate a realistic travel/booking portal.
- Accessible, responsive design that works on mobile and desktop.
- Clear navigation across key pages: home, schedule, status, booking, manage booking, offers, account, admin, about, contact.
- Interactive search, booking, and status features.
- Branding consistent with professional airline-style visual identity.
- External CSS and HTML5 semantics with modern usability.

### 1.2 User goals

- Quickly search and find flights.
- View full flight schedules and status updates.
- Book a flight and receive confirmation.
- Manage existing bookings using a PNR.
- View account details and saved bookings.
- Browse promotions and contact support.
- Admin users can manage flights, bookings, offers, and customer messages.

### 1.3 Key pages and wireframes

The final website includes 9 interlinked pages:

1. Home (`index.html`)
2. Flight Schedule (`flight-schedule.html`)
3. Flight Status (`flight-status.html`)
4. Booking (`booking.html`)
5. Manage Booking (`manage-booking.html`)
6. Offers (`offers.html`)
7. User Dashboard (`user-dashboard.html`)
8. Admin Dashboard (`admin-dashboard.html`)
9. About & Contact (`about.html`, `contact.html`)

Wireframe descriptions:

- Home: fixed header with brand, hero banner, flight search form, featured cards linking to schedule/status/offers, and flight table results.
- Schedule: page top banner, filter form, schedule cards laid out in a responsive grid.
- Status: two search panels (flight number / route) plus results area.
- Booking: booking form inside a card, conditional login requirement, success modal with PNR.
- Manage Booking: PNR lookup form and result area.
- Offers: promotional cards and loyalty progress block.
- User Dashboard: guest login/register, authenticated profile/bookings/favorites tabs.
- Admin Dashboard: analytics cards, management tabs for flights/users/bookings/offers/reports/messages.
- About: brand story, metrics cards.
- Contact: contact form and contact details panel.

### 1.4 Navigation structure, layout grid, and content hierarchy

Navigation structure:

- Primary menu: Home, Schedule, Status, Book, Manage, Offers, My Account, Admin, About, Contact.
- Admin menu items are visible only to authenticated admin users.
- Consistent footer on every page.

Layout grid and hierarchy:

- Use Bootstrap 5 responsive grid and cards.
- Hero section at top of each page to establish purpose.
- Form sections and content cards arranged in 12-column responsive rows.
- Tables and result panels for data-driven pages.
- Clear headings, labels, and button hierarchy.

### 1.5 Colour scheme, typography, branding

Brand palette:

- Primary: #0b3d91 (deep blue)
- Primary dark: #07285e
- Accent: #ffb703 (bright yellow)
- Background: #f5f8ff / white
- Text: dark gray / black for readability

Typography:

- Font family: `Inter`, system UI fallback.
- Headings: bold, strong hierarchy for page headers.
- Body text: clean sans-serif, readable line spacing.

Branding decisions:

- Airline-style brand name and mark (`SW`) in navigation.
- Professional color palette that supports trust and clarity.
- Consistent button styling and icon use from Bootstrap Icons.
- Strong visual contrast for accessibility.

---

## 2. Website Implementation

### 2.1 Pages delivered

The project delivers 9 multipage website files with consistent layout and navigation.

- `index.html`
- `flight-schedule.html`
- `flight-status.html`
- `booking.html`
- `manage-booking.html`
- `offers.html`
- `user-dashboard.html`
- `admin-dashboard.html`
- `about.html`
- `contact.html`

### 2.2 Implementation technologies and structure

- HTML5 semantic page structure: `header`, `main`, `section`, `footer`.
- External stylesheet: `styles.css`.
- Bootstrap 5 for responsive grid, forms, cards, buttons, navbars.
- Google Font `Inter` for typography.
- JavaScript module `app.js` for shared navigation, login modal, data filtering, booking and admin features.
- Firebase integration placeholders in `firebase-config.js` for data storage and authentication.

### 2.3 Interactive elements

- Search and filter forms on Home and Schedule.
- Flight status lookup by number and route.
- Booking form with validation and success confirmation modal.
- PNR lookup for booking management.
- Login/register flows on user dashboard.
- Admin dashboard management tabs and data tables.
- Contact form for user messages.

### 2.4 Accessibility and responsive design

- All forms use `label` elements tied to inputs.
- Buttons and links are keyboard accessible.
- Responsive grid adapts to mobile, tablet, and desktop.
- High-contrast accessible color choices.
- Input placeholders and aria-friendly structure via Bootstrap.

---

## 3. Justification of Implementation

### 3.1 Justifying page and layout decisions

- The home page implements the wireframe structure with a hero section, search form, featured cards, and a data table. This keeps the most important flight search actions visible first.
- Flight schedule and status pages use card-based filter sections and results panels to match the documented content hierarchy.
- The booking page keeps the booking form central and adds a success modal, supporting user confidence and clear next steps.
- Account and admin pages are separated to provide distinct user journeys for travellers and administrators.

### 3.2 Justifying technology choices

- Bootstrap was chosen to speed responsive development and ensure a consistent layout across 9 pages.
- `styles.css` provides custom brand overrides and page-specific styling while keeping separation of concerns from HTML.
- JavaScript is modular and shared across pages, using DOM injection to build common navigation and modals so updates are consistent.
- Firebase-related imports in `app.js` support future backend connectivity for authentication and data management.

### 3.3 Justifying functionality adjustments

- The original design document proposed a medium-fidelity grid layout. The final implementation kept that layout while simplifying some form interactions for usability.
- The admin dashboard includes analytics and management tabs, which extend the design document by clearly separating tasks and improving user workflow.
- Shared page scaffolding (`siteNav`, `siteModals`) was implemented in `app.js` to reduce duplication and maintain consistent site structure.

---

## 4. Evaluation of Design & Development Process

### 4.1 Alignment with the design document and client requirements

- The final website aligns well with the design document by delivering a branded multipage site with navigation, hero sections, forms, cards, and interactive features.
- The site includes more than the required 7–10 pages, offering a full suite of home, schedule, status, booking, management, offers, user account, admin, about, and contact pages.
- The client requirement for a professional branded portal is met through consistent color, typography, and navigation design.

### 4.2 Technical challenges and resolution

- Keeping common navigation and modals consistent across pages was a challenge; this was resolved by injecting shared HTML with `app.js` and reflecting authentication state dynamically.
- Ensuring responsive layout across many page types required careful use of Bootstrap grid classes and custom media queries in `styles.css`.
- A markup issue in `admin-dashboard.html` was identified and fixed to ensure valid tab navigation structure.
- Implementing both user and admin workflows in a static site structure required clear separations and conditional display logic in JavaScript.

### 4.3 Reflection on design decisions, tools, and techniques

- Using Bootstrap and a single CSS theme made the site visually consistent and easier to maintain.
- HTML5 semantics improved page structure and accessibility, especially on form-heavy pages.
- The modular JavaScript approach enables future expansion, such as connecting the booking workflow to live Firebase data.
- Future improvements could include actual image assets for better visual branding, additional accessibility attributes, and a client-facing business page with testimonials and company values.

---

## 5. Evidence and Live Link

- The website is implemented in the `flight-info` folder of the workspace.
- Local pages can be opened directly in a browser from the following files:
  - `index.html`
  - `flight-schedule.html`
  - `flight-status.html`
  - `booking.html`
  - `manage-booking.html`
  - `offers.html`
  - `user-dashboard.html`
  - `admin-dashboard.html`
  - `about.html`
  - `contact.html`


