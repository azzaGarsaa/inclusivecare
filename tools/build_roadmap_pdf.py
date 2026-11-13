"""Builds docs/InclusiveCare-Roadmap.pdf. Run: python3 tools/build_roadmap_pdf.py"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parent.parent / "docs" / "InclusiveCare-Roadmap.pdf"

INK = colors.HexColor("#1f2933")
MUTED = colors.HexColor("#52606d")
BRAND = colors.HexColor("#0b6e6e")
BAND = colors.HexColor("#e6f2f1")
RULE = colors.HexColor("#c5d0d6")

base = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=base["Heading1"], fontSize=17, leading=22, textColor=BRAND, spaceBefore=6, spaceAfter=8)
H2 = ParagraphStyle("H2", parent=base["Heading2"], fontSize=12.5, leading=16, textColor=INK, spaceBefore=10, spaceAfter=5)
BODY = ParagraphStyle("Body", parent=base["BodyText"], fontSize=10, leading=14.5, textColor=INK, alignment=TA_LEFT, spaceAfter=6)
CELL = ParagraphStyle("Cell", parent=BODY, fontSize=9, leading=12.5, spaceAfter=0)
HEAD = ParagraphStyle("Head", parent=CELL, fontName="Helvetica-Bold", textColor=colors.white)
BULLET = ParagraphStyle("Bullet", parent=BODY, leftIndent=12, bulletIndent=2, spaceAfter=3)
TITLE = ParagraphStyle("Title", parent=base["Title"], fontSize=28, leading=34, textColor=BRAND, alignment=TA_LEFT)
SUB = ParagraphStyle("Sub", parent=BODY, fontSize=13, leading=18, textColor=MUTED)


def table(header, rows, widths):
    data = [[Paragraph(h, HEAD) for h in header]]
    data += [[Paragraph(c, CELL) for c in row] for row in rows]
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BAND]),
                ("GRID", (0, 0), (-1, -1), 0.4, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def bullets(items):
    return [Paragraph(i, BULLET, bulletText="•") for i in items]


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 12 * mm, "InclusiveCare – Architecture and roadmap")
    canvas.drawRightString(190 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


story = []

story += [
    Spacer(1, 60 * mm),
    Paragraph("InclusiveCare", TITLE),
    Paragraph("Architecture summary and delivery roadmap", SUB),
    Spacer(1, 8 * mm),
    Paragraph(
        "An all-in-one digital platform for people with disabilities, their families, "
        "caregivers, healthcare professionals and service providers.",
        BODY,
    ),
    Spacer(1, 4 * mm),
    Paragraph("Stack: NestJS, PostgreSQL, Prisma, Redis, Angular, Angular Material", BODY),
    Paragraph("Status: approved on 13 November 2026. Phase 1 in progress.", BODY),
    PageBreak(),
]

story += [
    Paragraph("1. Product in brief", H1),
    Paragraph(
        "InclusiveCare is a two-sided ecosystem. On the demand side are people with disabilities "
        "and the family members who act for them. On the supply side are vendors, rental providers, "
        "healthcare professionals and service providers. Trust is the product: verified providers, "
        "sourced information, protected personal data, and an interface that works with a screen "
        "reader, a keyboard, or low digital literacy.",
        BODY,
    ),
    Paragraph("Three ideas shape the design:", BODY),
    *bullets(
        [
            "<b>Acting on behalf of someone</b> is a first-class concept: guardians order, rent and book for another person.",
            "<b>Every supply-side actor is an organisation</b> holding one or more capabilities that an administrator verifies.",
            "<b>Later phases depend on data captured in Phase 1.</b> AI assessment and price comparison need structured product attributes and price history, which cannot be backfilled.",
        ]
    ),
    Paragraph("2. Key technical decisions", H1),
    table(
        ["Decision", "Choice", "Why"],
        [
            ["Repository", "npm workspaces: apps/api and apps/web", "Two apps do not justify heavier monorepo tooling"],
            ["ORM", "Prisma, one schema file per module", "Typed query results and reliable migrations; raw SQL only for geo, full-text and exclusion constraints"],
            ["API contract", "Angular client generated from OpenAPI", "Frontend and backend stay consistent without hand-written duplicates"],
            ["Authentication", "15-minute access JWT held in memory; rotating refresh token in an httpOnly cookie, stored hashed with reuse detection; Argon2id", "Tokens stay out of localStorage; a stolen refresh token is detectable"],
            ["Authorisation", "Roles in the database, permissions as code constants, per-module policy services", "A database-driven permission editor would be overengineering"],
            ["Module communication", "One facade service per module, in-process events, BullMQ jobs", "Modules stay extractable without microservice cost"],
            ["Search", "PostgreSQL full-text, pg_trgm and PostGIS behind a SearchService", "No extra infrastructure; replaceable later"],
            ["Files", "S3-compatible storage, presigned uploads, images re-encoded", "Strips location metadata and neutralises malicious payloads"],
            ["UI library", "Angular Material and CDK", "Strongest accessibility and right-to-left record for Angular"],
            ["Languages", "French, English, Arabic with runtime switching (Transloco)", "Angular's built-in i18n cannot switch at runtime"],
            ["Payments", "Offline in the MVP (on delivery or bank transfer) behind a PaymentProvider interface", "The provider depends on the launch country"],
            ["Money", "Integer minor units plus currency code", "No floating-point errors; currency stays configurable"],
        ],
        [32, 62, 76],
    ),
    PageBreak(),
]

story += [
    Paragraph("3. Roles and permissions", H1),
    Paragraph("The eight user profiles map onto three mechanisms rather than eight roles:", BODY),
    *bullets(
        [
            "<b>Platform roles:</b> USER, MODERATOR, ADMIN.",
            "<b>Organisation membership:</b> OWNER or STAFF of an organisation that holds capabilities (VENDOR, RENTAL, HEALTHCARE, SERVICE), each verified separately. A solo caregiver or doctor is an organisation of one.",
            "<b>Care relationships:</b> a user linked to a beneficiary profile with scopes (VIEW, ORDER, BOOK, MANAGE). The beneficiary may have no account, for example a child.",
        ]
    ),
    Spacer(1, 3 * mm),
    table(
        ["Area", "Visitor", "User / guardian", "Org staff", "Org owner", "Moderator", "Admin"],
        [
            ["Browse catalogue and directory", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes"],
            ["Order, rent, request appointment", "No", "Self and scoped beneficiaries", "No", "No", "No", "No"],
            ["Write or report reviews", "No", "Yes", "Reply only", "Reply only", "Yes", "Yes"],
            ["Manage listings, orders, bookings", "No", "No", "Own organisation", "Own organisation", "No", "All"],
            ["Manage organisation and members", "No", "No", "No", "Own organisation", "No", "All"],
            ["Moderate reviews and photos", "No", "No", "No", "No", "Yes", "Yes"],
            ["Verify organisations, manage users", "No", "No", "No", "No", "No", "Yes"],
            ["See a beneficiary's needs data", "No", "Self and scoped", "Never", "Never", "Never", "Audited only"],
        ],
        [42, 15, 29, 21, 22, 23, 18],
    ),
    Paragraph("4. Backend modules", H1),
    table(
        ["Phase", "Module", "Covers"],
        [
            ["1", "identity", "Authentication, users, roles, sessions, consents"],
            ["1", "profiles", "Beneficiary profiles, care relationships, addresses, accessibility preferences"],
            ["1", "organizations", "Organisations, members, capabilities, verification, locations and accessibility facilities"],
            ["1", "catalog", "Categories, attribute definitions, products, stock, wishlist, price history"],
            ["1", "orders", "Cart, checkout (one order per vendor), status tracking"],
            ["1", "rentals", "Rental items, physical units, bookings, deposits"],
            ["1", "healthcare", "Professionals, specialties, directory search"],
            ["1", "bookings", "Appointment requests; service bookings and availability in Phase 2"],
            ["1", "reviews", "Structured accessibility reviews, reports, rating summaries"],
            ["1", "notifications", "In-app and email; channel interface for SMS and push"],
            ["1", "media, audit, admin", "Uploads, append-only audit log, administration"],
            ["2", "services, community, resources, equipment, emergency, search", "Service booking, forum, library, owned equipment and maintenance, emergency contacts, unified search"],
            ["3", "assessment, comparison, insurance, analytics", "AI-assisted equipment assessment, price comparison, insurance checker, analytics"],
        ],
        [14, 50, 106],
    ),
    PageBreak(),
]

story += [
    Paragraph("5. Phase 1 roadmap (MVP)", H1),
    Paragraph(
        "Milestones are delivered in order. Each one ends in a usable, tested state, and the next "
        "does not start until the current one works end to end.",
        BODY,
    ),
    table(
        ["Milestone", "Content", "Done when"],
        [
            ["M0 Foundations", "Repository, Docker Compose, configuration, logging, error format, accessible app shell, three languages with right-to-left, accessibility settings panel", "The empty app runs locally in three languages and passes automated accessibility checks"],
            ["M1 Identity and profiles", "Registration, email verification, login, refresh rotation, password reset, roles, user management, beneficiary profiles, guardianship, consents, transactional email", "Authentication and authorisation tests pass"],
            ["M2 Organisations and admin", "Organisations, capabilities, document upload, verification queue, audit log, admin shell", "An administrator can verify a vendor end to end"],
            ["M3 Catalogue", "Categories, attribute definitions, vendor product management, search, filters, wishlist", "A user can find a product with needs-based filters"],
            ["M4 Orders and notifications", "Cart, multi-vendor checkout, order tracking, vendor order handling, in-app and email notifications", "The guardian purchase journey passes as an end-to-end test"],
            ["M5 Healthcare directory", "Professionals, institutions, geographic search, accessibility facilities, appointment requests", "The provider discovery journey passes"],
            ["M6 Rentals", "Rental catalogue, availability, booking lifecycle, reminders", "The rental journey passes and double-booking is impossible"],
            ["M7 Reviews", "Structured criteria, verified badges, photos, reports, moderation", "The review journey passes"],
            ["M8 Dashboards and hardening", "Role dashboards, data export and deletion, security pass, full accessibility audit, deployment documentation", "Ready for testing with real users"],
        ],
        [34, 76, 60],
    ),
    Paragraph("Main user journeys covered by the MVP", H2),
    *bullets(
        [
            "<b>Guardian buys equipment:</b> registers, creates a profile for their child, filters wheelchairs by age group and weight capacity, orders from two vendors, tracks both orders.",
            "<b>Short-term rental:</b> picks a wheelchair, selects dates, sends a request; the provider confirms, reminders go out, the user reviews afterwards.",
            "<b>Finding a provider:</b> searches nearby physiotherapists, filters by step-free access, sends an appointment request; the professional confirms or proposes another time.",
            "<b>Vendor onboarding:</b> registers an organisation, uploads documents, is verified by an administrator, lists products with structured attributes, handles orders.",
            "<b>Accessibility review:</b> after a completed order or visit, rates against structured criteria; the review is published with a verified badge after moderation.",
        ]
    ),
    PageBreak(),
]

story += [
    Paragraph("6. Phase 2 and Phase 3", H1),
    table(
        ["Phase", "Scope", "Builds on"],
        [
            ["2 Services and community", "Service booking with availability calendars; community forum with real-time notifications; resource library; owned equipment and maintenance tracker; emergency contacts; unified search", "Bookings, catalogue and notifications from Phase 1"],
            ["3 Intelligence and advanced features", "AI-assisted equipment assessment (rules-based matching, language model only for wording explanations); price comparison; insurance coverage checker by country; analytics; external integrations", "Structured product attributes and price history recorded since Phase 1"],
        ],
        [40, 86, 44],
    ),
    Paragraph("7. Accessibility commitments", H1),
    *bullets(
        [
            "Target: WCAG 2.2 level AA, treated as a release criterion for every milestone.",
            "App shell first: skip link, landmarks, focus moved and page title announced on every route change, live regions for asynchronous feedback, logical CSS properties for right-to-left.",
            "Settings panel: font size, high contrast, reduced motion and simplified layout, remembered per device and synced to the account.",
            "WCAG 2.2 specifics: no drag-only interactions, focus never hidden, password managers and paste allowed, no puzzle CAPTCHA, no re-entering known data, session expiry warnings.",
            "Vendors must supply alternative text for product images; every map has an equivalent list.",
            "Automated checks (axe-core) on every build, plus a manual keyboard pass and a screen reader pass (NVDA, VoiceOver, TalkBack) per milestone, including in Arabic.",
        ]
    ),
    Paragraph("8. Risks and mitigations", H1),
    table(
        ["Risk", "Mitigation"],
        [
            ["Disability and health data are legally sensitive", "Collect none in the MVP; consent records, audit log, export and deletion built early"],
            ["Payments depend on the launch country", "PaymentProvider interface; MVP ships with offline payment"],
            ["Arabic search quality (no Arabic stemmer in PostgreSQL)", "Simple configuration plus trigram matching and normalisation; revisit with a search engine if needed"],
            ["Empty marketplace at launch", "Bulk import and assisted vendor onboarding; realistic seed data for demos"],
            ["Review fraud and harmful photos", "Verified badges, pre-moderation of photos, reporting, rate limits"],
            ["Large MVP scope", "Strict milestone order; each milestone ends usable and tested"],
            ["Unsourced insurance or AI advice", "Phase 3 only; sourced and dated data, explainable matching, permanent disclaimers"],
            ["Privilege errors in guardian flows", "A single policy service for acting on behalf of a beneficiary, with dedicated tests"],
        ],
        [70, 100],
    ),
    Paragraph("9. Decisions still open", H1),
    *bullets(
        [
            "<b>Launch country:</b> drives payment providers, legal obligations, emergency numbers and insurance data. Until named, the build stays country-agnostic.",
            "<b>Online payment:</b> deferred to Phase 2 unless requested earlier.",
            "<b>Server-side rendering:</b> deferred; reconsider if search engine visibility matters at launch.",
            "<b>Hosting region and team size:</b> do not block Phase 1.",
        ]
    ),
]

doc = SimpleDocTemplate(
    str(OUT),
    pagesize=A4,
    leftMargin=20 * mm,
    rightMargin=20 * mm,
    topMargin=18 * mm,
    bottomMargin=20 * mm,
    title="InclusiveCare - Architecture and roadmap",
    author="InclusiveCare",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
