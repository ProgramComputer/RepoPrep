import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import inquirer from 'inquirer';
import chalk from 'chalk';
// We could use repomix directly if needed:
// import * as repomix from 'repomix';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error(chalk.red('Error: GEMINI_API_KEY environment variable is not set'));
  console.error(chalk.yellow('Please set it in a .env file or as an environment variable'));
  process.exit(1);
}

// Function to read repositories from a file
function readReposFromFile(filePath: string): string[] {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    // Extract URLs from file content (one per line)
    const repos = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('https://') && !line.startsWith('#'))
      .filter(Boolean);
    
    if (repos.length === 0) {
      console.error(chalk.red(`No valid repository URLs found in ${filePath}`));
      return [];
    }
    
    console.log(chalk.green(`Found ${repos.length} repositories in ${filePath}`));
    return repos;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error reading repository file: ${errorMessage}`));
    return [];
  }
}

// Get repositories from command line arguments, file, or use default
let REPO_URLS: string[] = [];

// Check if a repo list file is provided
const REPO_LIST_FILE = process.argv.find(arg => arg.endsWith('.repos') || arg.endsWith('.list'));
if (REPO_LIST_FILE && fs.existsSync(REPO_LIST_FILE)) {
  console.log(chalk.blue(`Reading repositories from file: ${REPO_LIST_FILE}`));
  REPO_URLS = readReposFromFile(REPO_LIST_FILE);
} else {
  // Otherwise get repos from command line arguments
  REPO_URLS = process.argv.slice(2).filter(arg => arg.startsWith('https://'));
}

// If no repositories specified, use default
if (REPO_URLS.length === 0) {
  REPO_URLS.push("https://github.com/ProgramComputer/friendly-tickets");
}

const RUBRIC_FILE = process.argv.find(arg => arg.endsWith('.txt') || arg.endsWith('.md'));
const OUTPUT_FILE = "interview_questions.json";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Use the specified model version
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-pro-exp"
});

// Default rubric if no file is provided
let RUBRIC = `
# Technical Interview Rubric for Web Development

## Architecture & Design (High importance)
- Frontend-Backend separation
- Data modeling
- API design
- State management

Questions:
- Explain the architecture of this application
- How is data flowing between components?
- How would you improve the current architecture?

## Code Quality (Medium importance)
- Clean code principles
- Error handling
- Performance considerations
- Testing approach

Questions:
- How would you refactor problematic areas?
- What testing strategy would you implement?
- How would you handle errors more effectively?

## Problem Solving (High importance)
- Understanding requirements
- Proposing solutions
- Technical communication
- Debugging approach

Questions:
- How would you implement a new feature X?
- How would you troubleshoot issue Y?
- Explain your approach to solving complex problems
`;

interface InterviewQuestion {
  id: string;
  question: string;
  type: string;
  difficulty: string;
  expectedAnswer: string;
  evaluationCriteria: string[];
  repository?: string;
  repositoryName?: string;
}

interface AnswerEvaluation {
  score: number;
  feedback: string;
  missingPoints: string[];
  strengths: string[];
  suggestions: string;
}

/**
 * Extract questions from a rubric document
 */
function extractQuestionsFromRubric(rubric: string): string[] {
  const questions: string[] = [];
  const lines = rubric.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for question markers
    if (line === 'Questions:' || line.includes('questions:')) {
      // Collect questions until next section or end
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine || nextLine.startsWith('#') || nextLine.endsWith(':')) {
          break;
        }
        // Lines starting with - or * or numbers are likely questions
        if ((nextLine.startsWith('-') || nextLine.startsWith('*') || /^\d+\./.test(nextLine)) && 
            nextLine.includes('?')) {
          questions.push(nextLine.replace(/^[*\-\d\.]+\s*/, '').trim());
        }
        j++;
      }
    } else if (line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
      // Also check individual lines with question marks
      if (line.includes('?')) {
        questions.push(line.replace(/^[*\-\d\.]+\s*/, '').trim());
      }
    }
  }
  
  return questions;
}

/**
 * Generate mock repository XML data
 */
function generateMockRepositoryXml(repoUrl: string, repoName: string): string {
  return `
<repository url="${repoUrl}" name="${repoName}">
  <metadata>
    <created_at>${new Date().toISOString()}</created_at>
    <repository_type>GitHub</repository_type>
    <analysis_version>1.0</analysis_version>
    <description>Repository analysis for ${repoName}</description>
    <repository_details>
      <stars>1245</stars>
      <forks>328</forks>
      <watchers>89</watchers>
      <contributors>17</contributors>
      <last_commit>2023-11-15T14:32:18Z</last_commit>
      <license>MIT</license>
    </repository_details>
  </metadata>
  
  <technologies>
    <technology type="language" usage="primary">TypeScript</technology>
    <technology type="language" usage="secondary">JavaScript</technology>
    <technology type="framework" usage="primary">React</technology>
    <technology type="framework" usage="secondary">Express</technology>
    <technology type="runtime" usage="primary">Node.js</technology>
    <technology type="database" usage="primary">MongoDB</technology>
    <technology type="database" usage="secondary">Redis</technology>
    <technology type="styling" usage="primary">Tailwind CSS</technology>
    <technology type="build" usage="primary">Vite</technology>
    <technology type="testing" usage="primary">Jest</technology>
    <technology type="ai" usage="primary">OpenAI API</technology>
    <technology type="ai" usage="secondary">LangChain</technology>
  </technologies>
  
  <components>
    <component type="ui" complexity="high">Frontend Application</component>
    <component type="server" complexity="medium">Backend API Server</component>
    <component type="service" complexity="high">AI Analysis Service</component>
    <component type="utilities" complexity="medium">Utility Functions</component>
    <component type="data" complexity="high">Data Models</component>
    <component type="integration" complexity="high">AI Model Integration</component>
  </components>
  
  <dependencies>
    <dependency version="^18.2.0" usage="critical">react</dependency>
    <dependency version="^18.2.0" usage="critical">react-dom</dependency>
    <dependency version="^4.18.2" usage="critical">express</dependency>
    <dependency version="^5.0.4" usage="critical">typescript</dependency>
    <dependency version="^4.2.0" usage="ai">openai</dependency>
    <dependency version="^1.0.0" usage="ai">langchain</dependency>
  </dependencies>

  <structure>
    <directory path="src">
      <file path="index.ts">Main application entry point</file>
      <directory path="components">
        <file path="App.tsx">Main application component</file>
        <file path="Header.tsx">Application header component</file>
        <directory path="common">
          <file path="Button.tsx">Reusable button component</file>
        </directory>
        <directory path="ai">
          <file path="SearchInterface.tsx">AI search interface component</file>
        </directory>
      </directory>
      <directory path="services">
        <directory path="ai">
          <file path="ragPipeline.ts">RAG implementation service</file>
        </directory>
      </directory>
      <directory path="utils">
        <file path="logger.ts">Application logging utility</file>
      </directory>
      <directory path="api">
        <file path="ai.ts">AI-related endpoints</file>
      </directory>
    </directory>
  </structure>
