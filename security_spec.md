# Security Specification for CSWDO Mabalacat City Office Supplies System

## Data Invariants
1. A SubBudget cannot exist without a parent Budget.
2. An InventoryMovement must correctly reflect the quantity change in the corresponding Item.
3. Only Admins and System Admins can manage Budgets and Users.
4. Users can create Requests and see their own requests (or all if specified, but usually users see their own and admins see all).
5. Only Admins/System Admins can Approve or Release requests.
6. Only Admins/System Admins can record Deliveries.

## The Dirty Dozen Payloads (Potential Attacks)
1. **Identity Spoofing**: A User trying to update their own `role` to `System Admin`.
2. **Budget Hijacking**: A User trying to delete a `Budget` document they didn't create.
3. **Ghost Items**: Creating an `Item` with an extremely large `qty` without a corresponding `Delivery`.
4. **Relational Orphan**: Creating a `SubBudget` with a `budgetId` that doesn't exist.
5. **Timestamp Fraud**: Setting `createdAt` to a future date or a past date manually.
6. **Negative Inventory**: Delivery with a negative `qty`.
7. **Bypassing Approval**: A User setting their `Request` status directly to `Released`.
8. **Shadow Fields**: Adding a `verified: true` field to a `User` profile.
9. **Mass Data Scraping**: Trying to list all `users` as a regular User.
10. **ID Poisoning**: Using a 1MB string as a `budgetId`.
11. **PII Leak**: Unauthorized access to another user's profile details.
12. **Double Release**: Releasing the same `Request` twice to reduce inventory double.

## Test Strategy (Phase 0)
I will write `firestore.rules` to deny all these by default and then incrementally allow authorized paths.
All write operations will be protected by `isValid[Entity]` helpers.
Update actions will be restricted by `affectedKeys().hasOnly()`.
