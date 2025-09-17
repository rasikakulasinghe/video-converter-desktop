# Tasks: Troubleshoot and Fix Video Converter App

**Input**: Design documents from `D:\Projects\Current Projects\Video Converter Project\specs\002-title-troubleshoot-and\`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → SUCCESS: Electron desktop app with TypeScript, React, FFmpeg
   → Structure: electron/ (main process), src/ (renderer), shared/ (types)
2. Load optional design documents:
   → data-model.md: VideoFile, ConversionJob, ConversionSettings, ApplicationPreferences
   → contracts/: 4 contract files (file-ops, conversion, app-state, system)
   → research.md: IPC registration patterns, service instantiation approach
   → quickstart.md: 3-phase troubleshooting workflow with validation steps
3. Generate tasks by category:
   → Setup: debugging tools, test environment
   → Tests: contract tests, integration tests for IPC communication
   → Core: service registration, IPC handlers, error handling
   → Integration: FFmpeg validation, end-to-end workflows
   → Polish: comprehensive testing, documentation updates
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Service fixes sequential (main.ts dependencies)
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph for IPC fixes
7. Create parallel execution examples
8. Validate task completeness: All IPC channels tested and implemented
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Electron Desktop App**: `electron/` (main), `src/` (renderer), `shared/` (types), `tests/`
- All paths relative to repository root: `d:\Projects\Current Projects\Video Converter Project\`

## Phase 3.1: Setup & Diagnostics
- [ ] T001 Add IPC debugging utilities to `electron/main.ts` for handler registration logging
- [ ] T002 [P] Create diagnostic test file `tests/diagnostics/ipc-connectivity.spec.ts` for basic ping/pong tests
- [ ] T003 [P] Set up systematic logging in `electron/services/logging.service.ts` for troubleshooting

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test file:select IPC channel in `tests/contract/file-operations.spec.ts`
- [ ] T005 [P] Contract test conversion:start IPC channel in `tests/contract/conversion-operations.spec.ts`
- [ ] T006 [P] Contract test app:get-preferences IPC channel in `tests/contract/app-state.spec.ts`
- [ ] T007 [P] Contract test system:show-in-explorer IPC channel in `tests/contract/system-integration.spec.ts`
- [ ] T008 [P] Integration test file selection workflow in `tests/integration/file-selection.spec.ts`
- [ ] T009 [P] Integration test video conversion process in `tests/integration/video-conversion.spec.ts`
- [ ] T010 [P] Integration test progress tracking in `tests/integration/progress-tracking.spec.ts`
- [ ] T011 [P] Integration test error recovery scenarios in `tests/integration/error-handling.spec.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)
### Service Layer Fixes
- [ ] T012 [P] Fix FileOperationsService singleton pattern in `electron/services/file-operations.service.ts`
- [ ] T013 [P] Fix ConversionService initialization in `electron/services/conversion.service.ts`
- [ ] T014 [P] Implement AppStateService for preferences in `electron/services/app-state.service.ts`
- [ ] T015 [P] Implement SystemIntegrationService in `electron/services/system-integration.service.ts`

### IPC Handler Registration (Sequential - Dependencies on main.ts)
- [ ] T016 Register FileOperationsHandlers in `electron/main.ts` with proper service injection
- [ ] T017 Register ConversionOperationsHandlers in `electron/main.ts` with service injection
- [ ] T018 Register AppStateHandlers in `electron/main.ts` with service injection
- [ ] T019 Register SystemIntegrationHandlers in `electron/main.ts` with service injection

### Handler Implementation Updates
- [ ] T020 [P] Update FileOperationsHandlers to use correct IPC channel names in `electron/handlers/file-operations.handlers.ts`
- [ ] T021 [P] Update ConversionOperationsHandlers for progress tracking in `electron/handlers/conversion-operations.handlers.ts`
- [ ] T022 [P] Implement AppStateHandlers for preferences management in `electron/handlers/app-state.handlers.ts`
- [ ] T023 [P] Implement SystemIntegrationHandlers for file system ops in `electron/handlers/system-integration.handlers.ts`

### Data Model Implementation
- [ ] T024 [P] Create VideoFile type validation utilities in `shared/types/video-file.ts`
- [ ] T025 [P] Create ConversionJob progress tracking types in `shared/types/conversion-job.ts`
- [ ] T026 [P] Create ApplicationPreferences schema in `shared/types/app-state.ts`

## Phase 3.4: Integration & FFmpeg
- [ ] T027 FFmpeg binary validation and error handling in `electron/services/conversion.service.ts`
- [ ] T028 Progress event emission setup between main and renderer processes
- [ ] T029 Error handling middleware for all IPC channels in `electron/handlers/error-middleware.ts`
- [ ] T030 File system permissions validation in `electron/services/file-operations.service.ts`

