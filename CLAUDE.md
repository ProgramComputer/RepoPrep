# RepoPrep Development Guide

## Build / Test Commands
- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript code
- `npm run dev` or `npm run start` - Run application in development mode (uses ts-node)
- `npm run clean` - Remove all repo-output-* directories
- `npm run multi` - Analyze multiple repositories
- `npm run repos` - Run analysis using repositories from repos.list file
- `npm run analysis` - Run in Analysis mode for direct answers to rubric questions
- `npm run test` - Run tests (not currently implemented)
- Custom run: `ts-node src/index.ts path/to/rubric.txt repo-url1 repo-url2`

## Code Style Guidelines
- **TypeScript**: Use strict mode with explicit return types and interfaces
- **Imports**: Group by type (node stdlib → external libraries → local modules)
- **Naming**: camelCase for variables/methods, PascalCase for classes/interfaces
- **Error Handling**: Use try/catch with explicit typing (`error: unknown`) and meaningful messages
- **Functions**: Document complex functions with JSDoc comments
- **Formatting**: 2 spaces indentation, semicolons, single quotes
- **Variables**: Prefer const over let, avoid mutable state when possible
- **Logging**: Use chalk for colored terminal output (`chalk.blue`, `chalk.red`, etc.)
- **Type Safety**: Avoid `any`, use explicit type annotations like `ReturnType<typeof funcName>` when needed
- **String Interpolation**: Use template literals for string construction

## Operation Modes
- **REPL/Interview mode** (default): Interactive interview with questions from rubric
- **Analysis mode** (--analysis or -a flag): Direct answers to rubric questions

## Gemini API Usage
- Uses Gemini models with fallback mechanism for rate limit handling
- Primary model: Gemini 2.0 Flash Thinking (15 RPM, 4M TPM, 1500 RPD)
- Fallback 1: Gemini 2.0 Pro Experimental (2 RPM, 1M TPM, 50 RPD)
- Fallback 2: Gemini 1.5 Pro for quota issues
- Requires `GEMINI_API_KEY` in `.env` file or as environment variable
- Creates output in `repo-output-{repoName}` directories
- Raw API response saved to `raw-api-response.txt` for debugging