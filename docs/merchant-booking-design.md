# Merchant Booking — Design Doc & Draft Schema

> Turning CaddieDaddy from a peer-to-peer social app into a two-sided marketplace
> where **real stores / driving ranges** publish their own booking times, prices,
> and rules, and golfers book them.

## Decisions locked in (this round)

| Question | Decision |
|---|---|
| Payment model (v1) | **Pay at venue** — no online payment yet; PSP added in a later phase |
| Merchant/admin UI | **`/merchant` route group inside the existing Next.js app** (same backend + auth) |
| Relation to social rounds | **Parallel for now** — separate "book a venue" flow; designed so a round can sit on real inventory later |
| This deliverable | Design doc + draft Prisma schema |

## Where it lives — no new platform required

- **One backend** (Hono + Prisma + Supabase on Railway) hosts the booking engine.
- **One Postgres** — venues, inventory, bookings all in the existing DB.
- **Two front doors** in the *same* Next.js app:
  - Consumer flow (exists): "browse venues → pick a real slot → book"
  - Merchant console (`/merchant`, gated by venue-operator role): "set times/prices, see today's bookings"
- Role-based auth reuses the pattern you already have in `CommunityMember` (admin/leader/member).

```
  Golfers  ───▶  Consumer UI  ─┐
                               ├─▶ ONE backend (Hono+Prisma+Supabase) ─▶ ONE Postgres
  Store staff ─▶ /merchant ────┘
```

## Who books what (answers "unaffiliated user picks a facility")

- The **booker is a normal `User`** — no company affiliation. `Booking.userId` = the golfer.
- They choose a **`Venue`**, see its **real `BookingSlot`s** (published times + prices), and book one.
- A booking can **optionally open a social `Round`** on top of it (`Booking.roundId`): book 4 real
  spots, keep 1, open 3 to the community. Same venue picker, one extra step.
- The **bookable entity is a `Round`/`Booking`**, not a generic `Post`. A `Post` stays social content
  and can *reference* a round via the existing `PostRoundLink`.
- "Reference" vs "book": today's `Round.courseId` is just a label. The new flow selects **real inventory**.
  The venue picker is a shared component either way.

## Core technique: rules → materialized slots

Real tee-sheet systems don't compute availability on the fly. The merchant configures **recurring
rules** (open hours, interval, peak/off-peak, weekday/weekend, price), and a **generator job
materializes them into concrete `BookingSlot` rows**. Those rows are what actually get booked.

This gives you: clean availability display, per-slot price/blocking overrides, and — critically —
**safe concurrency** (a single row to lock when two people grab the last 7:10).

⚠️ **The one thing to get right: no double-booking.** The booking runs in a transaction with a
conditional update so capacity can never go negative (sketch at the bottom).

## Draft Prisma schema

> Conventions match the existing schema: `uuid` ids, snake_case `@map`, money in **integer cents**,
> soft-delete via `deletedAt`. Reuses the existing `VenueType` enum (`course | driving_range`).