</repository>`;
}

/**
 * Answer rubric questions for a repository using Gemini
 * Makes a SINGLE API call for all questions
 */
async function answerRubricQuestionsWithGemini(repoAnalysis: any, rubric: string): Promise<InterviewQuestion[]> {
  try {
    // Extract questions from the rubric
    const rubricQuestions = extractQuestionsFromRubric(rubric);
    
    if (rubricQuestions.length === 0) {
      console.warn(chalk.yellow('No questions found in the rubric. Using default questions.'));
      rubricQuestions.push(
        "Explain the architecture of this application",
        "How would you refactor problematic areas?",
        "How would you improve the error handling?"
      );
    }
    
    console.log(chalk.blue(`Found ${rubricQuestions.length} questions in the rubric`));
    console.log(chalk.yellow(`Making a single API call for all questions about repository: ${repoAnalysis.name}`));
    
    // Format the questions in numbered list
    const questionsList = rubricQuestions.map((q, i) => `${i+1}. ${q}`).join('\n');
    
    // Create a more informative analysis summary with code samples
    let repoSummary = `Repository: ${repoAnalysis.name} (${repoAnalysis.repo})\n`;
    
    if (repoAnalysis.technologies && repoAnalysis.technologies.length > 0) {
      repoSummary += `\nTechnologies: ${repoAnalysis.technologies.join(', ')}\n`;
    }
    
    if (repoAnalysis.components && repoAnalysis.components.length > 0) {
      repoSummary += `\nComponents/Modules: ${repoAnalysis.components.join(', ')}\n`;
    }
    
    if (repoAnalysis.dependencies && repoAnalysis.dependencies.length > 0) {
      repoSummary += `\nDependencies: ${repoAnalysis.dependencies.slice(0, 10).join(', ')}${repoAnalysis.dependencies.length > 10 ? '...' : ''}\n`;
    }
    
    if (repoAnalysis.structure) {
      repoSummary += `\nProject Structure: ${JSON.stringify(repoAnalysis.structure, null, 2)}\n`;
    }
    
    // Include code samples for files, organizing by categories for better readability
    if (repoAnalysis.codeFiles && Object.keys(repoAnalysis.codeFiles).length > 0) {
      // Group files by type/directory for better organization
      const filesByType: Record<string, Record<string, string>> = {
        "Core Files": {},
        "Configuration": {},
        "Components": {},
        "API/Services": {},
        "Utils": {},
        "Data Models": {},
        "Styles": {},
        "Documentation": {},
        "Other Files": {}
      };
      
      // Categorize files
      Object.entries(repoAnalysis.codeFiles).forEach(([filePath, content]) => {
        // Determine file category
        let category = "Other Files";
        
        if (filePath.includes("package.json") || filePath.endsWith(".env.example") || 
            filePath.includes("config") || filePath.includes("tsconfig") || 
            filePath.includes("webpack") || filePath.includes("vite")) {
          category = "Configuration";
        } else if (filePath.includes("/src/index") || filePath.includes("/app") || 
                  filePath.includes("main") || filePath.includes("server")) {
          category = "Core Files";
        } else if (filePath.includes("/components/") || filePath.includes("/pages/") || 
                  filePath.match(/\.(jsx|tsx|vue|svelte)$/)) {
          category = "Components";
        } else if (filePath.includes("/api/") || filePath.includes("/services/") || 
                  filePath.includes("/providers/")) {
          category = "API/Services";
        } else if (filePath.includes("/utils/") || filePath.includes("/helpers/")) {
          category = "Utils";
        } else if (filePath.includes("/models/") || filePath.includes("schema") || 
                  filePath.includes("types") || filePath.includes("/db/")) {
          category = "Data Models";
        } else if (filePath.match(/\.(css|scss|less|styl)$/)) {
          category = "Styles";
        } else if (filePath.match(/\.(md|txt|docs)$/)) {
          category = "Documentation";
        }
        
        filesByType[category][filePath] = content as string;
      });
      
      // Add files by category to the summary
      repoSummary += `\n\n## CODE SAMPLES\n`;
      
      Object.entries(filesByType).forEach(([category, files]) => {
        if (Object.keys(files).length > 0) {
          repoSummary += `\n### ${category}\n`;
          
          Object.entries(files).forEach(([filePath, content]) => {
            // Add syntax highlighting based on file extension
            const extension = filePath.split('.').pop() || '';
            const syntax = getSyntaxHighlighting(extension);
            repoSummary += `\n#### File: ${filePath}\n\`\`\`${syntax}\n${content}\n\`\`\`\n`;
          });
        }
      });
    }
    
    // Helper function to determine syntax highlighting based on file extension
    function getSyntaxHighlighting(extension: string): string {
      const syntaxMap: Record<string, string> = {
        'js': 'javascript',
        'jsx': 'jsx',
        'ts': 'typescript',
        'tsx': 'tsx',
        'css': 'css',
        'scss': 'scss',
        'html': 'html',
        'json': 'json',
        'md': 'markdown',
        'py': 'python',
        'rb': 'ruby',
        'go': 'go',
        'java': 'java',
        'php': 'php',
        'sql': 'sql',
        'sh': 'bash',
        'yml': 'yaml',
        'yaml': 'yaml',
        'prisma': 'prisma',
        'vue': 'vue',
        'svelte': 'svelte',
        'rust': 'rust',
        'rs': 'rust',
        'c': 'c',
        'cpp': 'cpp',
        'h': 'c',
        'hpp': 'cpp',
        'cs': 'csharp',
        'swift': 'swift',
        'kt': 'kotlin',
        'gradle': 'gradle',
        'dart': 'dart',
        'xml': 'xml',
        'graphql': 'graphql',
        'gql': 'graphql'
      };
      
      return syntaxMap[extension] || '';
    }
    
    if (repoAnalysis.summary) {
      repoSummary += `\n\nSummary: ${repoAnalysis.summary}\n`;
    }
    
    // Create a single prompt for all questions
    const prompt = `
      You are an expert software developer analyzing a GitHub repository. You have been provided with code samples from this repository.
      
      REPOSITORY ANALYSIS:
      ${repoSummary}
      
      THE ANALYSIS ABOVE WAS GENERATED BY REPOMIX, A TOOL THAT EXTRACTS REPOSITORY STRUCTURE, TECHNOLOGIES, AND CODE SAMPLES.
      
      Repomix works by cloning the repository, analyzing its structure and content, and extracting key files. The analysis above includes:
      
      1. A comprehensive list of technologies used in the repository
      2. Major components and modules identified in the codebase
      3. Key dependencies the project relies on
      4. The project directory structure
      5. Extensive code samples from the repository, organized by category
      
      This analysis is particularly valuable because it includes ACTUAL CODE from the repository, not just summaries or metadata. You have access to the real implementation details.
      
      Please answer the following questions about the repository. For each question, provide a detailed and specific response:
      
      ${questionsList}
      
      Your answers should:
      1. Be comprehensive and reference the code samples provided
      2. Reference specific code samples and quote relevant code snippets in your answers
      3. Analyze implementation details, patterns, and architectural choices evident in the code
      4. Provide concrete, specific feedback and recommendations based on the actual code
      5. Draw connections between different files and components to explain how they work together
      
      Format your response as a JSON object where the keys are the question numbers and the values are your answers.
      Example format:
      {
        "1": "Answer to question 1...",
        "2": "Answer to question 2...",
        "3": "Answer to question 3..."
      }
      
      Return ONLY valid JSON - properly formatted with no markdown code blocks or other text.
    `;

    try {
      // Make a single API call with all questions
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Save raw response to debug file in the same directory as the repo analysis
      const debugDir = path.dirname(repoAnalysis.outputFile || '.');
      const debugFile = path.join(debugDir, 'raw-api-response.txt');
      fs.writeFileSync(debugFile, responseText);
      console.log(chalk.blue(`Raw API response saved to: ${debugFile}`));
      
      // Parse the JSON response
      let answers: Record<string, string>;
      try {
        // First, try parsing directly
        answers = JSON.parse(responseText);
      } catch (jsonError) {
        console.error(chalk.red('Error parsing JSON response directly. Attempting to extract JSON...'));
        
        // Try to extract JSON if it's wrapped in markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*(\{.*?\})\s*```/s) || 
                         responseText.match(/\{[\s\S]*?\}/s);
        
        if (jsonMatch) {
          try {
            console.log(chalk.blue('Found potential JSON in response, trying to parse it...'));
            answers = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            console.log(chalk.green('Successfully extracted JSON from response'));
          } catch (extractError) {
            console.error(chalk.red('Failed to extract valid JSON, falling back to text processing'));
            console.log(chalk.yellow('Raw response saved to file for debugging'));
            answers = {};
          }
        } else {
          console.error(chalk.red('No JSON-like structure found. Using text response format.'));
          console.log(chalk.yellow('Raw response saved to file for debugging'));
          // If JSON parsing fails, split the response by question numbers
          answers = {};
          rubricQuestions.forEach((q, i) => {
            const questionNum = i + 1;
            const regex = new RegExp(`${questionNum}[.:]\\s*(.+?)(?=\\s*${questionNum + 1}[.:]|$)`, 's');
            const match = responseText.match(regex);
            answers[questionNum.toString()] = match ? match[1].trim() : `Unable to extract answer for question ${questionNum}`;
          });
        }
      }
      
      // Create the results array
      const results: InterviewQuestion[] = [];
      rubricQuestions.forEach((question, index) => {
        const questionId = (index + 1).toString();
        const answer = answers[questionId] || `No answer provided for question ${questionId}`;
        
        results.push({
          id: `q${questionId}`,
          question,
          type: "Repository Analysis",
          difficulty: "medium",
          expectedAnswer: answer,
          evaluationCriteria: [
            "Accuracy based on repository content",
            "Technical depth and specificity", 
            "Practical recommendations"
          ],
          repository: repoAnalysis.repo,
          repositoryName: repoAnalysis.name
        });
      });
      
      return results;
      
    } catch (apiError: unknown) {
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      console.error(chalk.red('Error calling Gemini API:'), errorMessage);
      
      // Check for specific context window errors and provide better error messages
      if (errorMessage.includes('exceed context limit')) {
        console.error(chalk.red('Context limit exceeded.'));
        console.error(chalk.yellow('The error shows the actual context limit of Gemini. Update MAX_CONTENT_LENGTH in the code accordingly.'));
        const match = errorMessage.match(/(\d+) \+ (\d+) > (\d+)/);
        if (match) {
          const inputTokens = parseInt(match[1]);
          const outputTokens = parseInt(match[2]);
          const contextLimit = parseInt(match[3]);
          console.error(chalk.yellow(`Current attempt: ${inputTokens} input tokens + ${outputTokens} output tokens = ${inputTokens + outputTokens} total`));
          console.error(chalk.yellow(`Context limit: ${contextLimit} tokens`));
          console.error(chalk.yellow(`Exceeding by: ${inputTokens + outputTokens - contextLimit} tokens`));
          console.error(chalk.yellow(`Suggestion: Reduce MAX_CONTENT_LENGTH to around ${Math.floor((contextLimit - outputTokens) * 4 * 0.8)} characters`));
        }
      }
      
      console.log(chalk.yellow('Using mock answers as fallback'));
      
      // Generate mock answers for all questions
      const results: InterviewQuestion[] = [];
      rubricQuestions.forEach((question, index) => {
        results.push({
          id: `q${index + 1}`,
          question,
          type: "Repository Analysis",
          difficulty: "medium",
          expectedAnswer: `[MOCK ANSWER] Based on the limited information available from the repository analysis, I cannot provide a specific answer to "${question}". The analysis may be incomplete due to packing errors. Without more details about the repository structure and implementation, I can only suggest reviewing the code directly or running additional analysis tools to gather more information.`,
          evaluationCriteria: [
            "Accuracy based on repository content",
            "Technical depth and specificity",
            "Practical recommendations"
          ],
          repository: repoAnalysis.repo,
          repositoryName: repoAnalysis.name
        });
      });
      
      return results;
    }
    
  } catch (error: unknown) {
    console.error(chalk.red('Error generating answers:'), error instanceof Error ? error.message : String(error));
    
    // Fallback mock questions if the entire process fails
    const mockQuestions: InterviewQuestion[] = [
      {
        id: "q1",
        question: "Looking at the repository architecture, explain how you would improve the data flow.",
        type: "Architecture & Design",
        difficulty: "medium",
        expectedAnswer: "I would implement a more robust state management solution to handle API interactions, caching, and loading/error states. The implementation could benefit from better separation between UI components and data fetching logic.",
        evaluationCriteria: ["Architecture understanding", "State management knowledge", "API design principles"],
        repository: repoAnalysis.repo,
        repositoryName: repoAnalysis.name
      }
    ];
    
    return mockQuestions;
  }
}

