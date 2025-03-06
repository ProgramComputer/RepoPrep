# RepoPrep Development Guide

## Build / Test Commands
- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript code
- `npm run dev` or `npm run start` - Run application in development mode
- `npm run clean` - Remove all repo-output-* directories
- `npm run multi` - Analyze multiple repositories
- `npm run repos` - Run analysis using repositories from repos.list file
- `npm run analysis` - Run in Analysis mode for direct answers to rubric questions
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

## Operation Modes
- **REPL/Interview mode** (default): Interactive interview with questions from rubric
- **Analysis mode** (--analysis or -a flag): Direct answers to rubric questions

## Repository Analysis
- Uses repomix (v0.2.34) for comprehensive repository analysis
- Works within Gemini's ~204K token context limit (not 2M as originally thought)
- Categorizes code samples by type (Core Files, API, Components, etc.)
- Includes up to 600K characters (~150K tokens) of actual code
- Supports multiple programming languages with syntax highlighting
- Requires `GEMINI_API_KEY` in `.env` file or as environment variable
- Creates output in `repo-output-{repoName}` directories
- Raw API response saved to `raw-api-response.txt` for debugging