# Course Scheduling Algorithm Documentation

## Overview

The Smart Campus Platform uses a **Constraint Satisfaction Problem (CSP)** approach with **Backtracking** to automatically generate course schedules. This document explains the algorithm, its constraints, heuristics, and implementation details.

---

## Problem Definition

### Variables
Each **course section** that needs scheduling is a variable.

### Domain
For each section, the domain consists of all possible `(Classroom, Day, TimeSlot)` tuples:

```
Domain = { (C1, Monday, 08:00), (C1, Monday, 09:00), ..., (Cn, Friday, 17:00) }
```

### Constraints
The algorithm must satisfy multiple constraints to produce a valid schedule.

---

## Constraints

### Hard Constraints (Must Satisfy)

| Constraint | Description | Check |
|------------|-------------|-------|
| **Instructor Conflict** | Same instructor cannot teach two sections at the same time | `instructorSchedule[id][day][slot]` |
| **Classroom Conflict** | Same room cannot host two sections at the same time | `classroomSchedule[id][day][slot]` |
| **Capacity** | Classroom capacity must be ≥ section enrollment | `classroom.capacity >= section.capacity` |
| **Student Conflict** | Students enrolled in multiple sections cannot have time overlap | `studentSchedule[id][day][slot]` |

### Soft Constraints (Optimization Goals)

| Constraint | Description | Implementation |
|------------|-------------|----------------|
| **Minimize Student Gaps** | Reduce idle time between classes | LCV heuristic scoring |
| **Instructor Preferences** | Respect preferred teaching times | Domain ordering |

---

## Algorithm: Backtracking with Heuristics

### Core Algorithm

```
function BACKTRACK(assignment):
    if assignment is complete:
        return SUCCESS
    
    // MRV: Select unassigned variable with smallest domain
    section = SELECT_UNASSIGNED_VARIABLE()
    
    if section is null:
        return FAILURE
    
    // LCV: Order domain values by least constraining
    domain = GET_ORDERED_DOMAIN(section)
    
    for each value in domain:
        if IS_CONSISTENT(section, value):
            ASSIGN(section, value)
            
            if BACKTRACK(assignment) == SUCCESS:
                return SUCCESS
            
            UNASSIGN(section, value)  // Backtrack
    
    return FAILURE
```

### Pseudocode: Full Implementation

```
function GENERATE_SCHEDULE(semester, year):
    sections = FETCH_SECTIONS(semester, year)
    classrooms = FETCH_CLASSROOMS()
    enrollments = FETCH_ENROLLMENT_DATA()
    
    // Initialize tracking structures
    classroomSchedule = {}  // classroomId -> day -> slot -> sectionId
    instructorSchedule = {} // instructorId -> day -> slot -> sectionId
    studentSchedule = {}    // studentId -> day -> slot -> sectionId
    
    assignments = []
    unassigned = sections.copy()
    
    // Sort sections by capacity (larger first - heuristic)
    SORT(unassigned, BY_CAPACITY_DESC)
    
    success = BACKTRACK()
    
    if success:
        SAVE_TO_DATABASE(assignments)
    
    return { success, assignments, unassigned }


function SELECT_UNASSIGNED_VARIABLE():
    // MRV Heuristic: Minimum Remaining Values
    minDomainSize = INFINITY
    selected = null
    
    for section in unassigned:
        domainSize = COUNT_VALID_ASSIGNMENTS(section)
        
        if domainSize == 0:
            continue  // Skip unsolvable
        
        if domainSize < minDomainSize:
            minDomainSize = domainSize
            selected = section
    
    return selected


function GET_ORDERED_DOMAIN(section):
    domain = []
    
    for classroom in classrooms:
        if classroom.capacity < section.capacity:
            continue  // Capacity constraint
        
        for day in [Monday, Tuesday, ..., Friday]:
            for slot in [08:00, 09:00, ..., 17:00]:
                domain.add({ classroom, day, slot })
    
    // LCV Heuristic: Sort by constraint score (ascending)
    SORT(domain, BY_CONSTRAINT_SCORE_ASC)
    
    return domain


function IS_CONSISTENT(section, value):
    { classroom, day, slot } = value
    
    // Check classroom availability
    if classroomSchedule[classroom.id][day][slot] exists:
        return FALSE
    
    // Check instructor availability
    if section.instructor_id:
        if instructorSchedule[instructor_id][day][slot] exists:
            return FALSE
    
    // Check student conflicts
    for student in ENROLLED_STUDENTS(section):
        if studentSchedule[student][day][slot] exists:
            return FALSE
    
    return TRUE


function ASSIGN(section, value):
    { classroom, day, slot } = value
    
    // Add to assignments
    assignments.add({ section, classroom, day, slot })
    unassigned.remove(section)
    
    // Update tracking structures
    classroomSchedule[classroom.id][day][slot] = section.id
    instructorSchedule[section.instructor_id][day][slot] = section.id
    
    for student in ENROLLED_STUDENTS(section):
        studentSchedule[student][day][slot] = section.id


function UNASSIGN(section, value):
    { classroom, day, slot } = value
    
    // Remove from assignments
    assignments.remove(section)
    unassigned.add(section)
    
    // Clear tracking structures
    delete classroomSchedule[classroom.id][day][slot]
    delete instructorSchedule[section.instructor_id][day][slot]
    
    for student in ENROLLED_STUDENTS(section):
        delete studentSchedule[student][day][slot]
```

