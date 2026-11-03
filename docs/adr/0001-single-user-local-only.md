# Single-user, local-only app with no sync

Two people use the app, but they eat together rarely (at most dinner), so each person gets a separate install with separate data: Dishes, Products, plans and Shopping List. All data lives on the device (Dexie + OPFS), with no accounts, backend or sync. Shopping Lists are merged by hand, helped by the "Udostępnij listę" plain-text share. We chose this over profiles on one device and over sync (Dexie Cloud or our own backend) because a shared library and plan would not pay off for so few shared meals, and a backend adds accounts, hosting and cost.

## Consequences

- Data can be lost when the device storage is cleared. To reduce that risk we call `navigator.storage.persist()` and provide JSON export/import.
- Ids are UUIDs so sync can be added later without migrating data.