## Phase 3.5: End-to-End Workflows
- [ ] T031 [P] Complete file selection to validation workflow testing in `tests/e2e/file-workflow.spec.ts`
- [ ] T032 [P] Complete video conversion workflow testing in `tests/e2e/conversion-workflow.spec.ts`
- [ ] T033 [P] Preferences save/load workflow testing in `tests/e2e/preferences-workflow.spec.ts`
- [ ] T034 Error recovery and cancellation workflow testing in `tests/e2e/error-recovery.spec.ts`

## Phase 3.6: Polish & Validation
- [ ] T035 [P] Unit tests for service layer validation in `tests/unit/services.spec.ts`
- [ ] T036 [P] Performance tests for concurrent conversions in `tests/performance/conversion-performance.spec.ts`
- [ ] T037 [P] Security tests for IPC input validation in `tests/security/ipc-security.spec.ts`
- [ ] T038 Execute quickstart.md validation scenarios and verify all pass
- [ ] T039 [P] Update troubleshooting documentation in `docs/troubleshooting.md`
- [ ] T040 Remove temporary debugging code and clean up console logging

## Dependencies
```
Setup (T001-T003) → Tests (T004-T011) → Core Implementation (T012-T026)
                     ↓
Integration (T027-T030) → End-to-End (T031-T034) → Polish (T035-T040)

Within Core Implementation:
- Services (T012-T015) before Handlers (T016-T023)
- Handler registration (T016-T019) must be sequential
- Data models (T024-T026) can be parallel with services
```

## Parallel Execution Examples

### Contract Tests (Can run simultaneously)
```bash
# Launch T004-T007 together:
Task: "Contract test file:select IPC channel in tests/contract/file-operations.spec.ts"
Task: "Contract test conversion:start IPC channel in tests/contract/conversion-operations.spec.ts"
Task: "Contract test app:get-preferences IPC channel in tests/contract/app-state.spec.ts"
Task: "Contract test system:show-in-explorer IPC channel in tests/contract/system-integration.spec.ts"
```

### Service Layer Fixes (Independent files)
```bash
# Launch T012-T015 together:
Task: "Fix FileOperationsService singleton pattern in electron/services/file-operations.service.ts"
Task: "Fix ConversionService initialization in electron/services/conversion.service.ts"
Task: "Implement AppStateService for preferences in electron/services/app-state.service.ts"
Task: "Implement SystemIntegrationService in electron/services/system-integration.service.ts"
```

### Handler Updates (After registration is complete)
```bash
# Launch T020-T023 together:
Task: "Update FileOperationsHandlers to use correct IPC channel names in electron/handlers/file-operations.handlers.ts"
Task: "Update ConversionOperationsHandlers for progress tracking in electron/handlers/conversion-operations.handlers.ts"
Task: "Implement AppStateHandlers for preferences management in electron/handlers/app-state.handlers.ts"
Task: "Implement SystemIntegrationHandlers for file system ops in electron/handlers/system-integration.handlers.ts"
```

## Critical Path Analysis
1. **Diagnostic Setup** (T001-T003): Enable systematic debugging
2. **Contract Tests** (T004-T011): Define expected behavior and reveal current failures
3. **Service Fixes** (T012-T015): Restore service layer functionality
4. **IPC Registration** (T016-T019): Connect services to IPC system ⚠️ SEQUENTIAL
5. **Handler Updates** (T020-T023): Align with contract specifications
6. **Integration Testing** (T027-T034): Verify end-to-end functionality
7. **Validation** (T035-T040): Confirm repair completion

## Systematic Troubleshooting Phases
Following the quickstart.md methodology:

### Phase 1: IPC Channel Verification (T001-T011)
Implement the diagnostic tools and tests to verify IPC communication pipeline

### Phase 2: Service Layer Restoration (T012-T026) 
Fix the service instantiation and registration issues

### Phase 3: End-to-End Validation (T027-T040)
Confirm all workflows function as specified in the original requirements

## Success Criteria
- [ ] All 12 functional requirements from spec.md are met
- [ ] File selection, validation, and conversion workflows work end-to-end
- [ ] Progress tracking provides real-time updates
- [ ] Error handling provides meaningful feedback
- [ ] All quickstart.md validation steps pass
- [ ] No IPC communication errors in console
- [ ] FFmpeg integration functions correctly

## Notes
- [P] tasks target different files with no dependencies
- IPC handler registration (T016-T019) MUST be sequential due to main.ts dependencies
- All contract tests MUST fail before implementing fixes (TDD requirement)
- FFmpeg dependency validation is critical for conversion functionality
- Follow systematic troubleshooting approach from quickstart.md

---
**Tasks Status**: ✅ COMPLETE - Ready for execution following TDD principles