```prisma
// ── ENUMS ──────────────────────────────────────────────────────────────────
enum VenueStatus        { pending  approved  active  suspended }
enum VenueOperatorRole  { owner    manager   staff }
enum SlotStatus         { open     blocked }                         // blocked = merchant closed it
enum BookingStatus      { pending  confirmed cancelled completed no_show }
enum PaymentMode        { pay_at_venue  deposit  prepaid }           // per-venue policy
enum PaymentStatus      { none     deposit_paid  paid  refunded }

// ── VENUE (the bookable business) ────────────────────────────────────────────
model Venue {
  id           String      @id @default(uuid())
  name         String      @db.VarChar(100)
  type         VenueType   @default(course)              // reuse existing enum
  courseId     String?     @map("course_id")             // optional link to existing Course
  course       Course?     @relation(fields: [courseId], references: [id])
  status       VenueStatus @default(pending)
  locationText String?     @map("location_text") @db.VarChar(120)
  district     String?     @db.VarChar(40)
  city         String?     @db.VarChar(40)
  country      String      @default("TW") @db.Char(2)
  lat          Decimal?    @db.Decimal(9, 6)
  lng          Decimal?    @db.Decimal(9, 6)
  phone        String?     @db.VarChar(40)
  description  String?     @db.Text

  // Booking policy (rules the merchant sets)
  paymentMode             PaymentMode @default(pay_at_venue) @map("payment_mode")
  depositCents            Int?        @map("deposit_cents")
  minPartySize            Int         @default(1)  @map("min_party_size")
  maxPartySize            Int         @default(4)  @map("max_party_size")
  advanceBookingDays      Int         @default(30) @map("advance_booking_days")
  cancellationCutoffHours Int         @default(24) @map("cancellation_cutoff_hours")
  commissionBps           Int         @default(0)  @map("commission_bps") // your cut, basis points

  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")
  deletedAt    DateTime?   @map("deleted_at")

  operators         VenueOperator[]
  availabilityRules AvailabilityRule[]
  slots             BookingSlot[]
  bookings          Booking[]

  @@index([status])
  @@index([city, district])
  @@map("venues")
}

// ── WHO CAN MANAGE A VENUE (store staff login) ───────────────────────────────
model VenueOperator {
  id        String            @id @default(uuid())
  venueId   String            @map("venue_id")
  venue     Venue             @relation(fields: [venueId], references: [id], onDelete: Cascade)
  userId    String            @map("user_id")
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      VenueOperatorRole @default(staff)
  createdAt DateTime          @default(now()) @map("created_at")

  @@unique([venueId, userId])
  @@index([userId])
  @@map("venue_operators")
}

// ── RECURRING TEMPLATE → generator materializes BookingSlots from these ──────
model AvailabilityRule {
  id          String    @id @default(uuid())
  venueId     String    @map("venue_id")
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  label       String?   @db.VarChar(60)                 // "Weekday peak", "Weekend"
  weekdayMask Int       @map("weekday_mask")            // bitmask Sun..Sat, e.g. 0b0111110 = Mon–Fri
  startMinute Int       @map("start_minute")            // minutes from midnight (06:00 = 360)
  endMinute   Int       @map("end_minute")              // last slot start
  intervalMin Int       @default(10) @map("interval_min") // tee interval / bay slot length
  holes       Int?                                      // 9/18 for courses; null for ranges
  capacity    Int       @default(4)                     // players per tee, or bays available
  priceCents  Int       @map("price_cents")
  validFrom   DateTime? @map("valid_from") @db.Date
  validTo     DateTime? @map("valid_to") @db.Date
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([venueId, active])
  @@map("availability_rules")
}

// ── MATERIALIZED, BOOKABLE INVENTORY ─────────────────────────────────────────
model BookingSlot {
  id          String     @id @default(uuid())
  venueId     String     @map("venue_id")
  venue       Venue      @relation(fields: [venueId], references: [id], onDelete: Cascade)
  ruleId      String?    @map("rule_id")
  date        DateTime   @db.Date
  startTime   DateTime   @map("start_time") @db.Time()
  holes       Int?
  capacity    Int                                        // total spots
  bookedCount Int        @default(0) @map("booked_count") // guard: bookedCount + n <= capacity
  priceCents  Int        @map("price_cents")
  status      SlotStatus @default(open)
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  bookings    Booking[]

  @@unique([venueId, date, startTime, holes])            // idempotent regeneration
  @@index([venueId, date, status])
  @@map("booking_slots")
}

// ── THE RESERVATION ──────────────────────────────────────────────────────────
model Booking {
  id             String        @id @default(uuid())
  venueId        String        @map("venue_id")
  venue          Venue         @relation(fields: [venueId], references: [id])
  slotId         String        @map("slot_id")
  slot           BookingSlot   @relation(fields: [slotId], references: [id])
  userId         String        @map("user_id")           // the booker (unaffiliated golfer)
  user           User          @relation(fields: [userId], references: [id])
  partySize      Int           @default(1) @map("party_size")
  unitPriceCents Int           @map("unit_price_cents")  // price quoted at booking time
  totalCents     Int           @map("total_cents")
  status         BookingStatus @default(confirmed)
  paymentStatus  PaymentStatus @default(none) @map("payment_status") // v1: pay at venue
  roundId        String?       @map("round_id")          // optional social round on top
  round          Round?        @relation(fields: [roundId], references: [id])
  notes          String?       @db.Text
  cancelledAt    DateTime?     @map("cancelled_at")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  @@index([venueId, status])
  @@index([userId])
  @@index([slotId])
  @@map("bookings")
}
```

