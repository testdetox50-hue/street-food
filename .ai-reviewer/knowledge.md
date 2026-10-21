# street-food reviewer notes

## Architecture
This is a Vite-powered React 19 single-page application written in TypeScript and using `react-router-dom`. Public university pages share `SiteLayout` with `Header` and `Footer`, while `/dashboard/*` uses `DashboardLayout` and dashboard-specific pages under `src/pages/dashboard/`. Business logic is isolated in `src/lib/processOrder.ts` with Vitest coverage in the adjacent test file.

## Conventions
- Use functional React components with default exports, generally one component per file: `src/pages/About.tsx`, `src/components/Header.tsx`.
- Keep route declarations centralized in `src/App.tsx`; public routes use leading paths such as `"/about"`, while dashboard child routes are relative (`"courses"`, `"grades"`).
- Use React Router navigation components rather than raw anchors for internal navigation: `Header.tsx`, `Footer.tsx`, and `DashboardLayout.tsx` use `NavLink`/`Link`.
- Shared styling is primarily expressed through semantic CSS class names such as `container`, `section`, `card`, `dash-card`, and `form-grid`; inline styles are also used for small, local layout or typography adjustments.
- Repeated static UI content is represented as arrays and rendered with `.map()`, with stable domain keys: `Header.tsx` (`links`), `About.tsx` (`values` and facilities), and `Courses.tsx` (`courses` keyed by `code`).
- Domain constants in `src/lib/processOrder.ts` are uppercase (`TAX_RATES`, `COUPONS`, `DEFAULT_TAX_RATE`), and input validation is performed through type-guard helpers before calculations.
- Tests use Vitest and table-like factory helpers for defaults and overrides: `src/lib/processOrder.test.ts` defines `user()` and `item()` using `Partial<T>`, then tests behavior with focused `describe`/`it` cases.
- Monetary outputs are rounded to two decimal places in `processOrder`; tests use exact assertions for rounded values and `toBeCloseTo` for tax calculations.

## Intentional non-standard choices
- The repository/package identity is inconsistent: the repository and README say `street-food`, while `package.json` is named `desh-bhagt` and the UI is a university portal. Treat the university branding and static sample data as intentional unless a change explicitly addresses product identity.
- Forms in `Admissions.tsx` and `Contact.tsx` intentionally simulate submission locally with `useState`; they prevent default submission and display confirmation content without an API call.
- The dashboard uses hard-coded student and course data (`DashboardLayout.tsx`, `Courses.tsx`) rather than authentication or a backend.

## Watch out for
- Preserve exact route semantics, especially `end` on the home link and dashboard overview link; removing it causes parent links to remain active on nested pages (`Header.tsx`, `DashboardLayout.tsx`).
- Do not replace internal `Link`/`NavLink` navigation with ordinary anchors without accounting for SPA navigation and active-state behavior.
- Validate numeric domain inputs carefully in `processOrder.ts`: current checks reject negative values but allow non-finite numbers and fractional quantities. Changes should preserve the tested subtotal, discount, tax, shipping, and rounding behavior.
- Coupon discounts are applied after a premium discount, tax is calculated on the resulting subtotal, and subtotal is clamped at zero; changing operation order alters the established contract in `processOrder.test.ts`.
- Form controls rely on native HTML validation (`required`, `type="email"`) and labels’ `htmlFor`/`id` pairing; preserve these accessibility and behavior relationships when editing forms.