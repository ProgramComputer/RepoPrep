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
- Sends complete raw XML output directly to Gemini to maximize context usage
- Accurately tracks token usage with Gemini's token counting API
- Intelligently limits content to ~1.9M tokens to stay within 2M token limit
- Dynamically adjusts content size based on actual tokenization ratio
- Smart truncation preserves repository structure and most important files
- Provides detailed file metadata and structure information
- Falls back to Gemini 1.5 Pro if encountering quota issues
- Robust token limit handling to prevent API errors
- Requires `GEMINI_API_KEY` in `.env` file or as environment variable
- Creates output in `repo-output-{repoName}` directories
- Raw API response saved to `raw-api-response.txt` for debugging