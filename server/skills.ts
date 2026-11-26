// Keyword dictionary used both to pull skills out of a resume and to find them in job postings.
// Each entry is a display name plus the spellings that count as that skill. Matching is
// case-insensitive and bounded so "Java" never matches inside "JavaScript".

interface SkillDef {
  name: string;
  aliases?: string[];
  kind?: "skill" | "role";
}

const DEFS: SkillDef[] = [
  // Languages
  { name: "JavaScript", aliases: ["javascript", "js", "es6", "ecmascript"] },
  { name: "TypeScript", aliases: ["typescript", "ts"] },
  { name: "Python" },
  { name: "Java" },
  { name: "Kotlin" },
  { name: "Swift" },
  { name: "Objective-C", aliases: ["objective-c", "objective c"] },
  { name: "C#", aliases: ["c#", "csharp", "c sharp"] },
  { name: "C++", aliases: ["c++", "cpp"] },
  { name: "Go", aliases: ["golang", "go lang"] },
  { name: "Rust" },
  { name: "PHP" },
  { name: "Ruby" },
  { name: "Scala" },
  { name: "Elixir" },
  { name: "Dart" },
  { name: "Lua" },
  { name: "GDScript" },
  { name: "SQL" },
  { name: "HTML", aliases: ["html", "html5"] },
  { name: "CSS", aliases: ["css", "css3"] },
  { name: "Sass", aliases: ["sass", "scss"] },
  { name: "Bash", aliases: ["bash", "shell scripting"] },
  { name: "PowerShell" },

  // Front end
  { name: "React", aliases: ["react", "react.js", "reactjs"] },
  { name: "React Native", aliases: ["react native", "react-native"] },
  { name: "Next.js", aliases: ["next.js", "nextjs"] },
  { name: "Remix" },
  { name: "React Router", aliases: ["react router", "react-router"] },
  { name: "Redux" },
  { name: "Vue", aliases: ["vue", "vue.js", "vuejs"] },
  { name: "Nuxt", aliases: ["nuxt", "nuxt.js"] },
  { name: "Angular" },
  { name: "Svelte", aliases: ["svelte", "sveltekit"] },
  { name: "jQuery" },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
  { name: "Bootstrap" },
  { name: "Vite" },
  { name: "Webpack" },

  // Back end
  { name: "Node.js", aliases: ["node.js", "nodejs", "node"] },
  { name: "Express", aliases: ["express.js", "expressjs"] },
  { name: "NestJS", aliases: ["nestjs", "nest.js"] },
  { name: "Laravel" },
  { name: "Symfony" },
  { name: "CodeIgniter" },
  { name: "WordPress", aliases: ["wordpress", "wp"] },
  { name: "Django" },
  { name: "Flask" },
  { name: "FastAPI" },
  { name: "Spring Boot", aliases: ["spring boot", "springboot", "spring framework"] },
  { name: ".NET", aliases: [".net", "dotnet", "asp.net", ".net core"] },
  { name: "Ruby on Rails", aliases: ["rails", "ruby on rails"] },
  { name: "GraphQL" },
  { name: "REST APIs", aliases: ["restful", "rest api", "rest apis", "rest-api"] }, // bare "rest" is an English word
  { name: "gRPC" },
  { name: "Microservices", aliases: ["microservices", "microservice"] },

  // Mobile and games
  { name: "Flutter" },
  { name: "Android" },
  { name: "iOS", aliases: ["ios"] },
  { name: "Expo" },
  { name: "Unity" },
  { name: "Unreal Engine", aliases: ["unreal", "unreal engine"] },
  { name: "Godot" },

  // Data stores
  { name: "MySQL" },
  { name: "PostgreSQL", aliases: ["postgresql", "postgres"] },
  { name: "MongoDB", aliases: ["mongodb", "mongo"] },
  { name: "Redis" },
  { name: "SQLite" },
  { name: "SQL Server", aliases: ["sql server", "mssql"] },
  { name: "Oracle" },
  { name: "Elasticsearch" },
  { name: "Firebase" },
  { name: "Supabase" },
  { name: "Appwrite" },
  { name: "DynamoDB" },

  // Cloud and DevOps
  { name: "AWS", aliases: ["aws", "amazon web services"] },
  { name: "Azure" },
  { name: "Google Cloud", aliases: ["gcp", "google cloud"] },
  { name: "Docker" },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { name: "Terraform" },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "continuous integration"] },
  { name: "GitHub Actions", aliases: ["github actions"] },
  { name: "Jenkins" },
  { name: "Git" },
  { name: "Linux" },
  { name: "Nginx" },
  { name: "Netlify" },
  { name: "Vercel" },

  // Testing and quality
  { name: "Jest" },
  { name: "Vitest" },
  { name: "Cypress" },
  { name: "Playwright" },
  { name: "Selenium" },
  { name: "PHPUnit" },
  { name: "Unit testing", aliases: ["unit testing", "unit tests", "tdd"] },

  // Data and AI
  { name: "Pandas" },
  { name: "NumPy" },
  { name: "TensorFlow" },
  { name: "PyTorch" },
  { name: "Machine Learning", aliases: ["machine learning", "ml"] },
  { name: "Power BI", aliases: ["power bi", "powerbi"] },
  { name: "Tableau" },
  // Bare "excel" would match "you excel at..." in half the postings.
  { name: "Excel", aliases: ["microsoft excel", "ms excel", "advanced excel", "excel spreadsheets"] },

  // Design and product
  { name: "Figma" },
  { name: "Adobe XD", aliases: ["adobe xd"] },
  { name: "Photoshop" },
  { name: "UI/UX", aliases: ["ui/ux", "ux/ui", "ux design", "ui design", "user experience"] },
  { name: "Accessibility", aliases: ["accessibility", "a11y", "wcag"] },
  { name: "SEO" },
  { name: "Agile", aliases: ["agile", "scrum", "kanban"] },
  { name: "Jira" },
  { name: "Salesforce" },
  { name: "Shopify" },

  // Roles: matched against job titles with extra weight
  { name: "Frontend", kind: "role", aliases: ["frontend", "front-end", "front end"] },
  { name: "Backend", kind: "role", aliases: ["backend", "back-end", "back end"] },
  { name: "Full Stack", kind: "role", aliases: ["full stack", "full-stack", "fullstack"] },
  { name: "Mobile", kind: "role", aliases: ["mobile developer", "mobile engineer", "mobile app"] },
  { name: "DevOps", kind: "role", aliases: ["devops", "sre", "site reliability", "platform engineer"] },
  { name: "Data", kind: "role", aliases: ["data engineer", "data analyst", "data scientist"] },
  { name: "QA", kind: "role", aliases: ["qa", "quality assurance", "test engineer", "sdet"] },
  { name: "Designer", kind: "role", aliases: ["designer", "product design"] },
  { name: "Software Engineer", kind: "role", aliases: ["software engineer", "software developer", "web developer", "developer"] },
  { name: "Game Developer", kind: "role", aliases: ["game developer", "game programmer", "gameplay"] },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Letters/digits plus the symbols that are part of names (C#, C++, .NET, Node.js) are "inside a word".
const pattern = (aliases: string[]) =>
  new RegExp(`(?<![\\w#+.])(?:${aliases.map(escape).join("|")})(?![\\w#+])`, "i");

export interface CompiledSkill {
  name: string;
  kind: "skill" | "role";
  re: RegExp;
}

export const SKILLS: CompiledSkill[] = DEFS.map((d) => ({
  name: d.name,
  kind: d.kind ?? "skill",
  re: pattern(d.aliases ?? [d.name.toLowerCase()]),
}));

const byName = new Map(SKILLS.map((s) => [s.name.toLowerCase(), s]));

/** Look up a dictionary skill, or build a literal matcher for a skill the user typed in. */
export function matcherFor(name: string): RegExp {
  return byName.get(name.toLowerCase())?.re ?? pattern([name.trim()]);
}

export const skillNames = () => SKILLS.filter((s) => s.kind === "skill").map((s) => s.name);
export const roleNames = () => SKILLS.filter((s) => s.kind === "role").map((s) => s.name);

/** Skills and roles mentioned in a block of text, most-mentioned first. */
export function detect(text: string) {
  const found = (kind: "skill" | "role") =>
    SKILLS.filter((s) => s.kind === kind)
      .map((s) => ({ name: s.name, hits: text.match(new RegExp(s.re.source, "gi"))?.length ?? 0 }))
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .map((s) => s.name);
  // "Developer" alone is too generic to report when a specific role was found.
  const roles = found("role");
  return {
    skills: found("skill"),
    roles: roles.length > 1 ? roles.filter((r) => r !== "Software Engineer") : roles,
  };
}
