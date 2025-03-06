# RepoPrep TypeScript

A TypeScript tool to prepare for technical interviews based on repository analysis.

## Features

- Analyze GitHub repositories using repomix
- Extract and answer questions from rubric files
- Two operation modes: Interactive REPL/Interview or direct Analysis
- Process multiple repositories simultaneously
- Generate interview questions specific to repository content

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd repoprep-ts

# Install dependencies
npm install
```

## File Locations

All configuration files should be placed in the root of the ts-project directory:

- `rubric.txt` - Contains the interview questions (created automatically if missing)
- `repos.list` - Contains the list of repositories to analyze (must be created manually)
- `.env` - Contains your GEMINI_API_KEY (must be created manually)

**IMPORTANT:** For the `repos` and `analysis` npm scripts to work properly, `repos.list` must be in the root directory of the ts-project folder.

Example directory structure:
```
ts-project/
├── .env                # Your Gemini API key
├── repos.list          # List of repositories to analyze
├── rubric.txt          # Questions to ask about each repository
├── src/                # Source code
└── package.json        # Project dependencies
```

**Required Files:**
- `.env` - Required for API access, must contain your GEMINI_API_KEY
- `repos.list` - Required for the `npm run repos` and `npm run analysis` commands
- `rubric.txt` - Optional (will be created with default questions ONLY if missing)

**Important Note About Rubric Files**:
- If you modify `rubric.txt`, your changes will be preserved across runs
- The application will never overwrite an existing `rubric.txt` file
- To use a completely different rubric file, specify it on the command line:
  ```
  ts-node src/index.ts my-custom-rubric.txt repos.list
  ```

## Repository Analysis

The application performs comprehensive analysis of repositories using repomix:

- Uses repomix to analyze repository structure, technologies, and dependencies
- Extracts useful information for answering rubric questions
- Creates a structured analysis in the output directory for each repository
- Makes a single Gemini API call per repository with all rubric questions
- Gracefully handles situations where repomix analysis is incomplete

## Operation Modes

The application has two main operation modes:

1. **REPL/Interview Mode** (default):
   - Interactive interview with questions from the rubric
   - `npm run repos` - Run interactive interview with repositories from repos.list
   - Uses repomix to analyze repositories listed in repos.list

2. **Analysis Mode**:
   - Direct output of answers to rubric questions for each repository
   - `npm run analysis` - Output answers without interactive mode
   - More suitable for batch processing multiple repositories

## Configuration Files

### Repository List (repos.list)

Create a `repos.list` file in the project root with one repository URL per line:

```
# Repository list (lines starting with # are ignored)
https://github.com/user1/repo1
https://github.com/user2/repo2
https://github.com/user3/repo3
```

### API Key (.env)

You can set your Gemini API key in two ways:

1. Using a `.env` file in the project root:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```

2. Using environment variables:
   ```bash
   # Set for current session
   export GEMINI_API_KEY=your-api-key-here
   
   # Or inline with command
   GEMINI_API_KEY=your-api-key-here npm run start
   ```

**Important API Note:**
- The application uses the `gemini-2.0-pro-exp` model
- Makes only ONE API call per repository with all rubric questions
- Make sure your API key has access to this model version
- API access can be obtained at: https://ai.google.dev/
- If you get errors, check your API key permissions and quotas
- The fallback mode will use mock data if API access fails

## Usage Examples

### Basic Usage

```bash
# Run with default settings (uses rubric.txt if present)
npm run start

# Run with repositories from repos.list
npm run repos

# Run in analysis mode (direct answers without interview)
npm run analysis
```

### Custom Usage

```bash
# Specify custom rubric and repository list files
ts-node src/index.ts my-rubric.txt my-repos.list

# Specify custom files and run in analysis mode
ts-node src/index.ts my-rubric.txt my-repos.list --analysis

# Run with specific repositories on command line
ts-node src/index.ts https://github.com/user1/repo1 https://github.com/user2/repo2
```

## Rubric File Format

Create a text file with your interview rubric. Example format:

```
# Technical Interview Rubric

## Architecture & Design (High importance)
- Frontend-Backend separation
- Data modeling
- API design

Questions:
- Explain the architecture of this application
- How is data flowing between components?

## Code Quality (Medium importance)
- Clean code principles
- Error handling
- Performance considerations

Questions:
- How would you refactor problematic areas?
- What testing strategy would you implement?
```

## Report Generation

At the end of the interview, you can choose to generate a detailed JSON report containing:
- Overall score
- Scores by repository
- Strengths and areas for improvement
- Detailed question-by-question breakdown

## License

ISC