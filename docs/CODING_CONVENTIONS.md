# Coding Conventions

## File Naming Rules
* `routes/orders.js`: Singular noun, lowercase, .js
* `services/cashfree.js`: Service wrappers, lowercase
* `jobs/autoCancel.js`: camelCase verb phrase
* `HomeScreen.tsx`: PascalCase + Screen suffix

## Patterns
* **Route Handlers**: authenticate -> roleGuard -> validate -> service -> respond
* **Database**: Never query DB in route handlers, use services.
* **Error Handling**: Use AppError and catch blocks.
