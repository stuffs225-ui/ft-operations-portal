# Phase 10 Test Plan — Reports, Control Tower, SLA, Data Quality, Health Scores

Last updated: 2026-05-31

---

## 1. Routes & Navigation

1. Navigate to /reports → Reports Hub loads with grouped cards
2. Navigate to /control-tower → Control Tower loads with 3-stat bar
3. Navigate to /reports/executive → Executive Dashboard loads
4. Navigate to /reports/projects → Project Reports page loads
5. Navigate to /reports/sales → Sales Reports page loads
6. Navigate to /reports/procurement → Procurement Reports page loads
7. Navigate to /reports/factory → Factory Reports page loads
8. Navigate to /reports/store → Store Reports page loads
9. Navigate to /reports/qc → QC Reports page loads
10. Navigate to /reports/afs → Dubai / AFS Reports page loads
11. Navigate to /reports/suppliers → Supplier Reports page loads
12. Navigate to /reports/sla → SLA & Escalations page loads
13. Navigate to /reports/data-quality → Data Quality Dashboard loads
14. Navigate to /reports/health-scores → Health Scores page loads
15. Navigate to /reports/issues → Issues & Risks page loads
16. Navigate to /reports/capa → CAPA Records page loads
17. Sidebar shows "Control Tower" and "Reports" nav items

---

## 2. Reports Hub

18. Reports Hub shows all 6 groups: Executive, Projects & Sales, Operations, Suppliers, Operational Excellence, Reference
19. Control Tower card shows "Live" badge
20. SLA card shows "SLA" badge
21. Sign in as afs_user → Supplier Reports card not visible (restricted role)
22. Sign in as admin → all cards visible
23. Click any card → navigates to correct route

---

## 3. Control Tower

24. Top bar shows "X Open SLA Breaches" (red if > 0)
25. Top bar shows "X Critical Issues" count
26. Top bar shows "X Data Quality Gaps" (amber if > 0)
27. Section A: Project Lifecycle — 6 metric cards with counts
28. Section B: Critical Exceptions — up to 8 items from SLA + issues
29. Section C: Delivery Readiness — 4 metric cards
30. Section D: Operational Health — project band distribution, department health list
31. Open SLA breach count matches getOpenSlaBreaches() in dev mode

---

## 4. Executive Dashboard

32. Same 4 sections as Control Tower without stat bar
33. breadcrumb shows Reports > Executive
34. Project counts match MOCK_PROJECTS status distribution
35. Missing WO count: Saudi approved projects without wo_reference

---

## 5. Project Reports

36. Status filter tabs work: All / Draft / Submitted / Approved / Active / Completed
37. Search by project_code filters correctly
38. Search by customer_name filters correctly
39. WO column: Saudi projects show ✓ WO or ✗ Missing WO
40. PN column: Dubai projects show ✓ PN or ✗ Missing PN
41. Health score column: only visible to admin / operations_manager
42. Health band: healthy=green, watch=amber, at_risk=orange, critical=red
43. View link for each project navigates to /projects/:id
44. Export button shown but disabled ("coming soon")

---

## 6. Sales Reports

45. Quotations tab: shows total, pending coordinator, returned, converted counts
46. Quotation table: all quotations with status badges
47. Active Projects tab: only approved or active projects shown
48. Aging tab: shows "Coming in future phase" notice

---

## 7. Procurement Reports

49. Open PRs tab: PRs not in completed/cancelled status
50. PR Items Without PO tab: PRs in pr_received or in_progress status
51. PO Pending Approval tab: POs where approval_status === 'pending'
52. PO Without ETA tab: POs with no eta_date
53. Delayed ETAs tab: POs where eta_date < today
54. Supplier Status tab: scorecard table visible
55. Purchase cost: visible to admin/ops/procurement_user, hidden to factory/store/qc/afs/viewer

---

## 8. Factory Reports

56. Missing BOQ tab: factory records with boq_status not uploaded
57. Missing GA Drawing tab: records with ga_drawing_status not uploaded
58. Monthly Update Required tab: records where status = 'monthly_update_required'
59. Ready for QC tab: records where production_status = 'production_completed'
60. Raw Material Requests tab: open RMRs listed

---

## 9. Store Reports

61. Material Receipts tab: all store receipts
62. Vehicle Receipts tab: all vehicle receipts
63. Custody Pending tab: custody records with pending status
64. Unallocated Materials tab: unallocated records
65. Medical Serials tab: items with serial tracking
66. No purchase cost columns anywhere on store reports

---

## 10. QC Reports

67. Material QC Pending: inspections not in passed/failed_accepted
68. Open NCRs: NCRs not in closed/cancelled
69. Project QC Pending: inspections not completed
70. Open Findings: findings with open/in_rework status
71. Release Notes: blocked notes show red bg, ready_to_issue shows amber bg
72. No purchase cost columns on QC reports

---

## 11. AFS Reports