> Back-relations to add on existing models: `User { venueOperators, bookings }`,
> `Course { venues }`, `Round { booking? }` (the inverse of `Booking.roundId`).

## The atomic booking transaction (the part that must be correct)

```ts
// POST /venues/:venueId/slots/:slotId/book   (authMiddleware → userId)
await prisma.$transaction(async (tx) => {
  // Conditional update locks the row AND guards capacity in one shot.
  // If the slot is full or blocked, 0 rows update → reject. No oversell possible.
  const claimed = await tx.$executeRaw`
    UPDATE booking_slots
       SET booked_count = booked_count + ${partySize}
     WHERE id = ${slotId}
       AND status = 'open'
       AND booked_count + ${partySize} <= capacity
  `
  if (claimed === 0) throw new HTTPException(409, { message: 'Slot no longer available' })

  const slot = await tx.bookingSlot.findUniqueOrThrow({ where: { id: slotId } })
  return tx.booking.create({
    data: {
      venueId: slot.venueId,
      slotId,
      userId,
      partySize,
      unitPriceCents: slot.priceCents,
      totalCents: slot.priceCents * partySize,
      status: 'confirmed',
      paymentStatus: 'none', // pay at venue
    },
  })
})
```

Cancellation reverses it (`booked_count = booked_count - partySize`, set `status='cancelled'`),
gated by the venue's `cancellationCutoffHours`.

## API surface to add

Consumer (`authMiddleware`):
- `GET  /venues?city=&type=&q=` — browse venues
- `GET  /venues/:id` — detail + policy
- `GET  /venues/:id/slots?date=` — real availability for a day
- `POST /venues/:id/slots/:slotId/book` — the transaction above
- `GET  /me/bookings` / `POST /bookings/:id/cancel`

Merchant (`venueOperatorMiddleware` — checks `VenueOperator` row):
- `POST /merchant/venues` (+ approval flow) / `PATCH /merchant/venues/:id`
- `GET/POST/PATCH /merchant/venues/:id/availability-rules`
- `POST /merchant/venues/:id/slots/generate?from=&to=` — run the materializer
- `PATCH /merchant/venues/:id/slots/:slotId` — block / re-price one slot
- `GET  /merchant/venues/:id/bookings?date=` — today's sheet
- `PATCH /merchant/bookings/:id` — mark completed / no_show

## Phased rollout

| Phase | What | New infra? |
|---|---|---|
| **1** | Models above + slot generator + atomic booking txn + consumer "book a venue" flow | none |
| **2** | `/merchant` console in the same app (stopgap: Supabase Studio for first 1–2 pilot venues) | none |
| **3** | Payments (TW PSP: TapPay/ECPay/NewebPay/Line Pay, or Stripe) + refunds + commission ledger | PSP acct |
| **4** | Only if it outgrows the app: split `/merchant` into its own Next.js app, same backend | monorepo |

**North star:** social rounds backed by real venue inventory — `Booking.roundId` is the seam that
makes it a one-step add later, without rebuilding anything.
