export const facts = [
  {
    category: 'languages',
    facts: [
      {
        term: 'Closure',
        definition: 'A function that has access to variables in its outer scope...',
        difficulty: 'intermediate',
        tags: ['javascript', 'scope', 'functions'],
        examples: [
          {
            code: `function outer() {
  let x = 10;
  return function inner() {
    return x;
  }
}`,
            explanation: 'The inner function maintains access to x even after outer returns'
          }
        ],
        relatedConcepts: ['Scope', 'Lexical Environment']
      },
      // ... more language facts
    ]
  },
  {
    category: 'dsa',
    facts: [
      // Data structures and algorithms facts
    ]
  },
  // ... other categories
]

export default facts 