```markdown
# left-4-dead-2-mmr-tracker Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the development patterns and conventions used in the `left-4-dead-2-mmr-tracker` repository. The project is written in TypeScript and does not use a specific framework. You'll learn about file naming, import/export styles, commit patterns, and how to write and run tests in this codebase.

## Coding Conventions

### File Naming
- All files use **snake_case**.
  - Example: `mmr_tracker.ts`, `user_stats.test.ts`

### Imports
- Imports use **alias** style.
  - Example:
    ```typescript
    import utils from './utils_alias';
    ```

### Exports
- **Default exports** are used for modules.
  - Example:
    ```typescript
    const calculateMMR = () => { /* ... */ };
    export default calculateMMR;
    ```

### Commit Patterns
- Commits use **freeform messages** (no strict prefixes).
- Average commit message length: ~59 characters.
  - Example:  
    ```
    Fix bug in MMR calculation for disconnected players
    ```

## Workflows

### Code Development
**Trigger:** When adding or updating features or bug fixes  
**Command:** `/dev`

1. Create or update TypeScript files using snake_case naming.
2. Use alias imports and default exports.
3. Write clear, descriptive commit messages (no strict prefix required).
4. Push changes to the repository.

### Testing
**Trigger:** When verifying code correctness  
**Command:** `/test`

1. Write test files using the pattern `*.test.*` (e.g., `mmr_tracker.test.ts`).
2. Use the (unknown) testing framework as per existing test files.
3. Run tests using the project's test runner (refer to project documentation or scripts).

## Testing Patterns

- Test files follow the `*.test.*` naming convention.
  - Example: `mmr_tracker.test.ts`
- The specific testing framework is **unknown**, but tests are co-located with the codebase.
- To write a test:
  ```typescript
  // mmr_tracker.test.ts
  import calculateMMR from './mmr_tracker';

  test('calculates MMR correctly', () => {
    expect(calculateMMR([100, 200])).toBe(150);
  });
  ```

## Commands
| Command   | Purpose                                 |
|-----------|-----------------------------------------|
| /dev      | Start or continue development workflow  |
| /test     | Run or write tests                      |
```
