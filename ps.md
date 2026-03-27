# Problem Statement (PS)

## LeetCode Daily Challenge Live Dashboard

### Objective

Build a live dashboard that tracks whether each participant solves at
least **3 LeetCode problems daily** using only their LeetCode usernames.

### Problem

Friend groups doing daily DSA challenges lack a simple automated way to
track consistency. Manual reporting causes friction and cheating risk.
The system should automatically track progress and display results.

### Inputs

-   List of LeetCode usernames
-   Add/remove username operations

Example:

    ["userA","userB","userC"]

### Functional Requirements

#### User Management

-   Add participant
-   Remove participant
-   Store usernames

#### Data Collection

-   Fetch recent accepted submissions
-   Filter today's submissions
-   Count solved problems

#### Dashboard

Display: - Username - Problems solved today - Status
(Completed/Pending) - Streak

#### Status Logic

    Solved ≥ 3 → Completed
    Solved < 3 → Pending

### Non Functional Requirements

-   Support 5--50 users
-   Mobile friendly
-   Handle API failures
-   Fast refresh (1--5 min)

### Constraints

-   Only public LeetCode data
-   No login required
-   Username only input

### Success Criteria

-   Automatic tracking
-   Live updates
-   Easy user management
-   Zero manual reporting