73. Missing PN tab: Dubai followups with pn_reference_id === null show red banner
74. Delayed ETAs tab: ETA history records with reasons
75. Arrival Reports tab: all arrival reports with status badges
76. Missing Items tab: open missing items with severity badges
77. Pre-Delivery tab: pre-delivery reports; not-ready rows amber bg
78. Maintenance tab: critical priority requests red bg
79. View links navigate to correct AFS detail pages

---

## 12. Supplier Reports

80. Scorecard table: all 5 mock suppliers
81. Score bar: healthy=green, watch=amber, at_risk=orange, critical=red width matches score
82. Summary strip: Excellent (≥85), Good (70-84), Needs Improvement (50-69), Poor (<50) counts correct
83. "How scored" collapsible section toggles open/close
84. Sign in as procurement_user → page accessible
85. Sign in as factory_user → page accessible (no cost data on supplier page)

---

## 13. SLA Reports

86. Summary strip: Open Breaches, Escalated, Resolved counts
87. Open Breaches tab: only overdue or escalated events
88. Escalated events show Level N badge
89. Severity badge maps: critical→critical, high→warning, medium→info, low→default
90. Due label: "3h overdue", "Due in 2h", "Resolved"
91. All Events tab: all 10 mock events
92. SLA Rules tab: 12 rules with duration and applies_to_roles
93. formatDuration(48) = "2d", formatDuration(30) = "30h"

---

## 14. Data Quality Dashboard

94. Summary strip: Critical Gaps, High Gaps, Passing, Total Checks
95. Module filter: selecting "QC" shows only QC checks
96. Severity filter: selecting "critical" shows only critical checks
97. check with count === 0: green "Passing" badge
98. check with count > 0: red/amber count badge
99. Critical checks with count > 0: row has bg-red-50
100. "Fix" link navigates to correct fix_path
101. Sort: critical first, then high, medium, low; within severity, count > 0 first

---

## 15. Health Scores

102. Projects tab: only visible to admin/operations_manager
103. Sign in as factory_user → "Health scores are visible to Operations and Admin only" message shown
104. Projects table: score bar width matches score percentage
105. Score band badge colors correct
106. Blockers and Issues counts shown
107. "How calculated" collapsible shows formula
108. Departments tab: all 8 departments listed with labels
109. "Sales Coordinator" shown for department_key 'sales_coordinator'
110. Suppliers tab: embedded scorecard table

---

## 16. Issues & Risks

111. All tab: all 8 mock issues
112. Open tab: only open/assigned/in_progress/waiting_input
113. In Progress tab: in_progress only
114. Resolved tab: resolved/closed
115. Click row → expands showing description
116. Close Issue button: disabled when closureNotes empty
117. Close Issue button: enabled when closureNotes has text
118. Closed issue removed from Open tab view
119. Dev mode notice shows
120. Sign in as operations_manager → canClose = true

---

## 17. CAPA Records

121. All tab: all 4 mock CAPAs
122. In Progress tab: CAPAs in assigned/in_progress
123. Pending Check tab: CAPA-2025-0003 visible (pending_effectiveness_check)
124. Click CAPA row → expands showing root_cause, corrective_action, preventive_action
125. Pending effectiveness check: shows textarea + Mark Effective / Mark Ineffective buttons
126. Buttons disabled when effectivenessResult empty
127. After clicking Mark Effective: status changes, dev message shown
128. Sign in as qc_user → cannot manage CAPA (canManage = false for qc_user)
129. Sign in as operations_manager → canManage = true

---

## 18. ProjectDetail Health Integration

130. Navigate to /projects/proj-007 (critical health score)
131. Overview tab → "Project Health & Reports" card shows score=28, band=critical (red bg)
132. Blockers, SLA Breaches, Open Issues counts visible
133. "Full Report →" link points to /reports/projects
134. Navigate to /projects/proj-003 (healthy score)
135. Health card shows score=90, band=healthy (green bg)

---

## 19. Dashboard Updates

136. Dashboard shows "Reports & Control Tower" section with 2 quick-access cards
137. Control Tower card links to /control-tower
138. Reports Hub card links to /reports
139. BarChart2 and Activity icons render (in ICON_MAP)

---

## 20. Action Inbox

140. Sign in as admin → task-rep-001 (SLA breach) visible
141. Sign in as operations_manager → task-rep-002 (critical health) and task-rep-004 (CAPA) visible
142. Sign in as afs_user → tasks task-rep-001/002/003/004/005 NOT visible (all assigned to admin/ops)
143. task-rep-005 shows overdueBy: 1 (overdue indicator)

---

## 21. Governance Checks

144. No purchase cost in any store/qc/afs/factory report page
145. Health Scores page gates Projects tab to admin/ops only
146. CAPA management (effectiveness check) gates to admin/ops
147. Issue closure available to admin/ops or issue owner
148. SLA page accessible to admin/ops (linked from Control Tower)
149. Supplier scores visible to all (no cost data)
150. Dev mode notice on all report pages when Supabase not configured