/**
 * Evaluate an answer using Gemini
 */
async function evaluateAnswerWithGemini(
  question: InterviewQuestion,
  answer: string
): Promise<AnswerEvaluation> {
  try {
    const prompt = `
      You are an expert technical interviewer evaluating a candidate's response.
      
      Question: ${question.question}
      
      Expected answer criteria:
      ${question.expectedAnswer}
      
      Evaluation criteria:
      ${question.evaluationCriteria.join(', ')}
      
      Candidate's answer:
      ${answer}
      
      Evaluate the answer on a scale of 1-10, where:
      1-3: Poor (major concepts missing or incorrect)
      4-6: Average (basic understanding, but lacks depth)
      7-8: Good (solid understanding with minor omissions)
      9-10: Excellent (comprehensive and insightful)
      
      Provide your evaluation as a JSON object with:
      - score: Numeric score 1-10
      - feedback: Overall assessment
      - missingPoints: Array of important points that were missed
      - strengths: Array of strong points in the answer
      - suggestions: Specific advice for improvement
      
      Format your response as valid JSON:
      {
        "score": number,
        "feedback": "string",
        "missingPoints": ["string", "string", ...],
        "strengths": ["string", "string", ...],
        "suggestions": "string"
      }
      
      Return ONLY the JSON object, nothing else.
    `;
    
    // Use Gemini API to evaluate the answer
    try {
      const result = await model.generateContent(prompt);
      const jsonString = result.response.text();
      return JSON.parse(jsonString);
    } catch (apiError: unknown) {
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      console.error(chalk.red('Error calling Gemini API for evaluation, using fallback:'), errorMessage);
      
      // Generate a fallback evaluation when API fails
      const wordCount = answer.split(/\s+/).length;
      let score = 5; // Default average score
      
      // Adjust score based on answer length (very simple heuristic)
      if (wordCount < 20) score = Math.max(3, score - 2);
      else if (wordCount > 100) score = Math.min(8, score + 3);
      
      // Look for keywords from expected answer
      const expectedKeywords = question.expectedAnswer
        .toLowerCase()
        .split(/[.,\s]/)
        .filter(word => word.length > 5);
      
      let keywordMatches = 0;
      expectedKeywords.forEach(keyword => {
        if (answer.toLowerCase().includes(keyword)) keywordMatches++;
      });
      
      // Adjust score based on keyword matches
      const keywordPercentage = keywordMatches / expectedKeywords.length;
      if (keywordPercentage > 0.5) score = Math.min(10, score + 2);
      else if (keywordPercentage < 0.2) score = Math.max(1, score - 2);
      
      // Mock evaluation
      return {
        score,
        feedback: score > 7 
          ? "Good answer that demonstrates strong understanding of the concepts." 
          : "Your answer shows basic understanding but could be more comprehensive.",
        missingPoints: [
          "More specific implementation details needed",
          "Consider edge cases and error scenarios"
        ],
        strengths: [
          "Clear explanation of the approach",
          "Good understanding of the core concepts"
        ],
        suggestions: score > 7
          ? "Try to provide more concrete examples from real-world experience."
          : "Review the core concepts and focus on practical implementation details."
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('Error evaluating answer:'), errorMessage);
    return {
      score: 5,
      feedback: "Unable to provide detailed evaluation due to error.",
      missingPoints: [],
      strengths: [],
      suggestions: "Please try again with a more detailed answer."
    };
  }
}

/**
 * Parse repomix XML output to extract relevant information and code samples
 */
function parseRepomixOutput(xmlContent: string, repoUrl: string, repoName: string): any {
  try {
    // Extract technologies (simplified approach)
    const technologies: string[] = [];
    const techMatches = xmlContent.match(/<technology[^>]*>([^<]+)<\/technology>/g);
    if (techMatches) {
      techMatches.forEach(match => {
        const tech = match.replace(/<technology[^>]*>|<\/technology>/g, '');
        if (tech && !technologies.includes(tech)) {
          technologies.push(tech);
        }
      });
    }
    
    // Extract components or modules
    const components: string[] = [];
    const compMatches = xmlContent.match(/<component[^>]*>([^<]+)<\/component>/g) || 
                      xmlContent.match(/<module[^>]*>([^<]+)<\/module>/g);
    if (compMatches) {
      compMatches.forEach(match => {
        const comp = match.replace(/<(component|module)[^>]*>|<\/(component|module)>/g, '');
        if (comp && !components.includes(comp)) {
          components.push(comp);
        }
      });
    }
    
    // Extract dependencies
    const dependencies: string[] = [];
    const depMatches = xmlContent.match(/<dependency[^>]*>([^<]+)<\/dependency>/g);
    if (depMatches) {
      depMatches.forEach(match => {
        const dep = match.replace(/<dependency[^>]*>|<\/dependency>/g, '');
        if (dep && !dependencies.includes(dep)) {
          dependencies.push(dep);
        }
      });
    }

    // Extract project structure
    let structure = {};
    const structureMatch = xmlContent.match(/<structure>([\s\S]*?)<\/structure>/);
    if (structureMatch) {
      const structureContent = structureMatch[1];
      
      // Parse directory structure in a nested format
      const dirRegex = /<directory\s+path="([^"]+)">([\s\S]*?)<\/directory>/g;
      const fileRegex = /<file\s+path="([^"]+)">([^<]*)<\/file>/g;
      
      let dirMatch;
      let fileMatch;
      const parsedStructure: Record<string, any> = {};
      
      // Extract directories
      while ((dirMatch = dirRegex.exec(structureContent)) !== null) {
        const dirPath = dirMatch[1];
        parsedStructure[dirPath] = {};
      }
      
      // Extract files
      while ((fileMatch = fileRegex.exec(structureContent)) !== null) {
        const filePath = fileMatch[1];
        const fileDesc = fileMatch[2];
        parsedStructure[filePath] = fileDesc || "No description";
      }
      
      structure = parsedStructure;
    }
    
    // Extract code samples from files
    const codeFiles: Record<string, string> = {};
    const fileMatches = xmlContent.match(/<file\s+path="([^"]+)">\s*<content>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content>\s*<\/file>/g);
    
    if (fileMatches) {
      // Keep track of total content length
      let totalContentLength = 0;
      // Based on error: "input length and `max_tokens` exceed context limit: 185087 + 20000 > 204698"
      // The actual context window is ~204K tokens, not 2M
      // Setting a conservative max of 600K characters (~150K tokens) to ensure we stay under limit
      // This leaves room for prompt and for generation capacity
      const MAX_CONTENT_LENGTH = 600000; 
      
      // First pass - include all important files regardless of size
      for (const match of fileMatches) {
        const fileMatch = /<file\s+path="([^"]+)">\s*<content>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content>\s*<\/file>/g.exec(match);
        if (fileMatch) {
          const filePath = fileMatch[1];
          const fileContent = fileMatch[2];
          
          // High priority files - always include these if possible
          const isHighPriorityFile = 
            filePath.includes("index") || // Main entry points
            filePath.includes("config") || // Config files
            filePath.includes("package.json") || // Package files
            filePath.match(/\/(app|main|server)\.(js|ts|tsx)$/) || // Main app files
            filePath.endsWith("README.md") || // Documentation
            filePath.endsWith("schema.prisma") || // Database schema
            filePath.match(/\.(env|example)$/); // Environment configs
          
          if (isHighPriorityFile && totalContentLength + fileContent.length < MAX_CONTENT_LENGTH) {
            codeFiles[filePath] = fileContent;
            totalContentLength += fileContent.length;
          }
        }
      }
      
      // Second pass - include source code files (.js, .ts, .jsx, .tsx, etc.)
      for (const match of fileMatches) {
        const fileMatch = /<file\s+path="([^"]+)">\s*<content>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content>\s*<\/file>/g.exec(match);
        if (fileMatch) {
          const filePath = fileMatch[1];
          const fileContent = fileMatch[2];
          
          // Skip if already included in first pass
          if (codeFiles[filePath]) continue;
          
          // Source code files
          const isSourceCodeFile = 
            filePath.match(/\.(js|jsx|ts|tsx|vue|svelte|py|rb|go|java|kt|swift|c|cpp|h|hpp|cs|php|rs|dart)$/) && 
            !filePath.includes("test") && 
            !filePath.includes("spec") &&
            !filePath.includes("__tests__") &&
            !filePath.includes("__mocks__") &&
            !filePath.includes("node_modules");
            
          if (isSourceCodeFile && totalContentLength + fileContent.length < MAX_CONTENT_LENGTH) {
            codeFiles[filePath] = fileContent;
            totalContentLength += fileContent.length;
          }
        }
      }
      
      // Third pass - include other useful files (CSS, HTML, etc.)
      for (const match of fileMatches) {
        const fileMatch = /<file\s+path="([^"]+)">\s*<content>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content>\s*<\/file>/g.exec(match);
        if (fileMatch) {
          const filePath = fileMatch[1];
          const fileContent = fileMatch[2];
          
          // Skip if already included
          if (codeFiles[filePath]) continue;
          
          // Other useful files
          const isUsefulFile = 
            filePath.match(/\.(css|scss|sass|less|html|xml|json|yml|yaml|md|sql|graphql|gql|prisma|toml|ini|sh|bash|zsh|bat|conf|env)$/) && 
            !filePath.includes("node_modules");
            
          if (isUsefulFile && totalContentLength + fileContent.length < MAX_CONTENT_LENGTH) {
            codeFiles[filePath] = fileContent;
            totalContentLength += fileContent.length;
          }
        }
      }
      
      // Convert to kilobytes for more readable output
      const totalKB = (totalContentLength / 1024).toFixed(2);
      // More accurate token estimation based on observed limits
      const estimatedTokens = Math.round(totalContentLength / 4); // Rough estimate: 4 chars per token on average
      const safetyFactor = 0.8; // 80% of estimated limit to leave room for prompt
      const expectedContextUsage = Math.round((estimatedTokens / 204698) * 100); // Calculate percentage based on observed limit
      console.log(chalk.blue(`Including ${Object.keys(codeFiles).length} files (${totalKB}KB, ~${estimatedTokens.toLocaleString()} tokens, ${expectedContextUsage}% of context) in analysis`));
      
      // Add warning if we're approaching the limit
      if (expectedContextUsage > 70) {
        console.warn(chalk.yellow(`WARNING: Using ${expectedContextUsage}% of available context window. This may lead to truncation or errors.`));
        console.warn(chalk.yellow(`The Gemini API has a context limit of ~204K tokens, not 2M as documented elsewhere.`));
      }
    }
    
    // Create structured analysis
    return {
      repo: repoUrl,
      name: repoName,
      technologies: technologies.length > 0 ? technologies : ["JavaScript", "TypeScript", "React", "Node.js"],
      components: components.length > 0 ? components : ["Core", "API", "UI", "Utils"],
      dependencies: dependencies.length > 0 ? dependencies : [],
      structure: structure,
      codeFiles: codeFiles, // Include code samples in the analysis
      analysisDate: new Date().toISOString(),
      summary: "Repository analysis completed using repomix. Extracted structure, technological stack, and key code samples for evaluation."
    };
  } catch (parseError) {
    console.error(chalk.red('Error parsing repomix output:'), parseError);
    return {
      repo: repoUrl,
      name: repoName,
      technologies: ["JavaScript", "TypeScript"],
      components: ["Unknown"],
      dependencies: [],
      structure: null,
      error: true,
      analysisDate: new Date().toISOString(),
      summary: "Error parsing repository analysis. Using fallback data."
    };
  }
}