---

## Heuristics

### MRV (Minimum Remaining Values)

**Purpose:** Choose the most constrained variable first.

**Rationale:** Variables with fewer options are more likely to cause failures. By addressing them early, we fail fast and reduce unnecessary exploration.

```javascript
// Example: Section A has 5 possible slots, Section B has 2
// Choose Section B first (more constrained)
```

### LCV (Least Constraining Value)

**Purpose:** Choose values that rule out the fewest options for other variables.

**Rationale:** Maximizes flexibility for remaining assignments.

```javascript
function getConstraintScore(section, value):
    score = 0
    
    for otherSection in unassigned:
        if wouldConflict(otherSection, value):
            score++
    
    return score  // Lower is better
```

---

## Time Slot Configuration

```javascript
const TIME_SLOTS = [
    { id: 1,  start: '08:00', end: '08:50' },
    { id: 2,  start: '09:00', end: '09:50' },
    { id: 3,  start: '10:00', end: '10:50' },
    { id: 4,  start: '11:00', end: '11:50' },
    { id: 5,  start: '12:00', end: '12:50' },  // Lunch
    { id: 6,  start: '13:00', end: '13:50' },
    { id: 7,  start: '14:00', end: '14:50' },
    { id: 8,  start: '15:00', end: '15:50' },
    { id: 9,  start: '16:00', end: '16:50' },
    { id: 10, start: '17:00', end: '17:50' }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
```

**Total slots per classroom:** 10 slots × 5 days = **50 slots/week**

---

## Complexity Analysis

| Metric | Value |
|--------|-------|
| **Variables (V)** | Number of sections to schedule |
| **Domain Size (D)** | Classrooms × Days × TimeSlots |
| **Worst Case** | O(D^V) - exponential |
| **With Heuristics** | Significantly reduced in practice |

### Performance Optimizations

1. **Early Pruning:** Skip sections with empty domains immediately
2. **Constraint Propagation:** Could be added (Arc Consistency)
3. **Ordering:** Schedule larger sections first (more constrained)
4. **Caching:** Domain sizes cached and updated incrementally

---

## Example Execution

### Input
```
Sections: [CS101-A, CS101-B, EE201-A]
Classrooms: [Room101 (cap:30), Room102 (cap:50)]
```

### Trace
```
1. Select CS101-A (MRV: 5 valid slots)
   → Assign: Room102, Monday, 09:00 ✓

2. Select CS101-B (MRV: 4 valid slots) 
   → Try: Room102, Monday, 09:00 ✗ (classroom conflict)
   → Try: Room101, Monday, 09:00 ✓

3. Select EE201-A (MRV: 3 valid slots)
   → Assign: Room102, Monday, 10:00 ✓

Result: SUCCESS (0 backtracks)
```

---

## Database Schema

### Schedule Table

```sql
CREATE TABLE schedules (
    id UUID PRIMARY KEY,
    section_id UUID REFERENCES course_sections(id),
    classroom_id UUID REFERENCES classrooms(id),
    day_of_week VARCHAR(10),  -- Monday, Tuesday, etc.
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(section_id, day_of_week, start_time)
);

-- Conflict detection index
CREATE INDEX idx_schedule_conflict ON schedules 
    (classroom_id, day_of_week, start_time, end_time);
```

---

## API Usage

### Generate Schedule

```http
POST /api/scheduling/generate
{
    "semester": "Fall",
    "year": 2024,
    "preview_only": false
}
```

### Response

```json
{
    "success": true,
    "statistics": {
        "total_sections": 150,
        "scheduled_sections": 147,
        "unscheduled_sections": 3,
        "backtrack_count": 42,
        "duration_ms": 1850
    }
}
```

---

## Future Improvements

1. **Arc Consistency (AC-3):** Propagate constraints to reduce domains
2. **Multi-objective Optimization:** Balance multiple soft constraints
3. **Instructor Preferences:** Add preferred time slots as soft constraints
4. **Room Features:** Match section requirements to room capabilities
5. **Genetic Algorithm Hybrid:** Use GA for initial solution, CSP for refinement
