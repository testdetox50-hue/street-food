# street-food reviewer notes

## Architecture

This is a Vite + TypeScript React 19 single-page application using `react-router-dom` and `BrowserRouter`. Public university pages share `SiteLayout` with `Header`/`Footer`, while `/dashboard/*` uses `DashboardLayout` and dashboard-specific pages. Business logic is isolated in `src/lib/processOrder.ts` with Vitest coverage in the adjacent `processOrder.test.ts`.

## Conventions

- Use functional React components with default exports; page and component files are PascalCase, such as `src/pages/About.tsx` and `src/components/Header.tsx`.
- Keep route definitions centralized in `src/App.tsx`; public routes use absolute paths, while dashboard child routes are relative (`"courses"`, `"grades"`).
- Use `NavLink` for navigation requiring active-state styling. `Header.tsx` uses an `active` class, and `DashboardLayout.tsx` uses `dash-link active`.
- Shared layout components own site-wide structure: public chrome is in `SiteLayout` (`src/App.tsx`), and dashboard chrome is in `src/components/DashboardLayout.tsx`.
- Static repeated UI content is represented as local arrays and rendered with `.map()`, with stable keys such as `v.title`, `item`, `c.code`, or `link.to` (`src/pages/About.tsx`, `src/pages/dashboard/Courses.tsx`, `src/components/Header.tsx`).
- Styling primarily uses semantic CSS class names from `src/index.css`, with occasional inline styles for local sizing/layout or one-off visual adjustments, e.g. `src/pages/About.tsx` and `src/components/Footer.tsx`.
- Form pages use local state for submission transitions rather than backend calls. `src/pages/Admissions.tsx` and `src/pages/Contact.tsx` prevent default submission and replace the form with a confirmation view.
- `src/lib/processOrder.ts` validates external/unsafe runtime input through type guards (`isValidUser`, `isValidItem`) even though the exported function is typed; invalid inputs return `{ success: false, message }`.
- Constants governing order behavior are module-local uppercase maps/constants (`TAX_RATES`, `COUPONS`, `DEFAULT_TAX_RATE`), and monetary outputs are rounded to two decimals.

## Intentional non-standard choices

- The repository/package naming is inconsistent with the UI: the repository is `street-food`, `package.json` names the package `desh-bhagt`, and the application presents Desh Bhagt University. Review changes against the existing university portal behavior rather than assuming the repository name describes the product.
- Content is currently static/demo content. Dashboard records, contact details, and admission/contact submissions are hardcoded or local-only in the sampled files; do not flag the lack of persistence unless a change claims to add real backend behavior.
- `processOrder` deliberately accepts runtime-invalid values via casts in tests (`src/lib/processOrder.test.ts`) to verify defensive validation.

## Watch out for

- New public or dashboard pages must be wired into the appropriate route tree in `src/App.tsx`; adding a component alone does not make it reachable.
- Preserve exact dashboard route semantics, especially the index route and `end: true` on the `/dashboard` navigation link (`src/components/DashboardLayout.tsx`).
- Avoid introducing duplicate order calculations or changing coupon/tax/shipping order in `src/lib/processOrder.ts`; discounts affect the taxable subtotal, and shipping is added afterward.
- Flag changes that allow negative prices, zero quantities, unknown coupons, or invalid users to proceed without updating the validation contract and tests.
- Form changes should retain native `required` validation and prevent accidental page navigation on submit (`src/pages/Admissions.tsx`, `src/pages/Contact.tsx`).