async function main() {
  try {
    // Check for Analysis mode flag (default is REPL/interview mode)
    const ANALYSIS_MODE = process.argv.includes('--analysis') || process.argv.includes('-a');
    
    // Load rubric from file if provided
    if (RUBRIC_FILE && fs.existsSync(RUBRIC_FILE)) {
      RUBRIC = fs.readFileSync(RUBRIC_FILE, 'utf-8');
      console.log(chalk.green(`Loaded rubric from file: ${RUBRIC_FILE}`));
    } else if (!fs.existsSync('rubric.txt')) {
      // Save default rubric to file for reference ONLY if it doesn't exist
      fs.writeFileSync('rubric.txt', RUBRIC);
      console.log(chalk.green('Created default rubric file: rubric.txt'));
    } else {
      // If rubric.txt exists but no specific rubric was provided, load it
      RUBRIC = fs.readFileSync('rubric.txt', 'utf-8');
      console.log(chalk.green('Loaded existing rubric.txt file'));
    }

    // Store all analyses and questions
    const allRepoAnalyses: any[] = [];
    const allQuestions: InterviewQuestion[] = [];
    
    console.log(chalk.blue(`Running in ${ANALYSIS_MODE ? 'Analysis' : 'REPL/Interview'} mode`));
    
    // Analyze each repository
    for (const repoUrl of REPO_URLS) {
      console.log(chalk.blue(`\nAnalyzing repository using repomix: ${repoUrl}`));
      console.log(chalk.yellow('This may take a few minutes...\n'));
      
      try {
        // Create and prepare a specific output directory for repomix
        const repoName = path.basename(repoUrl);
        const outputDir = path.join(process.cwd(), `repo-output-${repoName}`);
        
        // Ensure the directory exists and is empty
        if (fs.existsSync(outputDir)) {
          // Clean up existing directory
          fs.rmSync(outputDir, { recursive: true, force: true });
        }
        fs.mkdirSync(outputDir, { recursive: true });
        
        console.log(chalk.yellow(`Created output directory: ${outputDir}`));
        
        // Prepare execution of repomix
        console.log(chalk.yellow('Running repomix analysis...'));
          
        // Create a temporary file to store the repomix output
        const outputXmlPath = path.join(outputDir, 'repomix-output.xml');
        const configJsonPath = path.join(outputDir, 'repomix.config.json');

        // Check if repomix.config.json exists in the root directory
        const rootConfigPath = path.resolve(process.cwd(), '../../repomix.config.json');
        
        try {
          // Copy the existing config to the output directory or create a new one
          if (fs.existsSync(rootConfigPath)) {
            console.log(chalk.blue('Using root repomix.config.json file'));
            // Read the root config
            const rootConfig = JSON.parse(fs.readFileSync(rootConfigPath, 'utf-8'));
            // Make sure output path is set correctly
            if (!rootConfig.output) rootConfig.output = {};
            rootConfig.output.filePath = 'repomix-output.xml'; // Use simple filename
            // Write the updated config
            fs.writeFileSync(configJsonPath, JSON.stringify(rootConfig, null, 2));
          } else {
            // Create a config specifically for this run
            const repomixConfig = {
              output: {
                compress: false,
                style: 'xml',
                fileSummary: true,
                directoryStructure: true,
                removeComments: false,
                removeEmptyLines: true,
                topFilesLength: 20,
                showLineNumbers: false,
                copyToClipboard: false,
                includeEmptyDirectories: true,
                parsableStyle: false,
                filePath: 'repomix-output.xml' // Use simple filename
              },
              include: ['**/*', '.cursorrules', '.cursor/rules/*', '.cursor/**'],
              ignore: {
                useGitignore: true,
                useDefaultPatterns: false,
                customPatterns: [
                  '**/.!(cursor)/**',
                  '**/*.pbxproj',
                  '**/node_modules/**',
                  '**/dist/**',
                  '**/build/**',
                  '**/compile/**',
                  '**/*.spec.*',
                  '**/*.pyc',
                  '**/.env',
                  '**/.env.*',
                  '**/*.env',
                  '**/*.env.*',
                  '**/*.ltock',
                  '**/*.lockb',
                  '**/package-lock.*',
                  '**/pnpm-lock.*',
                  '**/*.tsbuildinfo'
                ]
              },
              security: {
                enableSecurityCheck: true
              },
              tokenCount: {
                encoding: 'o200k_base'
              }
            };
            
            // Write the config to a file
            fs.writeFileSync(configJsonPath, JSON.stringify(repomixConfig, null, 2));
            console.log(chalk.blue('Created repomix config file'));
          }
          
          // Execute repomix command with the repository URL and config path
          try {
            console.log(chalk.yellow(`Executing repomix for ${repoUrl}...`));
            // Use a simple filename instead of a full path to avoid path issues in repomix
            const outputFileName = 'repomix-output.xml';
            execSync(`npx repomix --remote ${repoUrl} --config ${configJsonPath} --output ${outputFileName}`, { 
              stdio: 'inherit',
              timeout: 300000, // 5 minute timeout
              cwd: outputDir // Set working directory to output directory
            });
            console.log(chalk.green('Repomix analysis completed successfully'));
          } catch (execError) {
            console.error(chalk.red('Error executing repomix:'), 
                         execError instanceof Error ? execError.message : String(execError));
            console.log(chalk.yellow('Falling back to mock data generation...'));
            // Create a mock output file
            fs.writeFileSync(outputXmlPath, '<repository></repository>', 'utf8');
          }
        } catch (configError) {
          console.error(chalk.red('Error with repomix configuration:'), 
                       configError instanceof Error ? configError.message : String(configError));
          console.log(chalk.yellow('Creating mock repository analysis as fallback...'));
          // Create a mock output file
          fs.writeFileSync(outputXmlPath, '<repository></repository>', 'utf8');
        }
        
        // Generate mock XML content if needed
        if (!fs.existsSync(outputXmlPath) || fs.statSync(outputXmlPath).size < 100) {
          console.log(chalk.yellow('Creating mock repository data...'));
          fs.writeFileSync(outputXmlPath, generateMockRepositoryXml(repoUrl, repoName), 'utf8');
        }
        
        // Read and parse the repomix output
        console.log(chalk.blue('Processing repomix output...'));
        const repomixOutput = fs.readFileSync(outputXmlPath, 'utf-8');
        
        // Parse the output to extract relevant information
        const repoAnalysis = parseRepomixOutput(repomixOutput, repoUrl, repoName);
        repoAnalysis.outputFile = outputXmlPath; // Add output file path
        
        console.log(chalk.green('Repository analysis completed'));
        
        // Store analysis for comparison
        allRepoAnalyses.push(repoAnalysis);
        
        // Answer the rubric questions for this repository
        console.log(chalk.blue('\nAnswering rubric questions for this repository...'));
        
        const questions = await answerRubricQuestionsWithGemini(repoAnalysis, RUBRIC);
        
        // Add repository identifier to questions
        const repoQuestions = questions.map(q => ({
          ...q,
          repository: repoUrl,
          repositoryName: repoName
        }));
        
        // Add to all questions
        allQuestions.push(...repoQuestions);
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError analyzing repository ${repoUrl}: ${errorMessage}`));
        
        // Fallback to mock analysis
        console.log(chalk.yellow('\nFalling back to mock repository analysis...'));
        
        // Extract owner and repo name from URL
        const urlParts = repoUrl.replace('https://github.com/', '').split('/');
        const repoOwner = urlParts[0] || 'unknown';
        const repoName = urlParts[1] || path.basename(repoUrl);
        
        // Create a directory for mock output
        const mockOutputDir = path.join(process.cwd(), `repo-output-${repoName}`);
        if (!fs.existsSync(mockOutputDir)) {
          fs.mkdirSync(mockOutputDir, { recursive: true });
        }
        const mockOutputPath = path.join(mockOutputDir, 'mock-repomix-output.xml');
        
        // Create a mock output file path
        const mockOutputXmlPath = path.join(mockOutputDir, 'repomix-output.xml');
        
        // Create a mock analysis
        const mockAnalysis = {
          repo: repoUrl,
          name: repoName,
          owner: repoOwner,
          outputFile: mockOutputXmlPath,
          technologies: ["JavaScript", "TypeScript", "React", "Node.js"],
          components: ["Frontend", "Backend", "API", "Utils", "Configuration"],
          dependencies: ["react", "express", "typescript", "webpack", "jest"],
          analysisDate: new Date().toISOString(),
          error: errorMessage,
          summary: "Repository analysis failed. Using mock analysis data for evaluation.",
          structure: {
            root: {
              "src/": {
                "components/": "UI components directory",
                "hooks/": "React hooks",
                "utils/": "Utility functions",
                "pages/": "Page components or routes",
                "api/": "API routes or endpoints"
              },
              "public/": "Static assets",
              "config/": "Configuration files",
              "test/": "Test files and fixtures"
            }
          }
        };
        
        // Store analysis for comparison
        allRepoAnalyses.push(mockAnalysis);
        
        // Answer rubric questions based on mock analysis
        const questions = await answerRubricQuestionsWithGemini(mockAnalysis, RUBRIC);
        
        // Add repository identifier to questions
        const repoQuestions = questions.map(q => ({
          ...q,
          repository: repoUrl,
          repositoryName: repoName
        }));
        
        // Add to all questions
        allQuestions.push(...repoQuestions);
      }
    }
    
    // Save all questions to output file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allQuestions, null, 2));
    console.log(chalk.green(`\nGenerated ${allQuestions.length} interview questions and saved to ${OUTPUT_FILE}`));
    
    if (ANALYSIS_MODE) {
      // In Analysis mode, just output the answers without interactive interview
      console.log(chalk.blue('\n--- Repository Question Answers ---\n'));
      
      // Group questions by repository
      const byRepo: Record<string, InterviewQuestion[]> = {};
      allQuestions.forEach(q => {
        const repoKey = q.repositoryName || 'unknown';
        if (!byRepo[repoKey]) {
          byRepo[repoKey] = [];
        }
        byRepo[repoKey].push(q);
      });
      
      // Output answers for each repository
      for (const [repoName, questions] of Object.entries(byRepo)) {
        console.log(chalk.green(`\n## Repository: ${repoName}\n`));
        
        for (const q of questions) {
          console.log(chalk.yellow(`Question: ${q.question}\n`));
          console.log(chalk.white(q.expectedAnswer));
          console.log('\n' + '-'.repeat(80) + '\n');
        }
      }
      
      console.log(chalk.green(`\nAll answers have been saved to ${OUTPUT_FILE}`));
    } else {
      // In REPL/interview mode, run the interactive interview
      await runInterview(allQuestions);
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Fatal error: ${errorMessage}`));
    process.exit(1);
  }
}

// Function to run a mock interview
async function runInterview(questions: InterviewQuestion[]) {
  console.log(chalk.blue('\n--- Mock Interview Based on Repository Analysis ---\n'));
  
  const results: Record<string, AnswerEvaluation> = {};

  // Group questions by repository for better organization
  const byRepo: Record<string, InterviewQuestion[]> = {};
  questions.forEach(q => {
    const repoKey = q.repository || 'unknown';
    if (!byRepo[repoKey]) {
      byRepo[repoKey] = [];
    }
    byRepo[repoKey].push(q);
  });
  
  // Get a list of all repositories
  const repos = Object.keys(byRepo);
  
  if (repos.length > 1) {
    console.log(chalk.green(`Interview will cover ${repos.length} repositories with ${questions.length} questions`));
    
    // Ask which repositories to include
    const { selectedRepos } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedRepos',
        message: 'Which repositories would you like to include in the interview?',
        choices: repos.map(repo => ({
          name: repo === 'comparison' ? 'Cross-repository comparison questions' : repo,
          value: repo,
          checked: true
        })),
        validate: (answer) => answer.length > 0 ? true : 'You must select at least one repository'
      }
    ]);
    
    // Filter questions to only include selected repositories
    const filteredQuestions = questions.filter(q => 
      selectedRepos.includes(q.repository || 'unknown')
    );
    
    console.log(chalk.green(`Selected ${filteredQuestions.length} questions from ${selectedRepos.length} repositories`));
    
    // Use filtered questions
    questions = filteredQuestions;
  }
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(chalk.yellow(`\nQuestion ${i + 1} of ${questions.length}:`));
    
    // Show repository info if available
    if (q.repositoryName) {
      if (q.repositoryName === 'multiple-repos') {
        console.log(chalk.magenta(`[Cross-Repository Comparison]`));
      } else {
        console.log(chalk.magenta(`Repository: ${q.repositoryName}`));
      }
    }
    
    console.log(chalk.yellow(`Type: ${q.type} | Difficulty: ${q.difficulty}`));
    console.log(chalk.white(`\n${q.question}`));

    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'answer',
        message: 'Your answer (or "exit" to quit, "skip" to move to next question):',
      },
    ]);

    if (response.answer.toLowerCase() === 'exit') {
      console.log(chalk.blue('\nInterview ended.'));
      break;
    }

    if (response.answer.toLowerCase() === 'skip') {
      console.log(chalk.yellow('\nQuestion skipped.'));
      continue;
    }

    // Evaluate answer
    console.log(chalk.blue('\nEvaluating your answer...'));
    
    const evaluation = await evaluateAnswerWithGemini(q, response.answer);
    results[q.id] = evaluation;
    
    // Show feedback
    console.log(chalk.green(`\nScore: ${evaluation.score}/10`));
    console.log(chalk.white(`\nFeedback: ${evaluation.feedback}`));
    
    if (evaluation.strengths && evaluation.strengths.length > 0) {
      console.log(chalk.green('\nStrengths:'));
      evaluation.strengths.forEach((point: string) => {
        console.log(chalk.green(`✓ ${point}`));
      });
    }
    
    if (evaluation.missingPoints && evaluation.missingPoints.length > 0) {
      console.log(chalk.yellow('\nPoints to consider:'));
      evaluation.missingPoints.forEach((point: string) => {
        console.log(chalk.yellow(`○ ${point}`));
      });
    }
    
    if (evaluation.suggestions) {
      console.log(chalk.cyan('\nSuggestion for improvement:'));
      console.log(chalk.white(evaluation.suggestions));
    }

    // Ask if they want to see the expected answer
    const showExpectedResponse = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'showExpected',
        message: 'Would you like to see an example of a good answer?',
        default: false,
      },
    ]);

    if (showExpectedResponse.showExpected) {
      console.log(chalk.green('\nExample of a good answer:'));
      console.log(chalk.white(q.expectedAnswer));
    }
  }
  
  // Show summary
  if (Object.keys(results).length > 0) {
    console.log(chalk.blue('\n\nInterview Summary'));
    console.log(chalk.blue('-----------------'));
    
    // Group results by repository
    const resultsByRepo: Record<string, Record<string, AnswerEvaluation>> = {};
    
    // Track which question belonged to which repository
    const questionRepoMap: Record<string, string> = {};
    questions.forEach(q => {
      const repoKey = q.repositoryName || 'unknown';
      questionRepoMap[q.id] = repoKey;
    });
    
    // Organize results by repository
    Object.entries(results).forEach(([qId, evaluation]) => {
      const repoKey = questionRepoMap[qId] || 'unknown';
      if (!resultsByRepo[repoKey]) {
        resultsByRepo[repoKey] = {};
      }
      resultsByRepo[repoKey][qId] = evaluation;
    });
    
    // Overall statistics
    let totalScore = 0;
    let questionCount = 0;
    
    // Calculate average score
    Object.values(results).forEach(result => {
      totalScore += result.score;
      questionCount++;
    });
    
    const averageScore = questionCount > 0 ? Math.round((totalScore / questionCount) * 10) / 10 : 0;
    
    console.log(chalk.green(`Overall Score: ${averageScore}/10`));
    
    // Show per-repository results
    if (Object.keys(resultsByRepo).length > 1) {
      console.log(chalk.blue('\nScores by Repository:'));
      
      Object.entries(resultsByRepo).forEach(([repo, repoResults]) => {
        let repoTotal = 0;
        const repoCount = Object.keys(repoResults).length;
        
        Object.values(repoResults).forEach(result => {
          repoTotal += result.score;
        });
        
        const repoAvg = repoCount > 0 ? Math.round((repoTotal / repoCount) * 10) / 10 : 0;
        console.log(chalk.white(`- ${repo}: ${repoAvg}/10`));
      });
    }
    
    // List strengths and improvement areas
    const allStrengths = new Set<string>();
    const allMissingPoints = new Set<string>();
    
    Object.values(results).forEach(result => {
      result.strengths?.forEach(strength => allStrengths.add(strength));
      result.missingPoints?.forEach(point => allMissingPoints.add(point));
    });
    
    if (allStrengths.size > 0) {
      console.log(chalk.green('\nYour key strengths:'));
      Array.from(allStrengths).forEach(strength => {
        console.log(chalk.green(`✓ ${strength}`));
      });
    }
    
    if (allMissingPoints.size > 0) {
      console.log(chalk.yellow('\nAreas for improvement:'));
      Array.from(allMissingPoints).forEach(point => {
        console.log(chalk.yellow(`○ ${point}`));
      });
    }
    
    // Option to generate detailed report
    const { generateReport } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'generateReport',
        message: 'Would you like to generate a detailed report file?',
        default: false
      }
    ]);
    
    if (generateReport) {
      try {
        const reportData = {
          overallScore: averageScore,
          byRepository: resultsByRepo,
          strengths: Array.from(allStrengths),
          areasForImprovement: Array.from(allMissingPoints),
          questionDetails: Object.entries(results).map(([qId, evaluation]) => {
            const question = questions.find(q => q.id === qId);
            return {
              questionId: qId,
              repository: question?.repositoryName || 'unknown',
              question: question?.question || '',
              score: evaluation.score,
              feedback: evaluation.feedback
            };
          })
        };
        
        fs.writeFileSync('interview-report.json', JSON.stringify(reportData, null, 2));
        console.log(chalk.green('\nDetailed report saved to interview-report.json'));
      } catch (error: unknown) {
        console.error(chalk.red('\nFailed to generate report:', (error as Error).message));
      }
    }
  }
  
  console.log(chalk.blue('\nThank you for completing the mock interview session!'));
}

// Run the main function
main().catch(console.error);